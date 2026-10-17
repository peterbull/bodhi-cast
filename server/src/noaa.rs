use crate::{
    db::Db,
    model::{Forecast, JobSpec, Spot, Swell, WaveFields, distance_m, normalize_lon},
};
use anyhow::{Context, Result};
use chrono::{DateTime, Timelike, Utc};
use grib::{Grib2SubmessageDecoder, LatLons};
use serde::Deserialize;
use std::{
    collections::{BTreeMap, BTreeSet},
    io::Cursor,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

const MAX_BYTES: usize = 8 * 1024 * 1024;

#[derive(Clone)]
pub struct Noaa {
    client: reqwest::Client,
    last_nomads: Arc<Mutex<Option<Instant>>>,
}

impl Noaa {
    pub fn new() -> Result<Self> {
        Ok(Self {
            client: reqwest::Client::builder()
                .user_agent("Bodhi-Cast/0.2 (personal surf forecasts)")
                .timeout(Duration::from_secs(90))
                .connect_timeout(Duration::from_secs(10))
                .build()?,
            last_nomads: Arc::new(Mutex::new(None)),
        })
    }

    pub async fn bytes(&self, url: &str, nomads: bool) -> Result<Vec<u8>> {
        if nomads {
            let mut last = self.last_nomads.lock().await;
            if let Some(at) = *last {
                tokio::time::sleep(Duration::from_secs(10).saturating_sub(at.elapsed())).await;
            }
            *last = Some(Instant::now());
        }
        let mut response = self.client.get(url).send().await?.error_for_status()?;
        anyhow::ensure!(
            response.content_length().unwrap_or(0) <= MAX_BYTES as u64,
            "NOAA response exceeds 8 MiB limit"
        );
        let mut body = Vec::new();
        while let Some(chunk) = response.chunk().await? {
            anyhow::ensure!(
                body.len() + chunk.len() <= MAX_BYTES,
                "NOAA response exceeds 8 MiB limit"
            );
            body.extend_from_slice(&chunk);
        }
        Ok(body)
    }

    pub async fn execute(&self, db: &Db, spec: &JobSpec) -> Result<()> {
        match spec {
            JobSpec::Wave {
                run,
                lead,
                west,
                south,
                spot_ids,
            } => {
                let spots: Vec<_> = db
                    .watched()
                    .await?
                    .into_iter()
                    .filter(|s| spot_ids.contains(&s.id))
                    .collect();
                if spots.is_empty() {
                    return Ok(());
                }
                let url = wave_url(*run, *lead, *west, *south)?;
                let bytes = self
                    .bytes(url.as_str(), true)
                    .await
                    .context("NOAA wave download failed")?;
                let expected_run = *run;
                let expected_lead = *lead;
                let rows = tokio::task::spawn_blocking(move || {
                    decode(&bytes, &spots, expected_run, expected_lead)
                })
                .await
                .context("GRIB decoder task failed")??;
                db.save_forecasts(&rows).await?;
                tracing::info!(points = rows.len(), lead, "Wave forecast saved");
            }
            JobSpec::Stations { .. } => self.update_stations(db).await?,
        }
        Ok(())
    }

    async fn update_stations(&self, db: &Db) -> Result<()> {
        let spots = db.watched().await?;
        if spots.is_empty() {
            return Ok(());
        }
        let metadata=self.bytes("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels",false).await?;
        let inventory: Inventory =
            serde_json::from_slice(&metadata).context("Invalid NOAA station inventory")?;
        anyhow::ensure!(
            !inventory.stations.is_empty(),
            "NOAA returned an empty station inventory"
        );
        let conn = db.pool.get().await?;
        for station in inventory.stations {
            crate::model::validate_coordinates(station.lat, station.lng)?;
            conn.execute("INSERT INTO bodhi.stations(id,name,latitude,longitude) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude", &[&station.id,&station.name,&station.lat,&station.lng]).await?;
        }
        drop(conn);
        let mut station_ids = BTreeSet::new();
        for spot in spots {
            for station in db
                .stations(spot.latitude, spot.longitude, 200_000.0)
                .await?
                .into_iter()
                .take(3)
            {
                station_ids.insert(station.id);
            }
        }
        let mut successful = 0;
        let mut failed = 0;
        for id in station_ids {
            let mut patch = serde_json::Map::new();
            for product in [
                Product::WaterLevel,
                Product::Wind,
                Product::AirTemperature,
                Product::WaterTemperature,
            ] {
                let url = format!(
                    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station={id}&product={}&datum=MLLW&time_zone=gmt&units=metric&format=json&application=bodhi_cast",
                    product.name()
                );
                let result = async {
                    let bytes = self.bytes(&url, false).await?;
                    let response: ObservationResponse = serde_json::from_slice(&bytes)?;
                    anyhow::ensure!(
                        response.error.is_none(),
                        "{}",
                        response.error.unwrap_or_default()
                    );
                    let observation = response
                        .data
                        .and_then(|v| v.into_iter().next())
                        .context("NOAA returned no observations")?;
                    Ok::<_, anyhow::Error>(observation)
                }
                .await;
                match result {
                    Ok(value) => {
                        patch.insert(product.name().to_owned(), value);
                        successful += 1;
                    }
                    Err(error) => {
                        tracing::warn!(station=id,product=product.name(),%error,"Station product unavailable; preserving last observation");
                        failed += 1;
                    }
                }
            }
            if !patch.is_empty() {
                db.pool.get().await?.execute("UPDATE bodhi.stations SET observations=observations || $2,updated_at=now() WHERE id=$1", &[&id,&serde_json::Value::Object(patch)]).await?;
            }
        }
        anyhow::ensure!(
            successful > 0 || failed == 0,
            "All NOAA station requests failed"
        );
        tracing::info!(successful, failed, "Station observations refreshed");
        Ok(())
    }
}

#[derive(Deserialize)]
struct Inventory {
    stations: Vec<StationMetadata>,
}
#[derive(Deserialize)]
struct StationMetadata {
    id: String,
    name: String,
    lat: f64,
    lng: f64,
}
#[derive(Deserialize)]
struct ObservationResponse {
    data: Option<Vec<serde_json::Value>>,
    error: Option<serde_json::Value>,
}
#[derive(Clone, Copy)]
enum Product {
    WaterLevel,
    Wind,
    AirTemperature,
    WaterTemperature,
}
impl Product {
    fn name(self) -> &'static str {
        match self {
            Self::WaterLevel => "water_level",
            Self::Wind => "wind",
            Self::AirTemperature => "air_temperature",
            Self::WaterTemperature => "water_temperature",
        }
    }
}

pub fn model_run(now: DateTime<Utc>) -> DateTime<Utc> {
    let available = now - chrono::Duration::hours(6);
    available
        .with_hour(available.hour() / 6 * 6)
        .unwrap()
        .with_minute(0)
        .unwrap()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap()
}

pub fn wave_url(run: DateTime<Utc>, lead: u16, west: i16, south: i16) -> Result<reqwest::Url> {
    anyhow::ensure!(
        lead <= 384 && lead.is_multiple_of(3) && (lead <= 240 || lead.is_multiple_of(6)),
        "Invalid forecast lead"
    );
    let mut url =
        reqwest::Url::parse("https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl")?;
    url.query_pairs_mut()
        .append_pair(
            "dir",
            &format!(
                "/gefs.{}/{:02}/wave/gridded",
                run.format("%Y%m%d"),
                run.hour()
            ),
        )
        .append_pair(
            "file",
            &format!(
                "gefs.wave.t{:02}z.mean.global.0p25.f{lead:03}.grib2",
                run.hour()
            ),
        )
        .append_pair("all_var", "on")
        .append_pair("all_lev", "on")
        .append_pair("subregion", "")
        .append_pair("leftlon", &(west - 1).to_string())
        .append_pair("rightlon", &(west + 5).to_string())
        .append_pair("bottomlat", &(south - 1).max(-90).to_string())
        .append_pair("toplat", &(south + 5).min(90).to_string());
    Ok(url)
}

pub fn forecast_leads(horizon: u16) -> impl Iterator<Item = u16> {
    (0..=horizon.min(384))
        .step_by(3)
        .filter(|lead| *lead <= 240 || lead.is_multiple_of(6))
}

pub async fn plan(db: &Db, horizon: u16, run: DateTime<Utc>) -> Result<usize> {
    let mut tiles: BTreeMap<(i16, i16), Vec<i64>> = BTreeMap::new();
    for s in db.watched().await? {
        let tile = (
            (normalize_lon(s.longitude) / 4.0).floor() as i16 * 4,
            (s.latitude / 4.0).floor() as i16 * 4,
        );
        tiles.entry(tile).or_default().push(s.id);
    }
    if tiles.is_empty() {
        return Ok(0);
    }
    db.enqueue(
        &format!("stations:{}", Utc::now().timestamp() / 600),
        &JobSpec::Stations {
            bucket: Utc::now().timestamp() / 600,
        },
    )
    .await?;
    let mut count = 0;
    for lead in forecast_leads(horizon) {
        if run + chrono::Duration::hours(lead as i64) < Utc::now() - chrono::Duration::hours(3) {
            continue;
        }
        for (&(west, south), ids) in &tiles {
            let ids_key = ids.iter().map(i64::to_string).collect::<Vec<_>>().join(",");
            let key = format!("wave:{}:{lead}:{west}:{south}:{ids_key}", run.timestamp());
            db.enqueue(
                &key,
                &JobSpec::Wave {
                    run,
                    lead,
                    west,
                    south,
                    spot_ids: ids.clone(),
                },
            )
            .await?;
            count += 1;
        }
    }
    Ok(count)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Field {
    Height,
    Period,
    Direction,
    WindWaveHeight,
    WindWavePeriod,
    WindWaveDirection,
    WindSpeed,
    WindDirection,
    SwellHeight,
    SwellPeriod,
    SwellDirection,
}
fn field(discipline: u8, category: u8, number: u8) -> Option<Field> {
    match (discipline, category, number) {
        (10, 0, 3) => Some(Field::Height),
        (10, 0, 11) => Some(Field::Period),
        (10, 0, 10) => Some(Field::Direction),
        (10, 0, 5) => Some(Field::WindWaveHeight),
        (10, 0, 6) => Some(Field::WindWavePeriod),
        (10, 0, 4) => Some(Field::WindWaveDirection),
        (0, 2, 1) => Some(Field::WindSpeed),
        (0, 2, 0) => Some(Field::WindDirection),
        (10, 0, 8) => Some(Field::SwellHeight),
        (10, 0, 9) => Some(Field::SwellPeriod),
        (10, 0, 7) => Some(Field::SwellDirection),
        _ => None,
    }
}
struct Grid {
    field: Field,
    coords: Vec<(f64, f64)>,
    values: Vec<f64>,
}

pub fn decode(
    bytes: &[u8],
    spots: &[Spot],
    run: DateTime<Utc>,
    lead: u16,
) -> Result<Vec<(i64, Forecast)>> {
    anyhow::ensure!(
        bytes.starts_with(b"GRIB") && bytes.ends_with(b"7777"),
        "NOAA response is not a complete GRIB2 file"
    );
    let grib = grib::from_reader(Cursor::new(bytes))?;
    let mut grids = Vec::new();
    for (_, message) in grib.iter() {
        let Some(field) = message
            .prod_def()
            .parameter_category()
            .zip(message.prod_def().parameter_number())
            .and_then(|(c, n)| field(message.indicator().discipline, c, n))
        else {
            continue;
        };
        let temporal = message.temporal_info();
        anyhow::ensure!(
            temporal.ref_time == Some(run)
                && temporal.forecast_time_target
                    == Some(run + chrono::Duration::hours(lead as i64)),
            "GRIB model time does not match the requested run and lead"
        );
        let coords: Vec<_> = message
            .latlons()?
            .map(|(lat, lon)| (lat, normalize_lon(lon)))
            .collect();
        anyhow::ensure!(
            coords.len() <= 200_000,
            "GRIB grid exceeds regional point limit"
        );
        let values = Grib2SubmessageDecoder::from(message)?
            .dispatch()?
            .map(|v| v as f64)
            .collect::<Vec<_>>();
        anyhow::ensure!(
            coords.len() == values.len(),
            "GRIB coordinate/value count mismatch"
        );
        grids.push(Grid {
            field,
            coords,
            values,
        });
    }
    let anchor = grids
        .iter()
        .find(|g| g.field == Field::Height)
        .context("GRIB contains no significant wave height")?;
    let mut rows = Vec::new();
    for spot in spots {
        let nearest = anchor
            .coords
            .iter()
            .zip(&anchor.values)
            .filter(|(_, v)| v.is_finite() && **v >= 0.0)
            .map(|(c, _)| (*c, distance_m((spot.latitude, spot.longitude), *c)))
            .min_by(|a, b| a.1.total_cmp(&b.1));
        let Some((coords, distance)) = nearest.filter(|(_, d)| *d <= 100_000.0) else {
            tracing::warn!(
                spot = spot.spot_name,
                "No ocean model point within 100 km; inland and lake locations are unsupported"
            );
            continue;
        };
        let mut waves = WaveFields::default();
        let (mut heights, mut periods, mut directions) = (Vec::new(), Vec::new(), Vec::new());
        for grid in &grids {
            let value = grid
                .coords
                .iter()
                .position(|c| (c.0 - coords.0).abs() < 0.00001 && (c.1 - coords.1).abs() < 0.00001)
                .map(|i| grid.values[i])
                .filter(|v| v.is_finite() && *v >= 0.0);
            match grid.field {
                Field::Height => waves.swh = value,
                Field::Period => waves.perpw = value,
                Field::Direction => waves.dirpw = value,
                Field::WindWaveHeight => waves.shww = value,
                Field::WindWavePeriod => waves.mpww = value,
                Field::WindWaveDirection => waves.wvdir = value,
                Field::WindSpeed => waves.ws = value,
                Field::WindDirection => waves.wdir = value,
                Field::SwellHeight => heights.push(value),
                Field::SwellPeriod => periods.push(value),
                Field::SwellDirection => directions.push(value),
            }
        }
        for i in 0..heights.len().max(periods.len()) {
            waves.swells.push(Swell {
                height: heights.get(i).copied().flatten(),
                period: periods.get(i).copied().flatten(),
                direction: directions.get(i).copied().flatten(),
            });
        }
        rows.push((
            spot.id,
            Forecast {
                time: run,
                valid_time: run + chrono::Duration::hours(lead as i64),
                latitude: coords.0,
                longitude: coords.1,
                distance,
                waves,
            },
        ));
    }
    Ok(rows)
}
