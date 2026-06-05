import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PillSafe API starting — initialising database")
    await init_db()
    logger.info("Database ready (SQLite, code-first)")
    yield
    logger.info("PillSafe API shutting down")
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="PillSafe API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.OPENAPI_ENABLED else None,
        redoc_url="/redoc" if settings.OPENAPI_ENABLED else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()
