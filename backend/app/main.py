import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.redis import close_redis, get_redis

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PillSafe API starting up", extra={"version": settings.APP_VERSION})
    await get_redis()
    yield
    logger.info("PillSafe API shutting down")
    await close_redis()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="PillSafe API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.OPENAPI_ENABLED else None,
        redoc_url="/redoc" if settings.OPENAPI_ENABLED else None,
        openapi_url="/openapi.json" if settings.OPENAPI_ENABLED else None,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        return response

    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, Any]:
        db_status = "ok"
        redis_status = "ok"
        try:
            async with engine.connect() as conn:
                await conn.execute(__import__("sqlalchemy", fromlist=["text"]).text("SELECT 1"))
        except Exception as exc:
            logger.error("DB health check failed: %s", exc)
            db_status = "error"
        try:
            r = await get_redis()
            await r.ping()
        except Exception as exc:
            logger.error("Redis health check failed: %s", exc)
            redis_status = "error"

        overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
        return {
            "status": overall,
            "version": settings.APP_VERSION,
            "db_status": db_status,
            "redis_status": redis_status,
        }

    return app


app = create_app()
