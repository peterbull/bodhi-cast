from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.models import Base

DATABASE_URL = "postgresql+psycopg2://postgres:your_password@db:5432/surfing_data"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: 
        yield db
    except:
        db.close()