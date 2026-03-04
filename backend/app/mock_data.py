"""Pre-built mock analysis results used when the LLM API is unreachable."""


def _categories(dc: str, ds: str, dr: str, tr: str, ur: str, findings: dict) -> dict:
    keys = ["data_collection", "data_sharing", "data_retention", "tracking", "user_rights"]
    grades = [dc, ds, dr, tr, ur]
    return {k: {"grade": g, "finding": findings.get(k, "Not assessed")} for k, g in zip(keys, grades)}


MOCK_ANALYSES: dict[str, dict] = {
    "google": {
        "summary": "Extensive data collection across services, but offers strong user controls and transparency tools.",
        "red_flags": [
            "Collects data across all Google services and third-party sites",
            "Retains some data indefinitely even after account deletion",
            "Combines data from multiple sources to build detailed profiles",
        ],
        "warnings": [
            "Shares data with wide range of third-party partners",
            "Default settings favor data collection over privacy",
            "Location tracking persists even when paused in some cases",
        ],
        "positives": [
            "Google Takeout allows full data export",
            "Granular privacy dashboard with activity controls",
            "Auto-delete options for activity data (3/18/36 months)",
        ],
        "categories": _categories(
            "D+",
            "C-",
            "D",
            "D+",
            "B",
            {
                "data_collection": "Collects search, location, device info, voice, and browsing across ecosystem",
                "data_sharing": "Shares with advertisers, partners; does not sell data directly",
                "data_retention": "Some data kept indefinitely; auto-delete available but not default",
                "tracking": "Extensive cross-site tracking via ads, analytics, and sign-in",
                "user_rights": "Strong tools: Takeout, activity controls, ad personalization toggle",
            },
        ),
        "highlights": [
            "Extensive data collection across services, but offers strong user controls",
            "Google Dashboard provides visibility into stored data",
            "Cross-service data combination creates comprehensive user profiles",
            "Auto-delete options exist but must be manually enabled",
            "Privacy policy is long but relatively transparent",
        ],
        "actions": [
            {
                "label": "Manage your data & privacy",
                "url": "https://myaccount.google.com/data-and-privacy",
                "category": "privacy_settings",
            },
            {"label": "Download your data", "url": "https://takeout.google.com", "category": "data_access"},
            {
                "label": "Delete your account",
                "url": "https://myaccount.google.com/delete-services-or-account",
                "category": "deletion",
            },
        ],
    },
    "youtube": {
        "summary": "Shares Google's broad data collection; watch history and recommendations drive profiling.",
        "red_flags": [
            "Watch history used for extensive behavioral profiling",
            "Shares data with Google's entire advertising network",
            "Comments and interactions publicly visible by default",
        ],
        "warnings": [
            "Autoplay and recommendations optimize for engagement, not privacy",
            "Children's data collection practices under regulatory scrutiny",
            "Third-party embeds allow tracking across the web",
        ],
        "positives": [
            "Can pause and delete watch/search history",
            "Incognito mode available for private browsing",
            "Restricted mode helps filter content",
        ],
        "categories": _categories(
            "D+",
            "C-",
            "D",
            "D",
            "B-",
            {
                "data_collection": "Collects watch history, search queries, comments, device data",
                "data_sharing": "Data shared across Google services and ad partners",
                "data_retention": "Watch history kept until manually deleted or auto-delete enabled",
                "tracking": "Embedded player tracks across sites; recommendations profile interests",
                "user_rights": "History controls and pause/delete available via Google account",
            },
        ),
        "highlights": [
            "Shares Google's broad data collection practices",
            "Watch history and engagement data drive ad targeting",
            "Can pause and manage history through Google account",
            "Embedded player enables cross-site tracking",
            "Subject to Google's overall privacy policy",
        ],
        "actions": [
            {
                "label": "Manage watch history",
                "url": "https://www.youtube.com/feed/history",
                "category": "privacy_settings",
            },
            {"label": "Download your data", "url": "https://takeout.google.com", "category": "data_access"},
            {
                "label": "Ad personalization settings",
                "url": "https://myaccount.google.com/data-and-privacy",
                "category": "opt_out",
            },
        ],
    },
    "facebook": {
        "summary": (
            "Pervasive data collection and third-party sharing; major privacy concerns despite recent improvements."
        ),
        "red_flags": [
            "Tracks users across the web via Meta Pixel and social plugins",
            "History of data breaches and regulatory enforcement actions",
            "Shares data extensively with advertisers and business partners",
        ],
        "warnings": [
            "Complex privacy settings spread across multiple menus",
            "Default settings are permissive on data sharing",
            "Facial recognition data collected in some regions",
        ],
        "positives": [
            "Download Your Information tool available",
            "Off-Facebook Activity tool shows third-party tracking",
            "Privacy Checkup wizard guides through settings",
        ],
        "categories": _categories(
            "D",
            "F",
            "D-",
            "D-",
            "C",
            {
                "data_collection": "Collects posts, messages, contacts, location, device data, and biometrics",
                "data_sharing": "Extensive sharing with advertisers, developers, and business partners",
                "data_retention": "Data retained even after deletion for extended periods",
                "tracking": "Meta Pixel, social plugins, and login tracking across millions of sites",
                "user_rights": "Tools exist but are complex; account deletion has 30-day waiting period",
            },
        ),
        "highlights": [
            "Pervasive tracking across the web via Meta Pixel",
            "Complex privacy settings make it hard to opt out",
            "Off-Facebook Activity tool provides some transparency",
            "Multiple regulatory fines for privacy violations",
            "Default sharing settings are highly permissive",
        ],
        "actions": [
            {
                "label": "Privacy Checkup",
                "url": "https://www.facebook.com/privacy/checkup/",
                "category": "privacy_settings",
            },
            {"label": "Download your information", "url": "https://www.facebook.com/dyi/", "category": "data_access"},
            {
                "label": "Delete your account",
                "url": "https://www.facebook.com/help/delete_account",
                "category": "deletion",
            },
        ],
    },
    "instagram": {
        "summary": "Meta-owned platform inherits Facebook's tracking; visual data adds unique privacy concerns.",
        "red_flags": [
            "Shares data with Meta's entire advertising ecosystem",
            "Collects metadata from photos including location and device info",
            "In-app browser tracks activity on external links",
        ],
        "warnings": [
            "Public accounts expose content to data scrapers",
            "DM encryption not enabled by default",
            "Algorithmic feed requires extensive behavioral data",
        ],
        "positives": [
            "Account privacy toggle (public/private) available",
            "Download Your Data feature available",
            "Activity status can be turned off",
        ],
        "categories": _categories(
            "D",
            "D-",
            "D",
            "D",
            "C+",
            {
                "data_collection": "Photos, messages, location, contacts, browsing within the app",
                "data_sharing": "Shared across Meta platforms and with advertising partners",
                "data_retention": "Deleted content may persist on servers for extended periods",
                "tracking": "In-app browser injects tracking; shares Meta Pixel infrastructure",
                "user_rights": "Data download available; account deletion through settings",
            },
        ),
        "highlights": [
            "Shares Meta's extensive data collection framework",
            "Photo metadata including location is collected",
            "In-app browser enables additional tracking",
            "Data shared across Facebook, WhatsApp, and ad partners",
            "Private account option limits public exposure",
        ],
        "actions": [
            {
                "label": "Privacy settings",
                "url": "https://www.instagram.com/accounts/privacy_and_security/",
                "category": "privacy_settings",
            },
            {
                "label": "Download your data",
                "url": "https://www.instagram.com/download/request/",
                "category": "data_access",
            },
            {
                "label": "Delete your account",
                "url": "https://www.instagram.com/accounts/remove/request/permanent/",
                "category": "deletion",
            },
        ],
    },
    "whatsapp": {
        "summary": "End-to-end encrypted messages, but metadata sharing with Meta raises significant concerns.",
        "red_flags": [
            "Shares metadata (contacts, usage patterns) with Meta",
            "Collects extensive metadata despite message encryption",
            "Mandatory data sharing with Facebook for non-EU users",
        ],
        "warnings": [
            "Cloud backups may not be encrypted by default",
            "Contact list uploaded to WhatsApp servers",
            "Business accounts have different data-sharing rules",
        ],
        "positives": [
            "End-to-end encryption for messages by default",
            "Disappearing messages feature available",
            "Two-step verification supported",
        ],
        "categories": _categories(
            "C",
            "D+",
            "C-",
            "C+",
            "C",
            {
                "data_collection": "Contacts, usage patterns, device info; message content encrypted",
                "data_sharing": "Metadata shared with Meta; content not shared due to encryption",
                "data_retention": "Messages stored until delivered; metadata retained longer",
                "tracking": "Less cross-site tracking than Facebook; usage patterns still monitored",
                "user_rights": "Account deletion available; data export limited to chat history",
            },
        ),
        "highlights": [
            "End-to-end encryption protects message content",
            "Metadata sharing with Meta remains a key concern",
            "Contact list is uploaded and stored on servers",
            "Disappearing messages add extra privacy layer",
            "Business interactions have different privacy rules",
        ],
        "actions": [
            {"label": "Privacy settings", "url": "https://www.whatsapp.com/privacy", "category": "privacy_settings"},
            {"label": "Request account info", "url": "https://www.whatsapp.com/contact", "category": "data_access"},
            {"label": "Delete your account", "url": "https://www.whatsapp.com/contact", "category": "deletion"},
        ],
    },
    "tiktok": {
        "summary": (
            "Aggressive data collection including biometrics; opaque data practices raise national security concerns."
        ),
        "red_flags": [
            "Collects biometric data (faceprints, voiceprints) from content",
            "Keystroke patterns and clipboard content monitored",
            "Data access concerns due to jurisdiction and governance",
        ],
        "warnings": [
            "Algorithm requires extensive behavioral profiling to function",
            "In-app browser can track all browsing activity",
            "Children's privacy protections questioned by regulators",
        ],
        "positives": [
            "Privacy settings allow restricting who can interact",
            "Can download a copy of your data",
            "Screen time management tools available",
        ],
        "categories": _categories(
            "F",
            "D-",
            "D-",
            "F",
            "D+",
            {
                "data_collection": "Biometrics, keystrokes, clipboard, location, device IDs, browsing",
                "data_sharing": "Shares with affiliates and business partners; jurisdiction concerns",
                "data_retention": "Retention periods vaguely defined; data kept for 'as long as necessary'",
                "tracking": "In-app browser tracking; extensive device fingerprinting; behavioral profiling",
                "user_rights": "Data download available but limited; deletion process exists",
            },
        ),
        "highlights": [
            "Biometric data collection from user-created content",
            "In-app browser enables extensive tracking",
            "Keystroke and clipboard monitoring documented",
            "Algorithm requires deep behavioral profiling",
            "Subject to ongoing regulatory scrutiny worldwide",
        ],
        "actions": [
            {
                "label": "Privacy settings",
                "url": "https://www.tiktok.com/setting/privacy",
                "category": "privacy_settings",
            },
            {
                "label": "Download your data",
                "url": "https://www.tiktok.com/setting/download-your-data",
                "category": "data_access",
            },
            {
                "label": "Delete your account",
                "url": "https://www.tiktok.com/setting/deactivate",
                "category": "deletion",
            },
        ],
    },
    "reddit": {
        "summary": (
            "Growing advertising focus increases data collection; pseudonymous by design offers some protection."
        ),
        "red_flags": [
            "Increasing ad targeting based on subreddit activity and interests",
            "Post and comment history is public and permanent by default",
            "Third-party tracking expanding with advertising growth",
        ],
        "warnings": [
            "IP addresses and device info logged for all users",
            "Data shared with advertising partners for targeting",
            "Old posts remain searchable even after account deletion",
        ],
        "positives": [
            "Pseudonymous accounts — no real name required",
            "Can request full data export (GDPR/CCPA)",
            "Opt-out of ad personalization available in settings",
        ],
        "categories": _categories(
            "C",
            "C-",
            "C-",
            "C",
            "B-",
            {
                "data_collection": "Posts, votes, browsing, IP address, device info; no real name required",
                "data_sharing": "Growing ad partnerships; data shared for targeting and analytics",
                "data_retention": "Posts persist indefinitely; account data kept per retention schedule",
                "tracking": "On-platform tracking for ads; less cross-site than Meta",
                "user_rights": "Data export and account deletion available; ad opt-out in settings",
            },
        ),
        "highlights": [
            "Pseudonymous accounts provide baseline privacy",
            "Growing ad business increases data collection pressure",
            "Public post history creates permanent record",
            "Data export available for GDPR/CCPA requests",
            "Ad personalization can be turned off in settings",
        ],
        "actions": [
            {
                "label": "Privacy settings",
                "url": "https://www.reddit.com/settings/privacy",
                "category": "privacy_settings",
            },
            {
                "label": "Request your data",
                "url": "https://www.reddit.com/settings/data-request",
                "category": "data_access",
            },
            {"label": "Delete your account", "url": "https://www.reddit.com/settings/", "category": "deletion"},
        ],
    },
    "amazon": {
        "summary": "Massive data collection across shopping, Alexa, and cloud services; detailed purchase profiling.",
        "red_flags": [
            "Purchase history combined with browsing for detailed consumer profiles",
            "Alexa voice recordings stored and reviewed by humans",
            "Ring/security camera data accessible to law enforcement in some cases",
        ],
        "warnings": [
            "Data shared across Amazon subsidiaries (Twitch, Ring, Alexa)",
            "Third-party sellers receive customer data for order fulfillment",
            "Advertising ID tracks browsing across Amazon properties",
        ],
        "positives": [
            "Request Your Data feature available",
            "Alexa voice history can be reviewed and deleted",
            "Advertising preferences can be adjusted",
        ],
        "categories": _categories(
            "D",
            "D+",
            "D",
            "C-",
            "C",
            {
                "data_collection": "Purchase history, browsing, voice (Alexa), device data, payment info",
                "data_sharing": "Shared with subsidiaries, sellers, and ad partners",
                "data_retention": "Purchase history retained indefinitely; some data has deletion options",
                "tracking": "Cross-property tracking via Amazon ad network; less web-wide than Google",
                "user_rights": "Data request tool exists; account closure available but complex",
            },
        ),
        "highlights": [
            "Extensive purchase and browsing history profiling",
            "Alexa voice data raises unique privacy concerns",
            "Data shared across growing ecosystem of subsidiaries",
            "Request Your Data provides some transparency",
            "Complex account with many separate privacy settings",
        ],
        "actions": [
            {
                "label": "Manage your data",
                "url": "https://www.amazon.com/hz/privacy-central",
                "category": "privacy_settings",
            },
            {
                "label": "Request your data",
                "url": "https://www.amazon.com/gp/privacycentral/dsar/preview.html",
                "category": "data_access",
            },
            {
                "label": "Close your account",
                "url": "https://www.amazon.com/privacy/data-deletion",
                "category": "deletion",
            },
        ],
    },
    "wikipedia": {
        "summary": "Minimal data collection as a non-profit; one of the most privacy-respecting major sites.",
        "red_flags": [
            "IP addresses logged for anonymous editors",
        ],
        "warnings": [
            "Edit history is permanently public and cannot be deleted",
            "Some third-party analytics tools used for site performance",
        ],
        "positives": [
            "No advertising or ad tracking",
            "No account required for reading or basic editing",
            "Transparent data practices published by non-profit foundation",
        ],
        "categories": _categories(
            "A",
            "A",
            "B+",
            "A",
            "A-",
            {
                "data_collection": "Minimal: IP addresses, user agent, edit history for editors",
                "data_sharing": "No commercial sharing; may share with law enforcement if legally required",
                "data_retention": "Edit history permanent by design; access logs rotated regularly",
                "tracking": "No ad tracking; minimal analytics for site performance",
                "user_rights": "Account optional; limited deletion due to open-edit model",
            },
        ),
        "highlights": [
            "Non-profit model means no ad-driven data collection",
            "No account required for reading content",
            "One of the most privacy-respecting major websites",
            "Edit history is public and permanent by design",
            "Transparent practices from Wikimedia Foundation",
        ],
        "actions": [
            {
                "label": "Privacy policy",
                "url": "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy",
                "category": "privacy_settings",
            },
            {
                "label": "Data retention guidelines",
                "url": "https://foundation.wikimedia.org/wiki/Data_Retention_Guidelines",
                "category": "legal_rights",
            },
        ],
    },
}

# Generic fallback for services not in the map
GENERIC_MOCK = {
    "summary": "Analysis unavailable — showing example results. This service has not been pre-analyzed.",
    "red_flags": [
        "Unable to assess data collection practices (AI unavailable)",
    ],
    "warnings": [
        "This is example data — real analysis requires AI service",
    ],
    "positives": [
        "Check back later for a full AI-powered privacy analysis",
    ],
    "categories": _categories(
        "C",
        "C",
        "C",
        "C",
        "C",
        {
            "data_collection": "Unable to assess — AI analysis unavailable",
            "data_sharing": "Unable to assess — AI analysis unavailable",
            "data_retention": "Unable to assess — AI analysis unavailable",
            "tracking": "Unable to assess — AI analysis unavailable",
            "user_rights": "Unable to assess — AI analysis unavailable",
        },
    ),
    "highlights": [
        "AI analysis temporarily unavailable",
        "Showing placeholder results for demonstration",
    ],
    "actions": [],
}


def get_mock_analysis(service_name: str) -> dict:
    """Return mock analysis for a service, with mock flag set."""
    key = service_name.lower().strip()
    data = MOCK_ANALYSES.get(key, GENERIC_MOCK)
    from .analyzer import average_grade

    category_grades = [v["grade"] for v in data["categories"].values()]
    result = {
        "grade": average_grade(category_grades),
        "summary": data["summary"],
        "red_flags": data["red_flags"],
        "warnings": data["warnings"],
        "positives": data["positives"],
        "categories": data["categories"],
        "highlights": data["highlights"],
        "mock": True,
    }
    return result


def get_mock_actions(service_name: str) -> list[dict]:
    """Return mock actions for a service."""
    key = service_name.lower().strip()
    data = MOCK_ANALYSES.get(key, GENERIC_MOCK)
    return data.get("actions", [])
