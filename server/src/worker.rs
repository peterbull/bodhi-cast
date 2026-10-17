use crate::{
    db::Db,
    noaa::{Noaa, model_run, plan},
};
use anyhow::Result;
use chrono::Utc;
use std::time::{Duration, Instant};
use tokio::sync::watch;

pub async fn run(db: Db, horizon: u16, mut stop: watch::Receiver<bool>) -> Result<()> {
    let noaa = Noaa::new()?;
    loop {
        let leader = db.pool.get().await?;
        let acquired: bool = leader
            .query_one("SELECT pg_try_advisory_lock(76249102)", &[])
            .await?
            .get(0);
        if !acquired {
            drop(leader);
            tokio::select! { _=stop.changed()=>return Ok(()),_=tokio::time::sleep(Duration::from_secs(30))=>continue }
        }
        let result = leader_loop(&db, &noaa, horizon, &mut stop, &leader).await;
        leader
            .query_one("SELECT pg_advisory_unlock(76249102)", &[])
            .await?;
        return result;
    }
}

async fn leader_loop(
    db: &Db,
    noaa: &Noaa,
    horizon: u16,
    stop: &mut watch::Receiver<bool>,
    leader: &deadpool_postgres::Object,
) -> Result<()> {
    let mut last_plan = Instant::now() - Duration::from_secs(61);
    let mut last_prune = Instant::now();
    loop {
        if *stop.borrow() {
            return Ok(());
        }
        if last_plan.elapsed() >= Duration::from_secs(60) {
            leader.simple_query("SELECT 1").await?;
            plan(db, horizon, model_run(Utc::now())).await?;
            last_plan = Instant::now();
        }
        if last_prune.elapsed() >= Duration::from_secs(3600) {
            db.prune().await?;
            last_prune = Instant::now();
        }
        match db.claim().await? {
            Some(job) => {
                let result =
                    tokio::time::timeout(Duration::from_secs(240), noaa.execute(db, &job.spec))
                        .await;
                let result = match result {
                    Ok(result) => result,
                    Err(_) => Err(anyhow::anyhow!("Job exceeded its four-minute time limit")),
                };
                let error = match result {
                    Ok(()) => None,
                    Err(error) => {
                        let message = format!("{error:#}");
                        tracing::error!(
                            job = job.id,
                            attempt = job.attempts,
                            error = message,
                            "Background job failed"
                        );
                        Some(message)
                    }
                };
                db.finish(&job, error.as_deref()).await?;
            }
            None => {
                tokio::select! { _=stop.changed()=>return Ok(()),_=tokio::time::sleep(Duration::from_secs(2))=>{} }
            }
        }
    }
}
