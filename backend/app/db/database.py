from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models.models import Base

DATABASE_URL = "postgresql+asyncpg://postgres:your_password@localhost:5433/surfing_data"

async_engine = create_async_engine(DATABASE_URL, echo=True)

# create a configured "Session" class
AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
