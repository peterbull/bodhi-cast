import json
import os

import boto3
from app.core.config import get_app_settings
from app.data.spots.spots import spots as fallback_spots
from app.models.models import Base, Spots
from botocore.exceptions import ClientError, EndpointConnectionError, NoCredentialsError
from sqlalchemy import create_engine, event, exists, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

S3_AWS_ACCESS_KEY_ID = os.environ.get("S3_AWS_ACCESS_KEY_ID")
S3_AWS_SECRET_ACCESS_KEY = os.environ.get("S3_AWS_SECRET_ACCESS_KEY")
S3_REGION_NAME = os.environ.get("S3_REGION_NAME")
S3_BUCKET_SPOTS = os.environ.get("S3_BUCKET_SPOTS")

DATABASE_URL = get_app_settings().database_conn_string

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

s3_client = boto3.client(
    "s3",
    region_name=S3_REGION_NAME,
    aws_access_key_id=S3_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=S3_AWS_SECRET_ACCESS_KEY,
)


def create_tables():
    Base.metadata.create_all(bind=engine)


def try_fetch_spots_from_s3():
    try:
        s3_client = boto3.client(
            "s3",
            region_name=S3_REGION_NAME,
            aws_access_key_id=S3_AWS_ACCESS_KEY_ID,
            aws_secret_access_key=S3_AWS_SECRET_ACCESS_KEY,
        )
        response = s3_client.get_object(Bucket=S3_BUCKET_SPOTS, Key="spots.json")
        data = response["Body"].read().decode("utf-8")
        return True, json.loads(data)
    except (NoCredentialsError, ClientError, EndpointConnectionError) as e:
        print(f"Failed to fetch spots from S3 due to: {e}")
        return False, None


# This will first to try to add spots from the s3 bucket, if there aren't any s3 credentials,
# it will fallback to the spots.py file. This way access to the s3 bucket isn't necessary to build
def add_spots():
    with SessionLocal() as db:
        success, spots_data = try_fetch_spots_from_s3()

        if not success:
            print("Using fallback spots data.")
            spots_data = fallback_spots

        try:
            existing_spots = {spot.spot_name for spot in db.query(Spots.spot_name).all()}
            spots_to_add = [
                Spots(**spot) for spot in spots_data if spot["spot_name"] not in existing_spots
            ]

            if spots_to_add:
                db.bulk_save_objects(spots_to_add)
                db.commit()
        except SQLAlchemyError as e:
            print(f"An error occurred while adding spots to the database: {e}")
            db.rollback()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def after_create(target, connection, **kw):
    # Directly using the connection object provided by the event
    function_sql = text(
        """
        CREATE OR REPLACE FUNCTION update_location()
        RETURNS TRIGGER AS $$
        BEGIN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    trigger_sql = text(
        """
        CREATE TRIGGER update_location_trigger
        BEFORE INSERT ON public.spots
        FOR EACH ROW EXECUTE PROCEDURE update_location();
        """
    )

    # Execute SQL
    connection.execute(function_sql)
    connection.execute(trigger_sql)


# Listening to the 'after_create' event for Spots.__table__
event.listen(Spots.__table__, "after_create", after_create)
