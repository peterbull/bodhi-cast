from app.core.config import get_app_settings
from app.data.spots.spots import spots
from app.models.models import Base, Spots
from sqlalchemy import create_engine, exists
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

DATABASE_URL = get_app_settings().database_conn_string
print(f"DATABASE_URL: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    Base.metadata.create_all(bind=engine)


def add_spots():
    db = SessionLocal()
    try:
        for spot in spots:
            if not db.query(exists().where(Spots.spot_name == spot["spot_name"])).scalar():
                db_spot = Spots(**spot)
                db.add(db_spot)
        db.commit()
    except SQLAlchemyError as e:
        print(f"An error occurred while adding spots to the database: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
