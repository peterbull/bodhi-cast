use crate::model::{Forecast, Job, JobSpec, NewSpot, Spot, Station};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use deadpool_postgres::{Manager, Pool};
use serde::Serialize;
use tokio_postgres::{NoTls, Row};

#[derive(Clone)]
pub struct Db {
    pub pool: Pool,
}

#[derive(Debug)]
pub struct FollowLimit;
impl std::fmt::Display for FollowLimit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("You can follow at most 20 spots; unfollow one first")
    }
}
impl std::error::Error for FollowLimit {}

fn spot(row: Row) -> Spot {
    Spot {
        id: row.get("id"),
        latitude: row.get("latitude"),
        longitude: row.get("longitude"),
        spot_name: row.get("spot_name"),
        street_address: row.get("street_address"),
        watched: row.get("watched"),
    }
}

impl Db {
    pub async fn connect(url: &str) -> Result<Self> {
        let mut config: tokio_postgres::Config = url.parse().context("Invalid PostgreSQL URL")?;
        config.options("-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000");
        let pool = Pool::builder(Manager::new(config, NoTls))
            .max_size(5)
            .runtime(deadpool_postgres::Runtime::Tokio1)
            .wait_timeout(Some(std::time::Duration::from_secs(5)))
            .build()?;
        let db = Self { pool };
        db.pool
            .get()
            .await?
            .simple_query("SELECT 1")
            .await
            .context("Cannot connect to PostgreSQL; start PostGIS and check DATABASE_URL")?;
        Ok(db)
    }

    pub async fn migrate(&self) -> Result<()> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.execute("SELECT pg_advisory_xact_lock(76249100)", &[])
            .await?;
        tx.batch_execute(include_str!("../schema.sql")).await?;
        let catalog: serde_json::Value = serde_json::from_str(include_str!("../catalog.json"))?;
        tx.execute("INSERT INTO bodhi.spots(spot_name,street_address,latitude,longitude) SELECT spot_name,street_address,latitude,longitude FROM jsonb_to_recordset($1) AS s(spot_name text, street_address text, latitude float8, longitude float8) ON CONFLICT DO NOTHING", &[&catalog]).await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn spots(&self) -> Result<Vec<Spot>> {
        Ok(self
            .pool
            .get()
            .await?
            .query("SELECT * FROM bodhi.spots ORDER BY spot_name,id", &[])
            .await?
            .into_iter()
            .map(spot)
            .collect())
    }

    pub async fn spot(&self, id: i64) -> Result<Option<Spot>> {
        Ok(self
            .pool
            .get()
            .await?
            .query_opt("SELECT * FROM bodhi.spots WHERE id=$1", &[&id])
            .await?
            .map(spot))
    }

    pub async fn watched(&self) -> Result<Vec<Spot>> {
        Ok(self
            .pool
            .get()
            .await?
            .query("SELECT * FROM bodhi.spots WHERE watched ORDER BY id", &[])
            .await?
            .into_iter()
            .map(spot)
            .collect())
    }

    pub async fn set_watch(&self, id: i64, watched: bool) -> Result<Option<Spot>> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.execute("SELECT pg_advisory_xact_lock(76249101)", &[])
            .await?;
        let Some(existing) = tx
            .query_opt("SELECT * FROM bodhi.spots WHERE id=$1", &[&id])
            .await?
        else {
            return Ok(None);
        };
        let existing = spot(existing);
        if existing.watched == watched {
            return Ok(Some(existing));
        }
        if watched {
            let count: i64 = tx
                .query_one(
                    "SELECT count(*) FROM bodhi.spots WHERE watched AND id<>$1",
                    &[&id],
                )
                .await?
                .get(0);
            anyhow::ensure!(count < 20, FollowLimit);
        }
        let row = tx
            .query_opt(
                "UPDATE bodhi.spots SET watched=$2 WHERE id=$1 RETURNING *",
                &[&id, &watched],
            )
            .await?;
        tx.commit().await?;
        Ok(row.map(spot))
    }

    pub async fn add_spot(&self, new: &NewSpot) -> Result<Spot> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.execute("SELECT pg_advisory_xact_lock(76249101)", &[])
            .await?;
        let existing = tx.query_opt("SELECT * FROM bodhi.spots WHERE lower(spot_name)=lower($1) AND ST_DWithin(location,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,1) ORDER BY id LIMIT 1", &[&new.spot_name,&new.longitude,&new.latitude]).await?.map(spot);
        if let Some(ref existing) = existing
            && existing.watched
        {
            return Ok(existing.clone());
        }
        let count: i64 = tx
            .query_one("SELECT count(*) FROM bodhi.spots WHERE watched", &[])
            .await?
            .get(0);
        anyhow::ensure!(count < 20, FollowLimit);
        if let Some(existing) = existing {
            let row = tx
                .query_one(
                    "UPDATE bodhi.spots SET watched=true WHERE id=$1 RETURNING *",
                    &[&existing.id],
                )
                .await?;
            tx.commit().await?;
            return Ok(spot(row));
        }
        let row = tx.query_one("INSERT INTO bodhi.spots(spot_name,street_address,latitude,longitude,watched) VALUES($1,$2,$3,$4,true) ON CONFLICT(spot_name,latitude,longitude) DO UPDATE SET watched=true RETURNING *", &[&new.spot_name,&new.street_address,&new.latitude,&new.longitude]).await?;
        tx.commit().await?;
        Ok(spot(row))
    }

    pub async fn import_spots(&self, spots: &[NewSpot]) -> Result<u64> {
        let value = serde_json::to_value(spots)?;
        Ok(self.pool.get().await?.execute("INSERT INTO bodhi.spots(spot_name,street_address,latitude,longitude) SELECT spot_name,street_address,latitude,longitude FROM jsonb_to_recordset($1) AS s(spot_name text, street_address text, latitude float8, longitude float8) ON CONFLICT DO NOTHING", &[&value]).await?)
    }

    pub async fn forecasts(&self, id: i64) -> Result<Vec<Forecast>> {
        let rows = self.pool.get().await?.query("SELECT DISTINCT ON(valid_time) data FROM bodhi.forecasts WHERE spot_id=$1 AND valid_time >= now()-interval '3 hours' ORDER BY valid_time,model_time DESC LIMIT 129", &[&id]).await?;
        rows.into_iter()
            .map(|r| serde_json::from_value(r.get(0)).map_err(Into::into))
            .collect()
    }

    pub async fn save_forecasts(&self, rows: &[(i64, Forecast)]) -> Result<()> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        for (id, row) in rows {
            let data = serde_json::to_value(row)?;
            tx.execute("INSERT INTO bodhi.forecasts(spot_id,model_time,valid_time,data) VALUES($1,$2,$3,$4) ON CONFLICT(spot_id,model_time,valid_time) DO UPDATE SET data=excluded.data,updated_at=now()", &[id,&row.time,&row.valid_time,&data]).await?;
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn stations(&self, lat: f64, lon: f64, radius: f64) -> Result<Vec<Station>> {
        let rows = self.pool.get().await?.query("SELECT *, ST_Distance(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance FROM bodhi.stations WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) ORDER BY distance LIMIT 5", &[&lon,&lat,&radius]).await?;
        Ok(rows
            .into_iter()
            .map(|r| Station {
                id: r.get("id"),
                name: r.get("name"),
                latitude: r.get("latitude"),
                longitude: r.get("longitude"),
                distance: r.get("distance"),
                observations: r.get("observations"),
                updated_at: r.get("updated_at"),
            })
            .collect())
    }

    pub async fn enqueue(&self, key: &str, spec: &JobSpec) -> Result<()> {
        self.pool
            .get()
            .await?
            .execute(
                "INSERT INTO bodhi.jobs(dedupe_key,spec) VALUES($1,$2) ON CONFLICT DO NOTHING",
                &[&key, &serde_json::to_value(spec)?],
            )
            .await?;
        Ok(())
    }

    pub async fn claim(&self) -> Result<Option<Job>> {
        let conn = self.pool.get().await?;
        conn.execute("UPDATE bodhi.jobs SET status=CASE WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,lease_until=NULL,last_error='Worker lease expired',updated_at=now() WHERE status='running' AND lease_until<now()", &[]).await?;
        let row = conn.query_opt("UPDATE bodhi.jobs SET status='running',attempts=attempts+1,lease_until=now()+interval '10 minutes',updated_at=now() WHERE id=(SELECT id FROM bodhi.jobs WHERE status='pending' AND available_at<=now() ORDER BY CASE WHEN spec->>'kind'='stations' THEN 0 ELSE 1 END,available_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,spec,attempts", &[]).await?;
        row.map(|r| {
            Ok(Job {
                id: r.get(0),
                spec: serde_json::from_value(r.get(1))?,
                attempts: r.get(2),
            })
        })
        .transpose()
    }

    pub async fn finish(&self, job: &Job, error: Option<&str>) -> Result<()> {
        let delay = (30_i64 * 2_i64.pow(job.attempts.min(7) as u32)).min(3600);
        let status = if error.is_none() {
            "succeeded"
        } else if job.attempts >= 8 {
            "failed"
        } else {
            "pending"
        };
        let updated = self.pool.get().await?.execute("UPDATE bodhi.jobs SET status=$2,available_at=now()+make_interval(secs=>$3::float8),lease_until=NULL,last_error=$4,updated_at=now() WHERE id=$1 AND status='running' AND attempts=$5", &[&job.id,&status,&(delay as f64),&error,&job.attempts]).await?;
        anyhow::ensure!(updated == 1, "Job lease lost before completion");
        Ok(())
    }

    pub async fn status(&self) -> Result<Status> {
        let conn = self.pool.get().await?;
        let rows = conn
            .query(
                "SELECT status,count(*) AS count FROM bodhi.jobs GROUP BY status",
                &[],
            )
            .await?;
        let latest = conn
            .query_one(
                "SELECT max(updated_at),max(model_time) FROM bodhi.forecasts",
                &[],
            )
            .await?;
        let errors = conn.query("SELECT id,last_error,updated_at FROM bodhi.jobs WHERE last_error IS NOT NULL AND status IN ('failed','pending') ORDER BY updated_at DESC LIMIT 3", &[]).await?;
        Ok(Status {
            jobs: rows
                .into_iter()
                .map(|r| JobCount {
                    status: r.get(0),
                    count: r.get(1),
                })
                .collect(),
            last_forecast_update: latest.get(0),
            latest_model: latest.get(1),
            errors: errors
                .into_iter()
                .map(|r| JobError {
                    id: r.get(0),
                    error: r.get(1),
                    at: r.get(2),
                })
                .collect(),
        })
    }

    pub async fn retry_failed(&self) -> Result<u64> {
        Ok(self.pool.get().await?.execute("UPDATE bodhi.jobs SET status='pending',attempts=0,available_at=now(),last_error=NULL,updated_at=now() WHERE status='failed'", &[]).await?)
    }

    pub async fn prune(&self) -> Result<()> {
        let conn = self.pool.get().await?;
        conn.execute(
            "DELETE FROM bodhi.forecasts WHERE valid_time<now()-interval '2 days'",
            &[],
        )
        .await?;
        conn.execute(
            "DELETE FROM bodhi.jobs WHERE created_at<now()-interval '4 days' AND status<>'running'",
            &[],
        )
        .await?;
        Ok(())
    }
}

#[derive(Serialize)]
pub struct Status {
    pub jobs: Vec<JobCount>,
    pub last_forecast_update: Option<DateTime<Utc>>,
    pub latest_model: Option<DateTime<Utc>>,
    pub errors: Vec<JobError>,
}
#[derive(Serialize)]
pub struct JobCount {
    pub status: String,
    pub count: i64,
}
#[derive(Serialize)]
pub struct JobError {
    pub id: i64,
    pub error: String,
    pub at: DateTime<Utc>,
}
