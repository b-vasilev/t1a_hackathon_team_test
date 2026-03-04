import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models import Service


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def seeded_db(db_session):
    """DB session with one popular service pre-inserted."""
    svc = Service(
        name="TestService",
        website_url="https://www.test.com",
        privacy_policy_url="https://www.test.com/privacy",
        is_popular=True,
        icon="https://www.google.com/s2/favicons?domain=test.com&sz=64",
    )
    db_session.add(svc)
    await db_session.commit()
    await db_session.refresh(svc)
    return db_session


@pytest_asyncio.fixture
async def client(engine):
    """httpx AsyncClient with in-memory DB override."""
    from unittest.mock import patch

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    # Seed a test service
    async with session_factory() as session:
        svc = Service(
            name="TestService",
            website_url="https://www.test.com",
            privacy_policy_url="https://www.test.com/privacy",
            is_popular=True,
            icon="https://www.google.com/s2/favicons?domain=test.com&sz=64",
        )
        session.add(svc)
        await session.commit()

    # Also patch SessionLocal in main module so process_service uses test DB
    with patch("app.main.SessionLocal", session_factory):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()
