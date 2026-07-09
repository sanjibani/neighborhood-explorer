"""
Structured JSON logging via structlog.

Why structured logs?
- Each log line is a JSON object with key-value pairs.
- Production log aggregators (Sentry, Datadog, Render logs) parse them directly.
- Easy to filter, search, alert on specific fields.
- Request IDs let you trace a single request across the stack.

This is the observability backbone. Phase 7 wires Sentry on top.
"""
import logging
import os
import sys

import structlog


def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level, logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level, logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None):
    return structlog.get_logger(name)