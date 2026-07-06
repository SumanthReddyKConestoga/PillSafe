from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

_connect_args = {"check_same_thread": False} if _is_sqlite else {}

# SQLite has no real connection pool (one file, no concurrent-writer benefit
# from pooling), so pool sizing only applies to Postgres in production, where
# it directly determines how many requests can hit the DB at once under load.
_pool_kwargs = (
    {}
    if _is_sqlite
    else {
        "pool_size": 20,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    }
)

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    echo=settings.APP_ENV == "development",
    **_pool_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def _add_missing_columns(conn) -> None:
    """Additive, code-first column sync for SQLite dev DBs.

    `create_all` only creates missing tables — it never alters existing
    ones. New nullable/defaulted columns added to a model after the table
    already exists on disk need an explicit ALTER TABLE here.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    column_defs = {
        "patients": [
            ("notifications_enabled", "BOOLEAN NOT NULL DEFAULT 1"),
        ],
        "prescriptions": [
            ("frequency_type", "VARCHAR(30)"),
            ("with_food", "BOOLEAN NOT NULL DEFAULT 0"),
            ("purpose", "VARCHAR(100)"),
            ("max_daily_dose", "INTEGER"),
        ],
    }
    for table, columns in column_defs.items():
        result = await conn.exec_driver_sql(f"PRAGMA table_info({table})")
        existing = {row[1] for row in result.fetchall()}
        for name, ddl_type in columns:
            if name not in existing:
                await conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}")


async def init_db() -> None:
    """Create all tables from models (code-first, run on startup)."""
    import app.models.user  # noqa: F401
    import app.models.patient  # noqa: F401
    import app.models.analysis  # noqa: F401
    import app.models.prescription  # noqa: F401
    import app.models.din_pill  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _add_missing_columns(conn)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
