import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

const DATABASE_URL = "postgres://airflow:airflow@localhost:5432/airflow";

export const db = drizzle(DATABASE_URL);
