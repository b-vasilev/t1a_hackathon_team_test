import json
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AuthenticationError as AnthropicAuthError, APIError as AnthropicAPIError

from .database import engine, get_db, Base
from .models import Service, PolicyAnalysis
from .seed import seed_popular_services
from .analyzer import analyze_policy, find_privacy_policy_url, average_grade

logger = logging.getLogger("policylens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as db:
        await seed_popular_services(db)

    yield


app = FastAPI(title="PolicyLens API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Services ─────────────────────────────────────────────────────────────────

@app.get("/api/services")
async def get_services(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Service).where(Service.is_popular == True).order_by(Service.id)
    )
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
        out.append({
            "id": svc.id,
            "name": svc.name,
            "website_url": svc.website_url,
            "privacy_policy_url": svc.privacy_policy_url,
            "icon": svc.icon,
            "has_analysis": analysis is not None,
        })
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
    result = await db.execute(
        select(Service).where(Service.website_url == url)
    )
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

    results = []
    tasks = []

    # Load all services first
    services_map: dict[int, Service] = {}
    for sid in req.service_ids:
        result = await db.execute(select(Service).where(Service.id == sid))
        svc = result.scalar_one_or_none()
        if svc:
            services_map[sid] = svc

    async def process_service(svc: Service):
        # Check cache
        cached_result = await db.execute(
            select(PolicyAnalysis)
            .where(PolicyAnalysis.service_id == svc.id)
            .order_by(PolicyAnalysis.analyzed_at.desc())
            .limit(1)
        )
        cached = cached_result.scalar_one_or_none()

        if cached:
            return {
                "service_id": svc.id,
                "name": svc.name,
                "icon": svc.icon,
                "grade": cached.grade,
                "summary": cached.summary,
                "red_flags": json.loads(cached.red_flags),
                "warnings": json.loads(cached.warnings),
                "clean_items": json.loads(cached.clean_items),
                "cached": True,
            }

        if not svc.privacy_policy_url:
            # Try to find it now
            found_url = await find_privacy_policy_url(svc.website_url)
            if found_url:
                svc.privacy_policy_url = found_url
                await db.commit()

        if not svc.privacy_policy_url:
            return {
                "service_id": svc.id,
                "name": svc.name,
                "icon": svc.icon,
                "grade": "N/A",
                "summary": "Could not locate a privacy policy for this service.",
                "red_flags": [],
                "warnings": [],
                "clean_items": [],
                "cached": False,
            }

        try:
            analysis_data = await analyze_policy(svc.privacy_policy_url)
        except AnthropicAuthError:
            raise HTTPException(
                status_code=500,
                detail="Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in .env.",
            )
        except AnthropicAPIError as e:
            logger.error("Anthropic API error for %s: %s", svc.name, e)
            return {
                "service_id": svc.id,
                "name": svc.name,
                "icon": svc.icon,
                "grade": "N/A",
                "summary": f"Analysis failed: {e}",
                "red_flags": [],
                "warnings": [],
                "clean_items": [],
                "cached": False,
            }

        # Persist
        analysis = PolicyAnalysis(
            service_id=svc.id,
            grade=analysis_data["grade"],
            summary=analysis_data["summary"],
            red_flags=json.dumps(analysis_data["red_flags"]),
            warnings=json.dumps(analysis_data["warnings"]),
            clean_items=json.dumps(analysis_data["clean_items"]),
        )
        db.add(analysis)
        await db.commit()

        return {
            "service_id": svc.id,
            "name": svc.name,
            "icon": svc.icon,
            "grade": analysis_data["grade"],
            "summary": analysis_data["summary"],
            "red_flags": analysis_data["red_flags"],
            "warnings": analysis_data["warnings"],
            "clean_items": analysis_data["clean_items"],
            "cached": False,
        }

    # Run analyses concurrently
    service_list = list(services_map.values())
    results = await asyncio.gather(*[process_service(svc) for svc in service_list])

    grades = [r["grade"] for r in results if r["grade"] not in ("N/A", None)]
    overall = average_grade(grades) if grades else "N/A"

    return {
        "overall_grade": overall,
        "results": list(results),
    }
