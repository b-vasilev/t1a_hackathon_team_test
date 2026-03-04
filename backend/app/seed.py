from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Service


def _favicon(domain: str) -> str:
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=64"


POPULAR_SERVICES = [
    {
        "name": "Google",
        "website_url": "https://www.google.com",
        "privacy_policy_url": "https://policies.google.com/privacy",
        "icon": _favicon("google.com"),
    },
    {
        "name": "YouTube",
        "website_url": "https://www.youtube.com",
        "privacy_policy_url": "https://policies.google.com/privacy",
        "icon": _favicon("youtube.com"),
    },
    {
        "name": "Facebook",
        "website_url": "https://www.facebook.com",
        "privacy_policy_url": "https://www.facebook.com/privacy/policy/",
        "icon": _favicon("facebook.com"),
    },
    {
        "name": "Instagram",
        "website_url": "https://www.instagram.com",
        "privacy_policy_url": "https://privacycenter.instagram.com/policy/",
        "icon": _favicon("instagram.com"),
    },
    {
        "name": "WhatsApp",
        "website_url": "https://www.whatsapp.com",
        "privacy_policy_url": "https://www.whatsapp.com/legal/privacy-policy/",
        "icon": _favicon("whatsapp.com"),
    },
    {
        "name": "TikTok",
        "website_url": "https://www.tiktok.com",
        "privacy_policy_url": "https://www.tiktok.com/legal/page/us/privacy-policy/en",
        "icon": _favicon("tiktok.com"),
    },
    {
        "name": "Reddit",
        "website_url": "https://www.reddit.com",
        "privacy_policy_url": "https://www.reddit.com/policies/privacy-policy",
        "icon": _favicon("reddit.com"),
    },
    {
        "name": "Amazon",
        "website_url": "https://www.amazon.com",
        "privacy_policy_url": "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ",
        "icon": _favicon("amazon.com"),
    },
    {
        "name": "Wikipedia",
        "website_url": "https://www.wikipedia.org",
        "privacy_policy_url": "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy",
        "icon": _favicon("wikipedia.org"),
    },
]


async def seed_popular_services(db: AsyncSession) -> None:
    result = await db.execute(select(Service).where(Service.is_popular == True).limit(1))
    existing = result.scalar_one_or_none()
    if existing:
        return

    for svc in POPULAR_SERVICES:
        service = Service(
            name=svc["name"],
            website_url=svc["website_url"],
            privacy_policy_url=svc["privacy_policy_url"],
            is_popular=True,
            icon=svc["icon"],
        )
        db.add(service)

    await db.commit()
