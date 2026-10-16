import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

load_dotenv()

DATABASE = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE)

LocalSession = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db():
    db = LocalSession()
    try:
        yield db
    finally:
        await db.close()
