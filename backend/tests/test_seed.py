import pytest
from sqlalchemy import select

from app.models import Service
from app.seed import seed_popular_services


@pytest.mark.asyncio
class TestSeedPopularServices:
    async def test_seeds_services(self, db_session):
        await seed_popular_services(db_session)
        result = await db_session.execute(select(Service).where(Service.is_popular))
        services = result.scalars().all()
        assert len(services) == 9

    async def test_idempotent(self, db_session):
        await seed_popular_services(db_session)
        await seed_popular_services(db_session)
        result = await db_session.execute(select(Service).where(Service.is_popular))
        services = result.scalars().all()
        assert len(services) == 9

    async def test_service_fields(self, db_session):
        await seed_popular_services(db_session)
        result = await db_session.execute(select(Service).where(Service.name == "Google"))
        google = result.scalar_one()
        assert google.website_url == "https://www.google.com"
        assert google.privacy_policy_url == "https://policies.google.com/privacy"
        assert google.is_popular is True
        assert google.icon is not None
