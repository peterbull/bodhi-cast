use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use bodhi_cast::{
    api::{AppState, router},
    auth::{GoogleAuth, csrf_token, hash_token},
    db::Db,
    model::NewSpot,
};
use http_body_util::BodyExt;
use std::sync::Arc;
use tower::ServiceExt;

pub async fn check_accounts(db: &Db) {
    let suffix = chrono::Utc::now().timestamp_nanos_opt().unwrap();
    let alice = db
        .sign_in_account(
            &format!("test-alice-{suffix}"),
            "alice@example.test",
            "Alice",
        )
        .await
        .unwrap();
    let bob = db
        .sign_in_account(&format!("test-bob-{suffix}"), "bob@example.test", "Bob")
        .await
        .unwrap();
    let again = db
        .sign_in_account(
            &format!("test-alice-{suffix}"),
            "new-alice@example.test",
            "Alice Updated",
        )
        .await
        .unwrap();
    assert_eq!(
        alice.id, again.id,
        "Google subject, not email, identifies the account"
    );
    assert_eq!(again.email, "new-alice@example.test");
    let public = db.spots_for(None).await.unwrap();
    let featured = public.iter().find(|s| s.watched).unwrap();
    db.set_personal_watch(alice.id, featured.id, false)
        .await
        .unwrap();
    assert!(
        !db.spot_for(featured.id, Some(alice.id))
            .await
            .unwrap()
            .unwrap()
            .watched
    );
    assert!(
        db.spot_for(featured.id, Some(bob.id))
            .await
            .unwrap()
            .unwrap()
            .watched
    );
    assert!(
        db.spot_for(featured.id, None)
            .await
            .unwrap()
            .unwrap()
            .watched
    );
    let duplicate = db
        .add_personal_spot(
            alice.id,
            &NewSpot {
                spot_name: featured.spot_name.clone(),
                street_address: String::new(),
                latitude: featured.latitude,
                longitude: featured.longitude,
            },
        )
        .await
        .unwrap();
    assert_eq!(duplicate.id, featured.id);
    let input = NewSpot {
        spot_name: format!("Private test {suffix}"),
        street_address: "Private coast".into(),
        latitude: 34.1,
        longitude: -119.3,
    };
    let private = db.add_personal_spot(alice.id, &input).await.unwrap();
    assert!(
        db.spots_for(Some(alice.id))
            .await
            .unwrap()
            .iter()
            .any(|s| s.id == private.id)
    );
    assert!(
        !db.spots_for(Some(bob.id))
            .await
            .unwrap()
            .iter()
            .any(|s| s.id == private.id)
    );
    assert!(db.spot_for(private.id, None).await.unwrap().is_none());
    assert!(
        db.set_personal_watch(bob.id, private.id, true)
            .await
            .unwrap()
            .is_none()
    );
    let bob_private = db.add_personal_spot(bob.id, &input).await.unwrap();
    assert_ne!(
        private.id, bob_private.id,
        "Private deduplication must not cross accounts"
    );
    assert!(
        db.watched()
            .await
            .unwrap()
            .iter()
            .any(|s| s.id == private.id),
        "The worker must load followed private spots"
    );

    let alice_token = "alice-test-session-with-at-least-32-characters";
    let bob_token = "bob-test-session-with-at-least-32-characters";
    db.create_session(alice.id, alice_token).await.unwrap();
    db.create_session(bob.id, bob_token).await.unwrap();
    let conn = db.pool.get().await.unwrap();
    assert_eq!(
        conn.query_one(
            "SELECT count(*) FROM bodhi.sessions WHERE token_hash=$1",
            &[&alice_token]
        )
        .await
        .unwrap()
        .get::<_, i64>(0),
        0,
        "Raw session credentials must not be stored"
    );
    drop(conn);
    let app = router(
        AppState {
            db: db.clone(),
            write_token: Some("old-server-token-must-not-work".into()),
            allow_writes: true,
            auth: Some(Arc::new(
                GoogleAuth::new(
                    "test-client".into(),
                    "test-secret".into(),
                    "https://bodhicast.com",
                )
                .unwrap(),
            )),
        },
        "../web/dist".into(),
    );
    for path in [
        format!("/api/spots/{}", private.id),
        format!("/api/spots/{}/forecasts", private.id),
        format!("/api/spots/{}/stations", private.id),
        format!("/spots/{}", private.id),
    ] {
        for token in [None, Some(bob_token)] {
            let mut req = Request::get(&path);
            if let Some(token) = token {
                req = req.header("cookie", format!("__Host-bodhi_session={token}"));
            }
            let res = app
                .clone()
                .oneshot(req.body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(
                res.status(),
                StatusCode::NOT_FOUND,
                "{path} must enforce ownership"
            );
            assert_eq!(res.headers().get("cache-control").unwrap(), "no-store");
        }
    }
    let res = app
        .clone()
        .oneshot(
            Request::get("/api/capabilities")
                .header("cookie", format!("__Host-bodhi_session={alice_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let json: serde_json::Value =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(json["user"]["id"], alice.id);
    assert_eq!(json["requires_token"], false);
    assert_eq!(json["can_retry_jobs"], false);
    assert_eq!(json["csrf_token"], csrf_token(alice_token));
    let watch_path = format!("/api/spots/{}/watch", featured.id);
    for (token, origin, csrf, expected) in [
        (
            None,
            Some("https://bodhicast.com"),
            Some(csrf_token(alice_token)),
            StatusCode::UNAUTHORIZED,
        ),
        (
            Some(alice_token),
            None,
            Some(csrf_token(alice_token)),
            StatusCode::FORBIDDEN,
        ),
        (
            Some(alice_token),
            Some("https://evil.example"),
            Some(csrf_token(alice_token)),
            StatusCode::FORBIDDEN,
        ),
        (
            Some(alice_token),
            Some("https://bodhicast.com"),
            None,
            StatusCode::FORBIDDEN,
        ),
        (
            Some(alice_token),
            Some("https://bodhicast.com"),
            Some(csrf_token(bob_token)),
            StatusCode::FORBIDDEN,
        ),
        (
            Some(alice_token),
            Some("https://bodhicast.com"),
            Some(csrf_token(alice_token)),
            StatusCode::OK,
        ),
    ] {
        let mut req = Request::put(&watch_path)
            .header("content-type", "application/json")
            .header("authorization", "Bearer old-server-token-must-not-work");
        if let Some(token) = token {
            req = req.header("cookie", format!("__Host-bodhi_session={token}"));
        }
        if let Some(origin) = origin {
            req = req.header("origin", origin);
        }
        if let Some(csrf) = csrf {
            req = req.header("x-csrf-token", csrf);
        }
        let res = app
            .clone()
            .oneshot(req.body(Body::from(r#"{"watched":false}"#)).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), expected);
    }
    let conn = db.pool.get().await.unwrap();
    conn.execute(
        "DELETE FROM bodhi.user_follows WHERE user_id=$1",
        &[&alice.id],
    )
    .await
    .unwrap();
    conn.execute("INSERT INTO bodhi.user_follows(user_id,spot_id) SELECT $1,id FROM bodhi.spots WHERE owner_user_id IS NULL ORDER BY id LIMIT 19",&[&alice.id]).await.unwrap();
    drop(conn);
    let candidates: Vec<_> = db
        .spots_for(Some(alice.id))
        .await
        .unwrap()
        .into_iter()
        .filter(|s| !s.watched)
        .take(8)
        .collect();
    let mut requests = tokio::task::JoinSet::new();
    for candidate in candidates {
        let db = db.clone();
        requests.spawn(async move { db.set_personal_watch(alice.id, candidate.id, true).await });
    }
    let mut successes = 0;
    while let Some(result) = requests.join_next().await {
        match result.unwrap() {
            Ok(Some(_)) => successes += 1,
            Err(e) if e.is::<bodhi_cast::db::FollowLimit>() => {}
            other => panic!("Unexpected follow result: {other:?}"),
        }
    }
    assert_eq!(
        successes, 1,
        "Concurrent requests must enforce the per-user cap"
    );
    assert!(
        db.spots_for(Some(bob.id))
            .await
            .unwrap()
            .iter()
            .filter(|s| s.watched)
            .count()
            < 20
    );

    let login_state = "single-use-login-state-long-enough-for-cookie";
    let conn = db.pool.get().await.unwrap();
    conn.execute("INSERT INTO bodhi.login_attempts(state_hash,nonce,pkce_verifier,return_path) VALUES($1,'test-nonce','test-verifier','/')",&[&hash_token(login_state)]).await.unwrap();
    drop(conn);
    for cookie in [
        "wrong-browser-state-long-enough-for-cookie",
        login_state,
        login_state,
    ] {
        let res = app
            .clone()
            .oneshot(
                Request::get(format!(
                    "/api/auth/google/callback?state={login_state}&error=access_denied"
                ))
                .header("cookie", format!("__Host-bodhi_login={cookie}"))
                .body(Body::empty())
                .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::SEE_OTHER);
        assert_eq!(
            res.headers().get("location").unwrap(),
            "/?auth_error=failed"
        );
        let count: i64 = db
            .pool
            .get()
            .await
            .unwrap()
            .query_one(
                "SELECT count(*) FROM bodhi.login_attempts WHERE state_hash=$1",
                &[&hash_token(login_state)],
            )
            .await
            .unwrap()
            .get(0);
        assert_eq!(
            count,
            if cookie == login_state { 0 } else { 1 },
            "A different browser must not consume the attempt; the matching callback is single use"
        );
    }
    let res = app
        .clone()
        .oneshot(
            Request::post("/api/auth/logout")
                .header("cookie", format!("__Host-bodhi_session={alice_token}"))
                .header("origin", "https://bodhicast.com")
                .header("x-csrf-token", csrf_token(alice_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let cleared = res.headers().get("set-cookie").unwrap().to_str().unwrap();
    assert!(
        cleared.contains("Max-Age=0") && cleared.contains("Secure") && cleared.contains("HttpOnly")
    );
    db.pool
        .get()
        .await
        .unwrap()
        .execute(
            "UPDATE bodhi.sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
            &[&bob.id],
        )
        .await
        .unwrap();
    for token in [alice_token, bob_token] {
        let res = app
            .clone()
            .oneshot(
                Request::get("/api/capabilities")
                    .header("cookie", format!("__Host-bodhi_session={token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let json: serde_json::Value =
            serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
        assert_eq!(
            json["can_write"], false,
            "Expired and signed-out sessions must not grant access"
        );
        assert_eq!(json["user"], serde_json::Value::Null);
    }
    let conn = db.pool.get().await.unwrap();
    for user in [alice.id, bob.id] {
        conn.execute("DELETE FROM bodhi.user_follows WHERE user_id=$1", &[&user])
            .await
            .unwrap();
        conn.execute("DELETE FROM bodhi.sessions WHERE user_id=$1", &[&user])
            .await
            .unwrap();
        conn.execute("DELETE FROM bodhi.spots WHERE owner_user_id=$1", &[&user])
            .await
            .unwrap();
        conn.execute("DELETE FROM bodhi.users WHERE id=$1", &[&user])
            .await
            .unwrap();
    }
}
