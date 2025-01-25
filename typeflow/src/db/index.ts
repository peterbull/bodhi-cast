import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://airflow:airflow@localhost:5432/airflow";

export const db = drizzle(DATABASE_URL);
