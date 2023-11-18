from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models.models import Base

DATABASE_URL = "postgresql+psycopg2://postgres:your_password@localhost:5433/surfing_data"

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