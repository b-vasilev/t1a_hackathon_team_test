import logging
import os
import sys


def setup_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger("policylens")
    root_logger.setLevel(getattr(logging, level, logging.INFO))
    root_logger.addHandler(handler)
    root_logger.propagate = False

    # Suppress noisy third-party loggers
    for name in ("httpx", "httpcore", "litellm", "openai", "sqlalchemy.engine"):
        logging.getLogger(name).setLevel(logging.WARNING)
