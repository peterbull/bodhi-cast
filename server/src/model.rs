use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Spot {
    pub id: i64,
    pub latitude: f64,
    pub longitude: f64,
    pub spot_name: String,
    pub street_address: String,
    pub watched: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSpot {
    #[serde(alias = "lat")]
    pub latitude: f64,
    #[serde(alias = "lng")]
    pub longitude: f64,
    pub spot_name: String,
    #[serde(default)]
    pub street_address: String,
}

impl NewSpot {
    pub fn validate(&mut self) -> anyhow::Result<()> {
        validate_coordinates(self.latitude, self.longitude)?;
        self.spot_name = self.spot_name.trim().to_owned();
        self.street_address = self.street_address.trim().to_owned();
        anyhow::ensure!(
            !self.spot_name.is_empty() && self.spot_name.len() <= 160,
            "Spot name must contain 1–160 bytes"
        );
        anyhow::ensure!(
            self.street_address.len() <= 240,
            "Address must contain at most 240 bytes"
        );
        Ok(())
    }
}

pub fn validate_coordinates(lat: f64, lon: f64) -> anyhow::Result<()> {
    anyhow::ensure!(
        lat.is_finite()
            && lon.is_finite()
            && (-90.0..=90.0).contains(&lat)
            && (-180.0..=180.0).contains(&lon),
        "Latitude must be between -90 and 90, longitude between -180 and 180"
    );
    Ok(())
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Swell {
    pub height: Option<f64>,
    pub period: Option<f64>,
    pub direction: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WaveFields {
    pub swh: Option<f64>,
    pub perpw: Option<f64>,
    pub dirpw: Option<f64>,
    pub shww: Option<f64>,
    pub mpww: Option<f64>,
    pub wvdir: Option<f64>,
    pub ws: Option<f64>,
    pub wdir: Option<f64>,
    pub swells: Vec<Swell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Forecast {
    pub time: DateTime<Utc>,
    pub valid_time: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub distance: f64,
    #[serde(flatten)]
    pub waves: WaveFields,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Station {
    pub id: String,
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub distance: f64,
    pub observations: serde_json::Value,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum JobSpec {
    Wave {
        run: DateTime<Utc>,
        lead: u16,
        west: i16,
        south: i16,
        spot_ids: Vec<i64>,
    },
    Stations {
        bucket: i64,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct Job {
    pub id: i64,
    pub spec: JobSpec,
    pub attempts: i32,
}

pub fn distance_m(a: (f64, f64), b: (f64, f64)) -> f64 {
    let (lat1, lat2) = (a.0.to_radians(), b.0.to_radians());
    let dlat = lat2 - lat1;
    let dlon = (b.1 - a.1).to_radians();
    let hav = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlon / 2.0).sin().powi(2);
    12_742_000.0 * hav.clamp(0.0, 1.0).sqrt().asin()
}

pub fn normalize_lon(lon: f64) -> f64 {
    (lon + 180.0).rem_euclid(360.0) - 180.0
}
