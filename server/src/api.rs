use crate::{
    db::{Db, FollowLimit},
    model::{Forecast, NewSpot, validate_coordinates},
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub write_token: Option<Arc<str>>,
    pub allow_writes: bool,
}

#[derive(Debug)]
pub struct ApiError(StatusCode, String);
impl From<anyhow::Error> for ApiError {
    fn from(error: anyhow::Error) -> Self {
        if error.is::<FollowLimit>() {
            return Self(StatusCode::CONFLICT, error.to_string());
        }
        tracing::error!(error=%format!("{error:#}"),"API request failed");
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The request could not be completed. Please try again shortly.".into(),
        )
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(serde_json::json!({"error":self.1}))).into_response()
    }
}
fn bad_request(error: impl std::fmt::Display) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, error.to_string())
}
fn not_found() -> ApiError {
    ApiError(StatusCode::NOT_FOUND, "Spot not found".into())
}

fn writable(state: &AppState, headers: &HeaderMap) -> bool {
    if state.allow_writes {
        return true;
    }
    let Some(expected) = state.write_token.as_deref() else {
        return false;
    };
    let Some(actual) = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
    else {
        return false;
    };
    actual.len() == expected.len()
        && actual
            .bytes()
            .zip(expected.bytes())
            .fold(0, |diff, (a, b)| diff | (a ^ b))
            == 0
}
fn authorize(state: &AppState, headers: &HeaderMap) -> Result<(), ApiError> {
    if writable(state, headers) {
        Ok(())
    } else {
        Err(ApiError(
            StatusCode::UNAUTHORIZED,
            "Editing requires the server's write token".into(),
        ))
    }
}

pub fn router(state: AppState, web_dir: PathBuf) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/api/capabilities", get(capabilities))
        .route("/api/status", get(status))
        .route("/api/spots", get(spots).post(add_spot))
        .route("/api/spots/{id}", get(spot))
        .route("/api/spots/{id}/watch", put(watch_spot))
        .route("/api/spots/{id}/forecasts", get(forecasts))
        .route("/api/spots/{id}/stations", get(stations))
        .route("/api/jobs/retry", post(retry_jobs))
        .route("/spots", get(spots))
        .route("/spots/{id}", get(spot))
        .route("/addspot", post(add_spot))
        .route(
            "/api/{*path}",
            get(|| async {
                (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({"error":"API route not found"})),
                )
            }),
        )
        .fallback_service(
            ServeDir::new(&web_dir).not_found_service(ServeFile::new(web_dir.join("index.html"))),
        )
        .layer(axum::extract::DefaultBodyLimit::max(16 * 1024))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
async fn health(State(state): State<AppState>) -> Result<Json<serde_json::Value>, ApiError> {
    state
        .db
        .pool
        .get()
        .await
        .map_err(anyhow::Error::from)?
        .simple_query("SELECT 1")
        .await
        .map_err(anyhow::Error::from)?;
    Ok(Json(
        serde_json::json!({"status":"ok","version":env!("CARGO_PKG_VERSION")}),
    ))
}
async fn capabilities(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<serde_json::Value> {
    Json(
        serde_json::json!({"can_write":writable(&state,&headers),"requires_token":state.write_token.is_some(),"max_watched_spots":20}),
    )
}
async fn status(State(state): State<AppState>) -> Result<Json<crate::db::Status>, ApiError> {
    Ok(Json(state.db.status().await?))
}
async fn spots(State(state): State<AppState>) -> Result<Json<Vec<crate::model::Spot>>, ApiError> {
    Ok(Json(state.db.spots().await?))
}
async fn spot(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<crate::model::Spot>, ApiError> {
    Ok(Json(state.db.spot(id).await?.ok_or_else(not_found)?))
}
async fn add_spot(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(mut new): Json<NewSpot>,
) -> Result<impl IntoResponse, ApiError> {
    authorize(&state, &headers)?;
    new.validate().map_err(bad_request)?;
    Ok((StatusCode::CREATED, Json(state.db.add_spot(&new).await?)))
}
#[derive(Deserialize)]
struct WatchRequest {
    watched: bool,
}
async fn watch_spot(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
    Json(request): Json<WatchRequest>,
) -> Result<Json<crate::model::Spot>, ApiError> {
    authorize(&state, &headers)?;
    Ok(Json(
        state
            .db
            .set_watch(id, request.watched)
            .await?
            .ok_or_else(not_found)?,
    ))
}
#[derive(Serialize)]
struct ForecastResponse {
    points: Vec<Forecast>,
    stale: bool,
    source: &'static str,
}
async fn forecasts(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ForecastResponse>, ApiError> {
    state.db.spot(id).await?.ok_or_else(not_found)?;
    let points = state.db.forecasts(id).await?;
    let stale = points
        .iter()
        .map(|p| p.time)
        .max()
        .is_none_or(|t| Utc::now() - t > chrono::Duration::hours(18));
    Ok(Json(ForecastResponse {
        points,
        stale,
        source: "NOAA GEFS Wave · ensemble mean · 0.25°",
    }))
}
async fn stations(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Vec<crate::model::Station>>, ApiError> {
    let spot = state.db.spot(id).await?.ok_or_else(not_found)?;
    validate_coordinates(spot.latitude, spot.longitude).map_err(bad_request)?;
    Ok(Json(
        state
            .db
            .stations(spot.latitude, spot.longitude, 200_000.0)
            .await?,
    ))
}
async fn retry_jobs(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    authorize(&state, &headers)?;
    Ok(Json(
        serde_json::json!({"retried":state.db.retry_failed().await?}),
    ))
}
