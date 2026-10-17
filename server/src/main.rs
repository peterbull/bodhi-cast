use anyhow::{Context, Result};
use bodhi_cast::{
    api::{AppState, router},
    auth::GoogleAuth,
    db::Db,
    model::NewSpot,
    noaa, worker,
};
use clap::{Parser, Subcommand};
use std::{
    future::IntoFuture,
    net::SocketAddr,
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};
use tokio::sync::watch;

#[derive(Parser)]
#[command(version, about = "Surf forecasts with Rust and PostgreSQL/PostGIS")]
struct Cli {
    #[arg(long, env = "DATABASE_URL", hide_env_values = true)]
    database_url: String,
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand)]
enum Command {
    Serve {
        #[arg(long, default_value = "127.0.0.1:8000")]
        listen: SocketAddr,
        #[arg(long, default_value = "web/dist")]
        web_dir: PathBuf,
        #[arg(long,default_value_t=72,value_parser=clap::value_parser!(u16).range(12..=384))]
        horizon: u16,
        #[arg(long)]
        no_worker: bool,
        #[arg(
            long,
            help = "Allow unauthenticated editing; use only on a trusted local network"
        )]
        allow_writes: bool,
        #[arg(long, help = "Read the editing token from a private file")]
        write_token_file: Option<PathBuf>,
        #[arg(long, env="BODHI_GOOGLE_CLIENT_FILE", requires="public_url", conflicts_with_all=["allow_writes","write_token_file"])]
        google_client_file: Option<PathBuf>,
        #[arg(long, env = "BODHI_PUBLIC_URL", requires = "google_client_file")]
        public_url: Option<String>,
    },
    Sync {
        #[arg(long,default_value_t=72,value_parser=clap::value_parser!(u16).range(12..=384))]
        horizon: u16,
    },
    Jobs {
        #[arg(long)]
        retry_failed: bool,
    },
    ImportSpots {
        file: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bodhi_cast=info,tower_http=info".into()),
        )
        .init();
    let cli = Cli::parse();
    let db = Db::connect(&cli.database_url).await?;
    db.migrate().await.context("Schema initialization failed; the database requires PostGIS and CREATE privileges for the bodhi schema")?;
    match cli.command {
        Command::Serve {
            listen,
            web_dir,
            horizon,
            no_worker,
            allow_writes,
            write_token_file,
            google_client_file,
            public_url,
        } => {
            anyhow::ensure!(
                web_dir.join("index.html").exists(),
                "Frontend build missing at {}; run pnpm build",
                web_dir.display()
            );
            let write_token = write_token_file
                .map(|path| std::fs::read_to_string(path).context("Cannot read write token file"))
                .transpose()?
                .map(|s| Arc::<str>::from(s.trim()));
            anyhow::ensure!(
                write_token.as_ref().is_none_or(|s| s.len() >= 24),
                "Write token must contain at least 24 bytes"
            );
            let auth = google_client_file
                .map(|path| {
                    GoogleAuth::from_file(
                        &path,
                        public_url.as_deref().expect("Required public URL"),
                    )
                    .map(Arc::new)
                })
                .transpose()?;
            let listener = tokio::net::TcpListener::bind(listen).await?;
            let (stop_tx, stop_rx) = watch::channel(false);
            let worker_task = if no_worker {
                None
            } else {
                Some(tokio::spawn(worker::run(db.clone(), horizon, stop_rx)))
            };
            let app = router(
                AppState {
                    db,
                    write_token,
                    allow_writes,
                    auth,
                },
                web_dir,
            );
            tracing::info!(%listen,"Bodhi Cast ready");
            let shutting_down = Arc::new(AtomicBool::new(false));
            let shutdown_flag = shutting_down.clone();
            let server = axum::serve(listener, app).with_graceful_shutdown(async move {
                shutdown().await;
                shutdown_flag.store(true, Ordering::Relaxed);
                let _ = stop_tx.send(true);
            });
            let mut server = Box::pin(server.into_future());
            if let Some(mut task) = worker_task {
                tokio::select! {
                    result = &mut server => {
                        result?;
                        tokio::time::timeout(std::time::Duration::from_secs(300), task)
                            .await.context("Worker did not finish within five minutes")?
                            .context("Worker panicked while stopping")??;
                    },
                    result = &mut task => {
                        result.context("Worker task panicked")??;
                        anyhow::ensure!(shutting_down.load(Ordering::Relaxed), "Worker stopped unexpectedly");
                        server.await?;
                    },
                }
            } else {
                server.await?;
            }
        }
        Command::Sync { horizon } => println!(
            "Queued {} regional wave jobs",
            noaa::plan(&db, horizon, noaa::model_run(chrono::Utc::now())).await?
        ),
        Command::Jobs { retry_failed } => {
            if retry_failed {
                println!("Retried {} failed jobs", db.retry_failed().await?);
            }
            println!("{}", serde_json::to_string_pretty(&db.status().await?)?);
        }
        Command::ImportSpots { file } => {
            let mut spots: Vec<NewSpot> = serde_json::from_reader(std::fs::File::open(file)?)?;
            for spot in &mut spots {
                spot.validate()?;
            }
            println!(
                "Imported {} spots (existing spots preserved)",
                db.import_spots(&spots).await?
            );
        }
    }
    Ok(())
}
async fn shutdown() {
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("Cannot install SIGTERM handler");
        tokio::select! { result=tokio::signal::ctrl_c()=>{if let Err(error)=result {tracing::error!(%error,"Cannot listen for Ctrl-C")}},_=terminate.recv()=>{} }
    }
    #[cfg(not(unix))]
    if let Err(error) = tokio::signal::ctrl_c().await {
        tracing::error!(%error,"Cannot listen for Ctrl-C")
    }
}

#[cfg(test)]
mod tests {
    use super::Cli;
    use clap::CommandFactory;
    #[test]
    fn cli_arguments_are_consistent() {
        Cli::command().debug_assert();
    }
}
