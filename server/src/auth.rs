use crate::{
    accounts::{Account, account},
    api::{ApiError, AppState},
    db::Db,
};
use anyhow::{Context, Result};
use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Redirect, Response},
};
use openidconnect::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce, PkceCodeChallenge,
    PkceCodeVerifier, RedirectUrl, Scope, TokenResponse,
    core::{CoreAuthenticationFlow, CoreClient, CoreProviderMetadata},
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{path::Path, time::Duration};
use tokio::sync::Semaphore;

#[derive(Deserialize)]
struct ClientFile {
    web: WebClient,
}
#[derive(Deserialize)]
struct WebClient {
    client_id: String,
    client_secret: String,
}

pub struct GoogleAuth {
    client_id: ClientId,
    client_secret: ClientSecret,
    redirect: RedirectUrl,
    origin: String,
    secure: bool,
    http: reqwest::Client,
    flows: Semaphore,
}

impl GoogleAuth {
    pub fn from_file(path: &Path, public_url: &str) -> Result<Self> {
        let file: ClientFile =
            serde_json::from_slice(&std::fs::read(path).context("Cannot read Google client file")?)
                .context("Expected a Google web application client JSON file")?;
        Self::new(file.web.client_id, file.web.client_secret, public_url)
    }

    pub fn new(client_id: String, client_secret: String, public_url: &str) -> Result<Self> {
        let url = reqwest::Url::parse(public_url).context("Invalid public URL")?;
        let secure = url.scheme() == "https";
        let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
        anyhow::ensure!(
            secure || (url.scheme() == "http" && local),
            "Google sign-in requires HTTPS or loopback HTTP"
        );
        anyhow::ensure!(
            url.path() == "/"
                && url.query().is_none()
                && url.fragment().is_none()
                && url.username().is_empty()
                && url.password().is_none(),
            "Public URL must contain only the origin"
        );
        anyhow::ensure!(
            !client_id.is_empty() && !client_secret.is_empty(),
            "Google client credentials are empty"
        );
        let origin = url.origin().ascii_serialization();
        Ok(Self {
            client_id: ClientId::new(client_id),
            client_secret: ClientSecret::new(client_secret),
            redirect: RedirectUrl::new(format!("{origin}/api/auth/google/callback"))?,
            origin,
            secure,
            http: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(15))
                .build()?,
            flows: Semaphore::new(4),
        })
    }
    fn cookie_name(&self, login: bool) -> &'static str {
        match (self.secure, login) {
            (true, false) => "__Host-bodhi_session",
            (true, true) => "__Host-bodhi_login",
            (false, false) => "bodhi_session",
            (false, true) => "bodhi_login",
        }
    }
    fn cookie(&self, login: bool, value: &str, age: u32) -> HeaderValue {
        HeaderValue::from_str(&format!(
            "{}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}{}",
            self.cookie_name(login),
            if self.secure { "; Secure" } else { "" }
        ))
        .expect("Generated cookie contains only URL-safe values")
    }
    async fn provider(&self) -> Result<CoreProviderMetadata> {
        Ok(CoreProviderMetadata::discover_async(
            IssuerUrl::new("https://accounts.google.com".into())?,
            &self.http,
        )
        .await?)
    }
}

fn random_token() -> CsrfToken {
    CsrfToken::new_random_len(32)
}

pub fn hash_token(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}
pub fn csrf_token(value: &str) -> String {
    hash_token(&format!("bodhi-csrf:{value}"))
}
fn equal(a: &str, b: &str) -> bool {
    a.len() == b.len()
        && a.bytes()
            .zip(b.bytes())
            .fold(0, |diff, (a, b)| diff | (a ^ b))
            == 0
}
fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    let mut values = headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(';'))
        .filter_map(|part| part.trim().split_once('='))
        .filter(|(key, _)| *key == name)
        .map(|(_, value)| value);
    let value = values.next()?;
    if values.next().is_some()
        || !(32..=128).contains(&value.len())
        || !value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return None;
    }
    Some(value)
}

pub struct Session {
    pub user: Account,
    pub csrf: String,
}
pub async fn session(state: &AppState, headers: &HeaderMap) -> Result<Option<Session>, ApiError> {
    let Some(auth) = &state.auth else {
        return Ok(None);
    };
    let Some(token) = cookie_value(headers, auth.cookie_name(false)) else {
        return Ok(None);
    };
    let user = state.db.pool.get().await.map_err(anyhow::Error::from)?.query_opt("SELECT u.* FROM bodhi.sessions s JOIN bodhi.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()", &[&hash_token(token)]).await.map_err(anyhow::Error::from)?;
    Ok(user.map(|row| Session {
        user: account(row),
        csrf: csrf_token(token),
    }))
}
pub async fn authorize(state: &AppState, headers: &HeaderMap) -> Result<Account, ApiError> {
    let auth = state.auth.as_ref().ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "Sign in to edit your spots".into(),
        )
    })?;
    let session = session(state, headers).await?.ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "Your session ended. Sign in again to save changes.".into(),
        )
    })?;
    let origin = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok());
    let csrf = headers
        .get("x-csrf-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    if origin != Some(auth.origin.as_str()) || !equal(csrf, &session.csrf) {
        return Err(ApiError(
            StatusCode::FORBIDDEN,
            "Refresh the page before saving changes.".into(),
        ));
    }
    Ok(session.user)
}

#[derive(Deserialize)]
pub struct LoginQuery {
    spot: Option<i64>,
}
pub async fn login(State(state): State<AppState>, Query(query): Query<LoginQuery>) -> Response {
    match begin_login(&state, query).await {
        Ok(response) => response,
        Err(_) => {
            tracing::warn!("Google sign-in could not start");
            Redirect::to("/?auth_error=unavailable").into_response()
        }
    }
}
async fn begin_login(state: &AppState, query: LoginQuery) -> Result<Response> {
    let auth = state.auth.as_ref().context("Sign-in is unavailable")?;
    let _permit = auth.flows.try_acquire().context("Sign-in is busy")?;
    let client = CoreClient::from_provider_metadata(
        auth.provider().await?,
        auth.client_id.clone(),
        Some(auth.client_secret.clone()),
    )
    .set_redirect_uri(auth.redirect.clone());
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let (url, csrf, nonce) = client
        .authorize_url(
            CoreAuthenticationFlow::AuthorizationCode,
            random_token,
            Nonce::new_random,
        )
        .add_scope(Scope::new("email".into()))
        .add_scope(Scope::new("profile".into()))
        .set_pkce_challenge(challenge)
        .url();
    let return_path = query
        .spot
        .filter(|id| *id > 0)
        .map_or_else(|| "/".into(), |id| format!("/?spot={id}"));
    let mut conn = state.db.pool.get().await?;
    let tx = conn.transaction().await?;
    tx.execute("SELECT pg_advisory_xact_lock(76249103)", &[])
        .await?;
    tx.execute(
        "DELETE FROM bodhi.login_attempts WHERE expires_at<=now()",
        &[],
    )
    .await?;
    let count: i64 = tx
        .query_one("SELECT count(*) FROM bodhi.login_attempts", &[])
        .await?
        .get(0);
    anyhow::ensure!(count < 1000, "Sign-in queue is full");
    tx.execute("INSERT INTO bodhi.login_attempts(state_hash,nonce,pkce_verifier,return_path) VALUES($1,$2,$3,$4)", &[&hash_token(csrf.secret()),nonce.secret(),verifier.secret(),&return_path]).await?;
    tx.commit().await?;
    let mut response = Redirect::to(url.as_str()).into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, auth.cookie(true, csrf.secret(), 900));
    Ok(response)
}

#[derive(Deserialize)]
pub struct CallbackQuery {
    state: Option<String>,
    code: Option<String>,
    error: Option<String>,
}
pub async fn callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<CallbackQuery>,
) -> Response {
    let mut response = match finish_login(&state, &headers, query).await {
        Ok(response) => response,
        Err(_) => {
            tracing::warn!("Google sign-in was cancelled or failed verification");
            Redirect::to("/?auth_error=failed").into_response()
        }
    };
    if let Some(auth) = &state.auth {
        response
            .headers_mut()
            .append(header::SET_COOKIE, auth.cookie(true, "", 0));
    }
    response
}
async fn finish_login(
    state: &AppState,
    headers: &HeaderMap,
    query: CallbackQuery,
) -> Result<Response> {
    let auth = state.auth.as_ref().context("Sign-in is unavailable")?;
    let _permit = auth.flows.try_acquire().context("Sign-in is busy")?;
    let actual = query.state.context("Missing login state")?;
    let expected = cookie_value(headers, auth.cookie_name(true)).context("Missing login cookie")?;
    anyhow::ensure!(
        equal(&actual, expected),
        "Login state does not match this browser"
    );
    let row = state.db.pool.get().await?.query_opt("DELETE FROM bodhi.login_attempts WHERE state_hash=$1 AND expires_at>now() RETURNING nonce,pkce_verifier,return_path", &[&hash_token(&actual)]).await?.context("Login expired or already used")?;
    anyhow::ensure!(query.error.is_none(), "Google sign-in was declined");
    let code = query.code.context("Missing authorization code")?;
    anyhow::ensure!(code.len() <= 4096, "Invalid authorization code");
    let client = CoreClient::from_provider_metadata(
        auth.provider().await?,
        auth.client_id.clone(),
        Some(auth.client_secret.clone()),
    )
    .set_redirect_uri(auth.redirect.clone());
    let tokens = client
        .exchange_code(AuthorizationCode::new(code))?
        .set_pkce_verifier(PkceCodeVerifier::new(row.get("pkce_verifier")))
        .request_async(&auth.http)
        .await?;
    let nonce = Nonce::new(row.get("nonce"));
    let claims = tokens
        .id_token()
        .context("Missing ID token")?
        .claims(&client.id_token_verifier(), &nonce)?;
    anyhow::ensure!(
        claims.email_verified() == Some(true),
        "Google email is not verified"
    );
    let email = claims.email().context("Google email is missing")?.as_str();
    let name = claims
        .name()
        .and_then(|names| names.get(None))
        .map(|name| name.as_str())
        .unwrap_or(email);
    let name: String = name.chars().take(200).collect();
    let user = state
        .db
        .sign_in_account(claims.subject().as_str(), email, &name)
        .await?;
    let token = random_token();
    state.db.create_session(user.id, token.secret()).await?;
    if let Some(old) = cookie_value(headers, auth.cookie_name(false)) {
        state
            .db
            .pool
            .get()
            .await?
            .execute(
                "DELETE FROM bodhi.sessions WHERE token_hash=$1",
                &[&hash_token(old)],
            )
            .await?;
    }
    let mut response = Redirect::to(row.get("return_path")).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        auth.cookie(false, token.secret(), 30 * 24 * 60 * 60),
    );
    Ok(response)
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    authorize(&state, &headers).await?;
    let auth = state.auth.as_ref().expect("Authorized Google session");
    if let Some(token) = cookie_value(&headers, auth.cookie_name(false)) {
        state
            .db
            .pool
            .get()
            .await
            .map_err(anyhow::Error::from)?
            .execute(
                "DELETE FROM bodhi.sessions WHERE token_hash=$1",
                &[&hash_token(token)],
            )
            .await
            .map_err(anyhow::Error::from)?;
    }
    let mut response = Json(serde_json::json!({"signed_out":true})).into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, auth.cookie(false, "", 0));
    Ok(response)
}

impl Db {
    pub async fn create_session(&self, user_id: i64, token: &str) -> Result<()> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.query_one(
            "SELECT id FROM bodhi.users WHERE id=$1 FOR UPDATE",
            &[&user_id],
        )
        .await?;
        tx.execute("DELETE FROM bodhi.sessions WHERE user_id=$1 AND (expires_at<=now() OR token_hash IN (SELECT token_hash FROM bodhi.sessions WHERE user_id=$1 ORDER BY expires_at DESC OFFSET 9))", &[&user_id]).await?;
        tx.execute(
            "INSERT INTO bodhi.sessions(token_hash,user_id) VALUES($1,$2)",
            &[&hash_token(token), &user_id],
        )
        .await?;
        tx.commit().await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn generated_credentials_round_trip_through_cookie_validation() {
        for origin in ["https://bodhicast.com", "http://127.0.0.1:8000"] {
            let auth = GoogleAuth::new("test-client".into(), "test-secret".into(), origin).unwrap();
            for login in [false, true] {
                let token = random_token();
                let mut headers = HeaderMap::new();
                headers.insert(
                    header::COOKIE,
                    HeaderValue::from_str(&format!(
                        "{}={}",
                        auth.cookie_name(login),
                        token.secret()
                    ))
                    .unwrap(),
                );
                assert_eq!(
                    cookie_value(&headers, auth.cookie_name(login)),
                    Some(token.secret().as_str())
                );
                let cookie = auth.cookie(login, token.secret(), 900);
                let cookie = cookie.to_str().unwrap();
                assert!(
                    cookie.contains("HttpOnly")
                        && cookie.contains("SameSite=Lax")
                        && cookie.contains("Path=/")
                );
                assert_eq!(cookie.contains("Secure"), origin.starts_with("https:"));
                headers.append(header::COOKIE, headers.get(header::COOKIE).unwrap().clone());
                assert!(
                    cookie_value(&headers, auth.cookie_name(login)).is_none(),
                    "Ambiguous duplicate cookies are rejected"
                );
            }
        }
    }
    #[test]
    fn public_url_requires_a_secure_origin() {
        for invalid in [
            "http://bodhicast.com",
            "https://bodhicast.com/path",
            "https://user:password@bodhicast.com",
            "https://bodhicast.com/?redirect=evil",
        ] {
            assert!(GoogleAuth::new("test-client".into(), "test-secret".into(), invalid).is_err());
        }
    }
}
