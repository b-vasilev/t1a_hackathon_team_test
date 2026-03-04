import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .analyzer import (
    LLM_MODEL,
    LLMUnavailableError,
    analyze_policy,
    average_grade,
    chat_about_policy,
    find_privacy_policy_url,
    find_relevant_sections,
    get_or_create_policy_text,
    get_service_actions,
)
from .database import Base, SessionLocal, engine, get_db
from .logging_config import setup_logging
from .models import PolicyAnalysis, PolicyText, Service
from .seed import seed_popular_services

POLICY_CACHE_TTL_DAYS = int(os.getenv("POLICY_CACHE_TTL_DAYS", "7"))
RATE_LIMIT = os.getenv("RATE_LIMIT", "60/minute")

setup_logging()
logger = logging.getLogger("policylens.main")

limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT])


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
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


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
                "category": svc.category,
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


# ── Cache ────────────────────────────────────────────────────────────────────


@app.delete("/api/services/{service_id}/cache")
async def clear_service_cache(service_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(delete(PolicyAnalysis).where(PolicyAnalysis.service_id == service_id))
    await db.commit()
    logger.info("Cleared cache for service %d (%d rows)", service_id, result.rowcount)
    return {"cleared": True}


@app.delete("/api/cache")
async def clear_all_cache(db: AsyncSession = Depends(get_db)):
    result = await db.execute(delete(PolicyAnalysis))
    await db.commit()
    logger.info("Cleared all cache (%d rows)", result.rowcount)
    return {"cleared": result.rowcount}


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

            # TTL check: treat expired cache as miss
            if cached:
                # Handle both naive and aware datetimes from SQLite
                now = datetime.now(timezone.utc)
                cached_at = cached.analyzed_at
                if cached_at.tzinfo is None:
                    cached_at = cached_at.replace(tzinfo=timezone.utc)
                age_days = (now - cached_at).days
                if age_days < POLICY_CACHE_TTL_DAYS:
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
                        "actions": json.loads(cached.actions) if cached.actions else [],
                        "cached": True,
                    }
                logger.info("Cache expired for %s (age=%d days, ttl=%d)", svc_name, age_days, POLICY_CACHE_TTL_DAYS)

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
                    "actions": [],
                    "cached": False,
                }

            try:
                analysis_data, actions_data = await asyncio.gather(
                    get_or_start_analysis(privacy_policy_url, service_name=svc_name),
                    get_service_actions(svc_name, svc_website_url, policy_url=privacy_policy_url),
                )
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
                    "actions": [],
                    "cached": False,
                }

            # Deduplicate policy text via hash
            policy_text_id = None
            raw_text = analysis_data.get("policy_text")
            if raw_text:
                pt = await get_or_create_policy_text(
                    session,
                    source_url=privacy_policy_url,
                    text=raw_text,
                    was_truncated=analysis_data.get("was_truncated", False),
                )
                policy_text_id = pt.id

            # Persist analysis
            analysis = PolicyAnalysis(
                service_id=svc_id,
                grade=analysis_data["grade"],
                summary=analysis_data["summary"],
                red_flags=json.dumps(analysis_data["red_flags"]),
                warnings=json.dumps(analysis_data["warnings"]),
                positives=json.dumps(analysis_data.get("positives", [])),
                categories=json.dumps(analysis_data.get("categories", {})),
                highlights=json.dumps(analysis_data.get("highlights", [])),
                actions=json.dumps(actions_data),
                policy_text_id=policy_text_id,
                policy_text=raw_text,
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
                "actions": actions_data,
                "cached": False,
                "mock": analysis_data.get("mock", False),
            }

    # Deduplicate LLM analysis: services sharing a policy URL reuse the same result
    analysis_futures: dict[str, asyncio.Task] = {}

    async def get_or_start_analysis(policy_url: str, service_name: str):
        if policy_url not in analysis_futures:
            analysis_futures[policy_url] = asyncio.create_task(analyze_policy(policy_url, service_name=service_name))
        return await analysis_futures[policy_url]

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


# ── Chat ─────────────────────────────────────────────────────────────────────


MAX_CHAT_MESSAGE_LENGTH = 2000
MAX_CHAT_TURNS = 20


class ChatMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return v

    @field_validator("content")
    @classmethod
    def content_must_be_reasonable(cls, v: str, info) -> str:
        # Only limit user messages; assistant messages from conversation history can be longer
        if info.data.get("role") == "user" and len(v) > MAX_CHAT_MESSAGE_LENGTH:
            raise ValueError(f"Message too long (max {MAX_CHAT_MESSAGE_LENGTH} characters)")
        return v


class ChatRequest(BaseModel):
    service_id: int
    messages: list[ChatMessage]


@app.post("/api/chat")
async def chat_with_policy(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    # Validate messages
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages must not be empty")
    if len(req.messages) > MAX_CHAT_TURNS:
        raise HTTPException(status_code=400, detail=f"Too many messages (max {MAX_CHAT_TURNS})")
    if req.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="Last message must have role 'user'")

    # Load service
    svc_result = await db.execute(select(Service).where(Service.id == req.service_id))
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Load latest analysis
    analysis_result = await db.execute(
        select(PolicyAnalysis)
        .where(PolicyAnalysis.service_id == req.service_id)
        .order_by(PolicyAnalysis.analyzed_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="No analysis found for this service. Please analyze the service first.",
        )

    # Load policy text: prefer PolicyText table, fall back to legacy column
    policy_text_content = None
    sections = []
    was_truncated = False
    if analysis.policy_text_id:
        pt_result = await db.execute(select(PolicyText).where(PolicyText.id == analysis.policy_text_id))
        pt = pt_result.scalar_one_or_none()
        if pt:
            policy_text_content = pt.content
            was_truncated = pt.was_truncated
            if pt.sections_json:
                sections = json.loads(pt.sections_json)
    if not policy_text_content and analysis.policy_text:
        policy_text_content = analysis.policy_text

    if not policy_text_content:
        raise HTTPException(
            status_code=404,
            detail="No policy text found for this service. Please analyze the service first.",
        )

    # Use section-scoped context if sections available
    last_question = req.messages[-1].content
    if sections:
        context = find_relevant_sections(last_question, sections, policy_text_content, max_chars=15000)
    else:
        context = policy_text_content[:50000]

    if was_truncated:
        context += "\n\n[Note: This policy text was truncated due to length. Some sections may be missing.]"

    # Build messages list for LLM
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    # Build analysis context for the chat
    analysis_context = {
        "summary": analysis.summary,
        "red_flags": json.loads(analysis.red_flags) if analysis.red_flags else [],
        "warnings": json.loads(analysis.warnings) if analysis.warnings else [],
        "positives": json.loads(analysis.positives) if analysis.positives else [],
        "categories": json.loads(analysis.categories) if analysis.categories else {},
        "highlights": json.loads(analysis.highlights) if analysis.highlights else [],
        "actions": json.loads(analysis.actions) if analysis.actions else [],
    }

    try:
        answer = await chat_about_policy(
            service_name=service.name,
            grade=analysis.grade,
            policy_text=context,
            messages=messages,
            analysis_context=analysis_context,
        )
    except LLMUnavailableError:
        raise HTTPException(status_code=503, detail="LLM service is temporarily unavailable")

    return {"answer": answer, "service_id": req.service_id}


# ── Policy Text ──────────────────────────────────────────────────────────────


@app.get("/api/services/{service_id}/policy-text")
async def get_policy_text(
    service_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return the stored policy text with sections and findings for the viewer modal."""
    # Load service
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Load latest analysis
    analysis_result = await db.execute(
        select(PolicyAnalysis)
        .where(PolicyAnalysis.service_id == service_id)
        .order_by(PolicyAnalysis.analyzed_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this service")

    # Load policy text
    content = None
    sections = []
    was_truncated = False
    fetched_at = None
    source_url = None

    if analysis.policy_text_id:
        pt_result = await db.execute(select(PolicyText).where(PolicyText.id == analysis.policy_text_id))
        pt = pt_result.scalar_one_or_none()
        if pt:
            content = pt.content
            was_truncated = pt.was_truncated
            fetched_at = pt.fetched_at.isoformat() if pt.fetched_at else None
            source_url = pt.source_url
            if pt.sections_json:
                sections = json.loads(pt.sections_json)

    if not content and analysis.policy_text:
        content = analysis.policy_text

    if not content:
        raise HTTPException(status_code=404, detail="No policy text available")

    return {
        "content": content,
        "sections": sections,
        "was_truncated": was_truncated,
        "fetched_at": fetched_at,
        "source_url": source_url or service.privacy_policy_url,
        "red_flags": json.loads(analysis.red_flags),
        "warnings": json.loads(analysis.warnings),
        "positives": json.loads(analysis.positives),
        "grade": analysis.grade,
        "service_name": service.name,
    }
