import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .analyzer import LLM_MODEL, analyze_policy, average_grade, find_privacy_policy_url
from .database import Base, SessionLocal, engine, get_db
from .logging_config import setup_logging
from .models import PolicyAnalysis, Service
from .seed import seed_popular_services

setup_logging()
logger = logging.getLogger("policylens.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.info("PolicyLens starting | model=%s | log_level=%s", LLM_MODEL, log_level)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as db:
        await seed_popular_services(db)

    yield

    logger.info("PolicyLens shutting down")


app = FastAPI(title="PolicyLens API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    if request.url.path != "/api/health":
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d (%.0fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


# ── Health ──────────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Services ─────────────────────────────────────────────────────────────────


@app.get("/api/services")
async def get_services(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).where(Service.is_popular).order_by(Service.id))
    services = result.scalars().all()

    out = []
    for svc in services:
        # Check if latest analysis exists
        analysis_result = await db.execute(
            select(PolicyAnalysis)
            .where(PolicyAnalysis.service_id == svc.id)
            .order_by(PolicyAnalysis.analyzed_at.desc())
            .limit(1)
        )
        analysis = analysis_result.scalar_one_or_none()
        out.append(
            {
                "id": svc.id,
                "name": svc.name,
                "website_url": svc.website_url,
                "privacy_policy_url": svc.privacy_policy_url,
                "icon": svc.icon,
                "has_analysis": analysis is not None,
            }
        )
    return out


class CustomServiceRequest(BaseModel):
    url: str


@app.post("/api/services/custom")
async def add_custom_service(
    req: CustomServiceRequest,
    db: AsyncSession = Depends(get_db),
):
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    # Check if already exists
    result = await db.execute(select(Service).where(Service.website_url == url))
    existing = result.scalar_one_or_none()
    if existing:
        return {
            "id": existing.id,
            "name": existing.name,
            "website_url": existing.website_url,
            "privacy_policy_url": existing.privacy_policy_url,
            "icon": existing.icon,
            "has_analysis": False,
        }

    logger.info("Adding custom service: %s", url)

    # Try to find privacy policy URL via Claude
    privacy_url = await find_privacy_policy_url(url)

    # Derive a name from the URL
    from urllib.parse import urlparse

    parsed = urlparse(url)
    name = parsed.netloc.replace("www.", "").split(".")[0].capitalize()

    service = Service(
        name=name,
        website_url=url,
        privacy_policy_url=privacy_url,
        is_popular=False,
        icon=f"https://www.google.com/s2/favicons?domain={parsed.netloc}&sz=64",
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)

    return {
        "id": service.id,
        "name": service.name,
        "website_url": service.website_url,
        "privacy_policy_url": service.privacy_policy_url,
        "icon": service.icon,
        "has_analysis": False,
    }


# ── Analyze ───────────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    service_ids: list[int]


@app.post("/api/analyze")
async def analyze_services(
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    if not req.service_ids:
        raise HTTPException(status_code=400, detail="No service IDs provided")

    logger.info("Analyzing %d service(s): %s", len(req.service_ids), req.service_ids)

    results = []

    # Load all services first
    services_map: dict[int, Service] = {}
    for sid in req.service_ids:
        result = await db.execute(select(Service).where(Service.id == sid))
        svc = result.scalar_one_or_none()
        if svc:
            services_map[sid] = svc

    async def process_service(
        svc_id: int, svc_name: str, svc_icon: str, svc_website_url: str, svc_privacy_policy_url: str | None
    ):
        # Each coroutine gets its own DB session to avoid concurrent access issues
        async with SessionLocal() as session:
            # Check cache
            cached_result = await session.execute(
                select(PolicyAnalysis)
                .where(PolicyAnalysis.service_id == svc_id)
                .order_by(PolicyAnalysis.analyzed_at.desc())
                .limit(1)
            )
            cached = cached_result.scalar_one_or_none()

            if cached:
                return {
                    "service_id": svc_id,
                    "name": svc_name,
                    "icon": svc_icon,
                    "grade": cached.grade,
                    "summary": cached.summary,
                    "red_flags": json.loads(cached.red_flags),
                    "warnings": json.loads(cached.warnings),
                    "positives": json.loads(cached.positives),
                    "categories": json.loads(cached.categories),
                    "highlights": json.loads(cached.highlights),
                    "cached": True,
                }

            privacy_policy_url = svc_privacy_policy_url
            if not privacy_policy_url:
                # Try to find it now
                found_url = await find_privacy_policy_url(svc_website_url)
                if found_url:
                    privacy_policy_url = found_url
                    svc_obj = await session.get(Service, svc_id)
                    if svc_obj:
                        svc_obj.privacy_policy_url = found_url
                        await session.commit()

            if not privacy_policy_url:
                return {
                    "service_id": svc_id,
                    "name": svc_name,
                    "icon": svc_icon,
                    "grade": "N/A",
                    "summary": "Could not locate a privacy policy for this service.",
                    "red_flags": [],
                    "warnings": [],
                    "positives": [],
                    "categories": {},
                    "highlights": [],
                    "cached": False,
                }

            try:
                analysis_data = await analyze_policy(privacy_policy_url)
            except Exception as e:
                logger.error("LLM API error for %s: %s", svc_name, e)
                return {
                    "service_id": svc_id,
                    "name": svc_name,
                    "icon": svc_icon,
                    "grade": "N/A",
                    "summary": f"LLM API error: {e}",
                    "red_flags": [],
                    "warnings": [],
                    "positives": [],
                    "categories": {},
                    "highlights": [],
                    "cached": False,
                }

            # Persist
            analysis = PolicyAnalysis(
                service_id=svc_id,
                grade=analysis_data["grade"],
                summary=analysis_data["summary"],
                red_flags=json.dumps(analysis_data["red_flags"]),
                warnings=json.dumps(analysis_data["warnings"]),
                positives=json.dumps(analysis_data.get("positives", [])),
                categories=json.dumps(analysis_data.get("categories", {})),
                highlights=json.dumps(analysis_data.get("highlights", [])),
            )
            session.add(analysis)
            await session.commit()

            return {
                "service_id": svc_id,
                "name": svc_name,
                "icon": svc_icon,
                "grade": analysis_data["grade"],
                "summary": analysis_data["summary"],
                "red_flags": analysis_data["red_flags"],
                "warnings": analysis_data["warnings"],
                "positives": analysis_data.get("positives", []),
                "categories": analysis_data.get("categories", {}),
                "highlights": analysis_data.get("highlights", []),
                "cached": False,
            }

    # Run analyses concurrently — pass scalar values so each coroutine can use its own session
    results = await asyncio.gather(
        *[
            process_service(svc.id, svc.name, svc.icon, svc.website_url, svc.privacy_policy_url)
            for svc in services_map.values()
        ]
    )

    grades = [r["grade"] for r in results if r["grade"] not in ("N/A", None)]
    overall = average_grade(grades) if grades else "N/A"

    return {
        "overall_grade": overall,
        "results": list(results),
    }
