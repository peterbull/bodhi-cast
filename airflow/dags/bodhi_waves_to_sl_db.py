import logging
import os

import pandas as pd
import pendulum
from airflow.decorators import dag, task
from extensions.models.models import BodhiWaves, bodhi_engine, create_tables, engine, get_session
from extensions.schemas.schemas import BodhiWavesModel, SlOffshoreIdx
from extensions.utils.sl_data import SpotsForecast, SpotsGetter
from sqlalchemy import insert, select, text

# db_uri = LOCAL_PG_URI

# Have to declare it this way for now
# the parser is giving an error on initial load
# using environ directly seems to fix it
db_uri = os.environ.get("SUPABASE_PG_URI")

start_date = pendulum.datetime(2024, 6, 9)

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": start_date,
    "email": ["your-email@example.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": pendulum.duration(minutes=5),
}


@dag(
    dag_id="bodhi_waves_to_sl_db",
    start_date=start_date,
    schedule="0 10 * * *",
    catchup=False,
    is_paused_upon_creation=False,
)
def taskflow():
    def fetch_wave_data(lat_lon_str):
        try:
            with get_session(bodhi_engine) as db:
                stmt = text(
                    f"""select * from wave_forecast where time = CURRENT_DATE AND (latitude, longitude) in ({lat_lon_str})"""
                )
                results = db.execute(stmt).fetchall()
                data = [BodhiWavesModel.model_validate(entry) for entry in results]
                data_dict = [entry.model_dump() for entry in data]
                for d in data_dict:
                    d.pop("location", None)
            return data_dict
        except Exception as e:
            logging.error(f"Error fetching wave data: {str(e)}")
            return []

    def wave_data_to_db(data):
        try:
            with get_session(engine) as db:
                stmt = insert(BodhiWaves).values(data)
                db.execute(stmt)
                db.commit()
        except Exception as e:
            logging.error(f"Error inserting wave data to database: {str(e)}")

    def batch(iterable, n=1):
        l = len(iterable)
        for idx in range(0, l, n):
            yield iterable[idx : min(idx + n, l)]

    def get_all_batches(lat_lon_list, bs=10):
        try:
            processed = 0
            for batch_lat_lon_list in batch(lat_lon_list, bs):
                lat_lon_str = ", ".join(map(str, batch_lat_lon_list))
                data = fetch_wave_data(lat_lon_str)
                wave_data_to_db(data)
                processed += len(batch_lat_lon_list)
                logging.info(f"Processed {processed} out of {len(lat_lon_list)}.")
        except Exception as e:
            logging.error(f"Error processing batches: {str(e)}")

    @task()
    def handle_create_tables():
        create_tables()

    @task()
    def handle_enable_extension():
        with get_session(engine) as db:
            stmt = text("""CREATE EXTENSION IF NOT EXISTS postgis""")
            db.execute(stmt)
            db.commit()

    @task()
    def handle_db_idxs():
        try:
            with get_session(bodhi_engine) as db:
                stmt = text(
                    """CREATE INDEX if not exists idx_wave_forecast_lat_lon ON wave_forecast (latitude, longitude)"""
                )
                db.execute(stmt)
                db.commit()
        except Exception as e:
            logging.error(f"Error handling database indexes: {str(e)}")

    @task()
    def get_spot_offshore_locations():
        try:
            with get_session(engine) as db:
                stmt = text(
                    """select distinct on ("associated_spotId") "associated_spotId", "associated_offshoreLocation_lat", "associated_offshoreLocation_lon" from sl_ratings"""
                )
                results = db.execute(stmt).fetchall()

                data = [SlOffshoreIdx.model_validate(entry) for entry in results]
                data_dicts = [entry.model_dump() for entry in data]

                df = pd.DataFrame(data_dicts)
                # Create a mask to only keep lat an lon where they are in the intervals .0, .25, .5, .75
                df["lat_mod"] = df["associated_offshoreLocation_lat"] % 4
                df["lon_mod"] = df["associated_offshoreLocation_lon"] % 4

                mask = df["lat_mod"].apply(lambda x: round(x, 2) == x) & df["lon_mod"].apply(
                    lambda x: round(x, 2) == x
                )
                df = df[mask]
                df = df.drop(columns=["lat_mod", "lon_mod"])

                lat_lon_list = list(
                    set(
                        zip(
                            df["associated_offshoreLocation_lat"].values,
                            df["associated_offshoreLocation_lon"].values,
                        )
                    )
                )
                return lat_lon_list
        except Exception as e:
            logging.error(f"Error getting spot offshore locations: {str(e)}")
            return []

    @task()
    def bodhi_waves_to_db(lat_lon_list):
        # Xcom serializes tuples to list of lists, so deserialize back to List[Tuple]
        lat_lon_list = [tuple(pair) for pair in lat_lon_list]
        get_all_batches(lat_lon_list=lat_lon_list, bs=50)

    handle_create_tables() >> handle_enable_extension() >> handle_db_idxs()
    lat_lon_list = get_spot_offshore_locations()
    bodhi_waves_to_db(lat_lon_list)


dag_run = taskflow()
