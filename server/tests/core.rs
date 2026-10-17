use bodhi_cast::{
    model::{NewSpot, Spot, distance_m, normalize_lon},
    noaa::{decode, forecast_leads, model_run, wave_url},
};
use chrono::{TimeZone, Utc};

fn virginia() -> Spot {
    Spot {
        id: 1,
        latitude: 36.83036135089083,
        longitude: -75.96648,
        spot_name: "1st Street Jetty".into(),
        street_address: "Virginia Beach".into(),
        watched: true,
    }
}

#[test]
fn decodes_real_noaa_regional_ensemble_mean() {
    let run = Utc.with_ymd_and_hms(2026, 10, 17, 0, 0, 0).unwrap();
    let rows = decode(
        include_bytes!("fixtures/virginia.grib2"),
        &[virginia()],
        run,
        6,
    )
    .unwrap();
    assert_eq!(rows.len(), 1);
    let point = &rows[0].1;
    assert!((point.waves.swh.unwrap() - 0.99).abs() < 0.00001);
    assert!((point.waves.perpw.unwrap() - 5.20).abs() < 0.00001);
    assert!((point.waves.dirpw.unwrap() - 122.83).abs() < 0.0001);
    assert!((point.waves.swells[0].height.unwrap() - 0.70).abs() < 0.00001);
    assert!((point.waves.swells[1].period.unwrap() - 7.07).abs() < 0.00001);
    assert!(point.distance < 50_000.0);
    assert!(point.waves.swh.unwrap() > 0.0 && point.waves.swh.unwrap() < 15.0);
    assert!(point.waves.perpw.unwrap() > 1.0);
    assert!(point.waves.ws.unwrap() >= 0.0);
    assert_eq!(point.waves.swells.len(), 2);
    assert_eq!(point.valid_time, run + chrono::Duration::hours(6));
}

#[test]
fn rejects_wrong_run_and_non_grib_bodies() {
    let run = Utc.with_ymd_and_hms(2026, 10, 17, 0, 0, 0).unwrap();
    assert!(decode(b"<html>Data unavailable</html>", &[virginia()], run, 6).is_err());
    assert!(
        decode(
            include_bytes!("fixtures/virginia.grib2"),
            &[virginia()],
            run,
            3
        )
        .is_err()
    );
    let mut lake = virginia();
    lake.latitude = 46.0;
    lake.longitude = -90.0;
    assert!(
        decode(include_bytes!("fixtures/virginia.grib2"), &[lake], run, 6)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn model_cycles_roll_over_in_utc() {
    let now = Utc.with_ymd_and_hms(2026, 1, 1, 2, 45, 0).unwrap();
    assert_eq!(
        model_run(now),
        Utc.with_ymd_and_hms(2025, 12, 31, 18, 0, 0).unwrap()
    );
    let url = wave_url(model_run(now), 72, -76, 36).unwrap();
    assert!(url.as_str().contains("f072.grib2"));
    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
    assert_eq!(params["dir"], "/gefs.20251231/18/wave/gridded");
    assert_eq!(params["leftlon"], "-77");
    assert_eq!(params["rightlon"], "-71");
    assert!(wave_url(model_run(now), 385, -76, 36).is_err());
    assert!(wave_url(model_run(now), 243, -76, 36).is_err());
    assert!(wave_url(model_run(now), 246, -76, 36).is_ok());
    let leads: Vec<_> = forecast_leads(384).collect();
    assert_eq!(leads.len(), 105);
    assert_eq!(leads.last(), Some(&384));
    assert!(!leads.contains(&243));
}

#[test]
fn coordinates_and_catalog_are_valid() {
    assert!((distance_m((0.0, 179.9), (0.0, -179.9)) - 22_239.0).abs() < 5.0);
    assert_eq!(normalize_lon(284.0), -76.0);
    let mut catalog: Vec<NewSpot> = serde_json::from_str(include_str!("../catalog.json")).unwrap();
    assert_eq!(catalog.len(), 1320);
    for spot in &mut catalog {
        spot.validate().unwrap();
    }
    let mut bad = NewSpot {
        latitude: f64::NAN,
        longitude: 0.0,
        spot_name: "Invalid".into(),
        street_address: "".into(),
    };
    assert!(bad.validate().is_err());
    bad.latitude = 0.0;
    bad.spot_name = "   ".into();
    assert!(bad.validate().is_err());
}
