import os

LOCAL_PG_URI = "postgresql+psycopg2://airflow:airflow@postgres:5432/postgres"
SUPABASE_PG_URI = os.environ.get("SUPABASE_PG_URI")
