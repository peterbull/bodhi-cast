#[path = "support/accounts.rs"]
mod accounts;
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use bodhi_cast::{
    api::{AppState, router},
    db::Db,
    model::{JobSpec, NewSpot},
    noaa::decode,
};
use chrono::{TimeZone, Utc};
use http_body_util::BodyExt;
use tower::ServiceExt;

#[tokio::test]
#[ignore = "requires a dedicated PostGIS database via BODHI_TEST_DATABASE_URL"]
async fn postgis_queue_forecasts_and_api_are_durable() {
    let url = std::env::var("BODHI_TEST_DATABASE_URL").expect("Set a dedicated test database URL");
    let db = Db::connect(&url).await.unwrap();
    db.migrate().await.unwrap();
    db.pool.get().await.unwrap().batch_execute("TRUNCATE bodhi.forecasts, bodhi.jobs, bodhi.stations; UPDATE bodhi.spots SET watched=false;").await.unwrap();
    let spots = db.spots().await.unwrap();
    assert!(spots.len() > 1300);
    db.migrate().await.unwrap();
    assert_eq!(spots.len(), db.spots().await.unwrap().len());
    let spot = spots
        .into_iter()
        .find(|s| s.spot_name == "1st Street Jetty")
        .unwrap();
    db.set_watch(spot.id, true).await.unwrap();
    let run = Utc.with_ymd_and_hms(2026, 10, 17, 0, 0, 0).unwrap();
    let mut rows = decode(
        include_bytes!("fixtures/virginia.grib2"),
        std::slice::from_ref(&spot),
        run,
        6,
    )
    .unwrap();
    rows[0].1.valid_time = Utc::now() + chrono::Duration::hours(3);
    db.save_forecasts(&rows).await.unwrap();
    db.save_forecasts(&rows).await.unwrap();
    assert_eq!(db.forecasts(spot.id).await.unwrap().len(), 1);
    let spec = JobSpec::Wave {
        run,
        lead: 6,
        west: -76,
        south: 36,
        spot_ids: vec![spot.id],
    };
    let key = format!("test:{}", Utc::now().timestamp_nanos_opt().unwrap());
    db.enqueue(&key, &spec).await.unwrap();
    db.enqueue(&key, &spec).await.unwrap();
    let (a, b) = tokio::join!(db.claim(), db.claim());
    let mut claimed = vec![a.unwrap(), b.unwrap()]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    assert_eq!(
        claimed.len(),
        1,
        "A job must not be claimed twice concurrently"
    );
    let job = claimed.pop().unwrap();
    assert_eq!(job.attempts, 1);
    db.finish(&job, Some("Simulated upstream timeout"))
        .await
        .unwrap();
    assert!(
        db.claim().await.unwrap().is_none(),
        "Retry must honor backoff"
    );
    db.pool
        .get()
        .await
        .unwrap()
        .execute(
            "UPDATE bodhi.jobs SET available_at=now() WHERE id=$1",
            &[&job.id],
        )
        .await
        .unwrap();
    let retried = db.claim().await.unwrap().unwrap();
    assert_eq!(retried.attempts, 2);
    let restarted = Db::connect(&url).await.unwrap();
    assert!(
        restarted.claim().await.unwrap().is_none(),
        "Restart must preserve active leases"
    );
    db.pool
        .get()
        .await
        .unwrap()
        .execute(
            "UPDATE bodhi.jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
            &[&job.id],
        )
        .await
        .unwrap();
    let recovered = restarted.claim().await.unwrap().unwrap();
    assert_eq!(recovered.attempts, 3);
    db.finish(&recovered, None).await.unwrap();
    assert!(db.claim().await.unwrap().is_none());
    db.enqueue(&format!("{key}:wave"), &spec).await.unwrap();
    db.enqueue(&format!("{key}:stations"), &JobSpec::Stations { bucket: 0 })
        .await
        .unwrap();
    let observations = db.claim().await.unwrap().unwrap();
    assert!(
        matches!(observations.spec, JobSpec::Stations { .. }),
        "Observations must not wait behind a long forecast backlog"
    );
    db.finish(&observations, None).await.unwrap();
    let wave = db.claim().await.unwrap().unwrap();
    assert!(matches!(wave.spec, JobSpec::Wave { .. }));
    db.finish(&wave, None).await.unwrap();
    let conn = db.pool.get().await.unwrap();
    conn.execute("INSERT INTO bodhi.stations(id,name,latitude,longitude) VALUES('test-station','Test buoy',36.84,-75.96) ON CONFLICT DO NOTHING",&[]).await.unwrap();
    drop(conn);
    let stations = db
        .stations(spot.latitude, spot.longitude, 20_000.0)
        .await
        .unwrap();
    assert!(
        stations
            .iter()
            .any(|s| s.id == "test-station" && s.distance < 2000.0)
    );
    assert!(
        db.stations(-40.0, 100.0, 20_000.0)
            .await
            .unwrap()
            .is_empty()
    );
    let token = "test-token-with-at-least-24-bytes";
    let state = AppState {
        db: db.clone(),
        write_token: Some(token.into()),
        allow_writes: false,
        auth: None,
    };
    let app = router(state, "../web/dist".into());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = serde_json::json!({"spot_name":"My test break","street_address":"Test","latitude":-23.2,"longitude":151.1});
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/spots")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/spots")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/spots/{}/forecasts", spot.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let json: serde_json::Value =
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(json["points"].as_array().unwrap().len(), 1);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/spots/9223372036854775807")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let bad = NewSpot {
        latitude: 1000.0,
        longitude: 0.0,
        spot_name: "bad".into(),
        street_address: "".into(),
    };
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/spots")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&bad).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let conn = db.pool.get().await.unwrap();
    conn.execute("UPDATE bodhi.spots SET watched=false", &[])
        .await
        .unwrap();
    conn.execute("UPDATE bodhi.spots SET watched=true WHERE id IN(SELECT id FROM bodhi.spots ORDER BY id LIMIT 20)",&[]).await.unwrap();
    drop(conn);
    assert!(
        db.add_spot(&NewSpot {
            latitude: 1.0,
            longitude: 2.0,
            spot_name: "Over capacity".into(),
            street_address: "".into()
        })
        .await
        .is_err()
    );

    let full = db.watched().await.unwrap();
    let original = &full[0];
    let duplicate = db
        .add_spot(&NewSpot {
            latitude: (original.latitude * 1e6).round() / 1e6,
            longitude: (original.longitude * 1e6).round() / 1e6,
            spot_name: original.spot_name.to_lowercase(),
            street_address: "".into(),
        })
        .await
        .unwrap();
    assert_eq!(
        duplicate.id, original.id,
        "Coordinate rounding must not create duplicate spots, even at capacity"
    );
    db.set_watch(original.id, false).await.unwrap();
    let candidates: Vec<_> = db
        .spots()
        .await
        .unwrap()
        .into_iter()
        .filter(|s| !s.watched)
        .take(8)
        .collect();
    let mut requests = tokio::task::JoinSet::new();
    for candidate in candidates {
        let app = app.clone();
        requests.spawn(async move {
            app.oneshot(
                Request::put(format!("/api/spots/{}/watch", candidate.id))
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {token}"))
                    .body(Body::from(r#"{"watched":true}"#))
                    .unwrap(),
            )
            .await
            .unwrap()
            .status()
        });
    }
    let mut successes = 0;
    while let Some(status) = requests.join_next().await {
        match status.unwrap() {
            StatusCode::OK => successes += 1,
            StatusCode::CONFLICT => {}
            other => panic!("Concurrent capacity check returned {other}"),
        }
    }
    assert_eq!(successes, 1);
    assert_eq!(db.watched().await.unwrap().len(), 20);
    db.pool
        .get()
        .await
        .unwrap()
        .execute("UPDATE bodhi.spots SET watched=false", &[])
        .await
        .unwrap();
    db.set_watch(spot.id, true).await.unwrap();
    accounts::check_accounts(&db).await;
}
