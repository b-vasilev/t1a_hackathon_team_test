import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Service

logger = logging.getLogger("policylens.seed")


def _favicon(domain: str) -> str:
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=64"


POPULAR_SERVICES = [
    # ── Search & Productivity ──────────────────────────────────────────────────
    {
        "name": "Google",
        "website_url": "https://www.google.com",
        "privacy_policy_url": "https://policies.google.com/privacy",
        "icon": _favicon("google.com"),
        "category": "Productivity",
    },
    {
        "name": "Wikipedia",
        "website_url": "https://www.wikipedia.org",
        "privacy_policy_url": "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy",
        "icon": _favicon("wikipedia.org"),
        "category": "Productivity",
    },
    {
        "name": "Dropbox",
        "website_url": "https://www.dropbox.com",
        "privacy_policy_url": "https://www.dropbox.com/privacy",
        "icon": _favicon("dropbox.com"),
        "category": "Productivity",
    },
    # ── Social ────────────────────────────────────────────────────────────────
    {
        "name": "Facebook",
        "website_url": "https://www.facebook.com",
        "privacy_policy_url": "https://www.facebook.com/privacy/policy/",
        "icon": _favicon("facebook.com"),
        "category": "Social",
    },
    {
        "name": "Instagram",
        "website_url": "https://www.instagram.com",
        "privacy_policy_url": "https://privacycenter.instagram.com/policy/",
        "icon": _favicon("instagram.com"),
        "category": "Social",
    },
    {
        "name": "TikTok",
        "website_url": "https://www.tiktok.com",
        "privacy_policy_url": "https://www.tiktok.com/legal/page/us/privacy-policy/en",
        "icon": _favicon("tiktok.com"),
        "category": "Social",
    },
    {
        "name": "X (Twitter)",
        "website_url": "https://www.x.com",
        "privacy_policy_url": "https://x.com/en/privacy",
        "icon": _favicon("x.com"),
        "category": "Social",
    },
    {
        "name": "Reddit",
        "website_url": "https://www.reddit.com",
        "privacy_policy_url": "https://www.reddit.com/policies/privacy-policy",
        "icon": _favicon("reddit.com"),
        "category": "Social",
    },
    {
        "name": "LinkedIn",
        "website_url": "https://www.linkedin.com",
        "privacy_policy_url": "https://www.linkedin.com/legal/privacy-policy",
        "icon": _favicon("linkedin.com"),
        "category": "Social",
    },
    {
        "name": "Snapchat",
        "website_url": "https://www.snapchat.com",
        "privacy_policy_url": "https://snap.com/en-US/privacy/privacy-policy",
        "icon": _favicon("snapchat.com"),
        "category": "Social",
    },
    {
        "name": "Discord",
        "website_url": "https://discord.com",
        "privacy_policy_url": "https://discord.com/privacy",
        "icon": _favicon("discord.com"),
        "category": "Social",
    },
    # ── Messaging ─────────────────────────────────────────────────────────────
    {
        "name": "WhatsApp",
        "website_url": "https://www.whatsapp.com",
        "privacy_policy_url": "https://www.whatsapp.com/legal/privacy-policy/",
        "icon": _favicon("whatsapp.com"),
        "category": "Messaging",
    },
    {
        "name": "Telegram",
        "website_url": "https://telegram.org",
        "privacy_policy_url": "https://telegram.org/privacy",
        "icon": _favicon("telegram.org"),
        "category": "Messaging",
    },
    {
        "name": "Zoom",
        "website_url": "https://zoom.us",
        "privacy_policy_url": "https://www.zoom.com/en/trust/privacy/privacy-statement/",
        "icon": _favicon("zoom.us"),
        "category": "Messaging",
    },
    # ── Streaming ─────────────────────────────────────────────────────────────
    {
        "name": "YouTube",
        "website_url": "https://www.youtube.com",
        "privacy_policy_url": "https://policies.google.com/privacy",
        "icon": _favicon("youtube.com"),
        "category": "Streaming",
    },
    {
        "name": "Netflix",
        "website_url": "https://www.netflix.com",
        "privacy_policy_url": "https://help.netflix.com/legal/privacy",
        "icon": _favicon("netflix.com"),
        "category": "Streaming",
    },
    {
        "name": "Spotify",
        "website_url": "https://www.spotify.com",
        "privacy_policy_url": "https://www.spotify.com/us/legal/privacy-policy/",
        "icon": _favicon("spotify.com"),
        "category": "Streaming",
    },
    {
        "name": "Twitch",
        "website_url": "https://www.twitch.tv",
        "privacy_policy_url": "https://www.twitch.tv/p/en/legal/privacy-notice/",
        "icon": _favicon("twitch.tv"),
        "category": "Streaming",
    },
    {
        "name": "Disney+",
        "website_url": "https://www.disneyplus.com",
        "privacy_policy_url": "https://www.disneyplus.com/legal/privacy-policy",
        "icon": _favicon("disneyplus.com"),
        "category": "Streaming",
    },
    {
        "name": "Max (HBO)",
        "website_url": "https://www.max.com",
        "privacy_policy_url": "https://www.warnermediaprivacy.com/policycenter/b2c/WM/",
        "icon": _favicon("max.com"),
        "category": "Streaming",
    },
    {
        "name": "Apple",
        "website_url": "https://www.apple.com",
        "privacy_policy_url": "https://www.apple.com/legal/privacy/",
        "icon": _favicon("apple.com"),
        "category": "Streaming",
    },
    {
        "name": "Crave",
        "website_url": "https://www.crave.ca",
        "privacy_policy_url": "https://www.crave.ca/en/privacy-policy",
        "icon": _favicon("crave.ca"),
        "category": "Streaming",
    },
    # ── Shopping & Finance ────────────────────────────────────────────────────
    {
        "name": "Amazon",
        "website_url": "https://www.amazon.com",
        "privacy_policy_url": "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ",
        "icon": _favicon("amazon.com"),
        "category": "Shopping & Finance",
    },
    {
        "name": "PayPal",
        "website_url": "https://www.paypal.com",
        "privacy_policy_url": "https://www.paypal.com/us/legalhub/privacy-full",
        "icon": _favicon("paypal.com"),
        "category": "Shopping & Finance",
    },
    {
        "name": "Uber",
        "website_url": "https://www.uber.com",
        "privacy_policy_url": "https://www.uber.com/global/en/privacy/notice/",
        "icon": _favicon("uber.com"),
        "category": "Shopping & Finance",
    },
    {
        "name": "Airbnb",
        "website_url": "https://www.airbnb.com",
        "privacy_policy_url": "https://www.airbnb.com/help/article/2855",
        "icon": _favicon("airbnb.com"),
        "category": "Shopping & Finance",
    },
]


async def seed_popular_services(db: AsyncSession) -> None:
    result = await db.execute(select(Service).where(Service.is_popular).limit(1))
    existing = result.scalar_one_or_none()
    if existing:
        logger.info("Popular services already seeded, skipping")
        return

    logger.info("Seeding %d popular services", len(POPULAR_SERVICES))
    for svc in POPULAR_SERVICES:
        service = Service(
            name=svc["name"],
            website_url=svc["website_url"],
            privacy_policy_url=svc["privacy_policy_url"],
            is_popular=True,
            icon=svc["icon"],
            category=svc.get("category"),
        )
        db.add(service)

    await db.commit()
