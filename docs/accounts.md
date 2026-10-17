# Google sign-in

Bodhi Cast uses Google for identity only. The Rust app keeps account data and sessions in PostgreSQL. No Firebase, Identity Platform, or paid Google hosting is required.

## Google Cloud setup

Use project `bodhi-511921` in Google Auth Platform. Set the app name to Bodhi Cast, use the verified project owner's support address, and select External so other Google users can sign in. Configure the home page as `https://bodhicast.com/`, the privacy page as `https://bodhicast.com/privacy.html`, and the authorized domain as `bodhicast.com`.

Create an OAuth client of type Web application. Set the exact authorized redirect URI:

```
https://bodhicast.com/api/auth/google/callback
```

The app requests only `openid`, `email`, and `profile`. It uses a server redirect and does not need a JavaScript origin. Publish the audience when ready for public use; a Testing audience restricts access to configured test users. Google may require domain or branding verification in the console.

Download the web client JSON. Keep the client ID and secret in the ignored project `.env` with mode 600, plus `BODHI_GOOGLE_CLIENT_FILE=secrets/google-client.json` and the local `BODHI_PUBLIC_URL`. Keep a private JSON copy at `secrets/google-client.json` and install it at `/opt/bodhi-cast/secrets/google-client.json` on the droplet. Never commit it or put it in Terraform state. The droplet Compose file mounts this credential and sets `BODHI_PUBLIC_URL` from `BODHI_DOMAIN`.

For local Google sign-in, add a separate exact loopback redirect URI and run with a matching public URL. `http://127.0.0.1:8000/api/auth/google/callback` uses `--public-url http://127.0.0.1:8000`. Do not reuse production sessions in local tests.

## Account behavior

A Google subject identifier is the stable account key. Email changes do not create a second account. Each account gets its own follow list and private custom spots. The forecast worker fetches the union of followed locations and shares forecasts for public catalog spots. Anonymous visitors see the public catalog and featured spots.

The authorization-code flow uses PKCE, a browser-bound state cookie, a nonce, and verified Google ID tokens. Google access and refresh tokens are not stored. Opaque session tokens have 256 bits of randomness; only their SHA-256 hashes are stored in PostgreSQL. Sessions expire after 30 days and are limited to ten per account. Signing out invalidates the current session. HTTPS cookies use Secure, HttpOnly, SameSite=Lax, and the __Host- prefix. Loopback HTTP uses separate development cookie names.

Writes check both Origin and a session-bound CSRF token. All spot, forecast, and station routes check ownership. API responses use Cache-Control: no-store. Request logs omit query strings so OAuth codes are not logged. Sign-in errors are returned as generic messages.

## Deployment and recovery

Back up the database before the first account-enabled deployment. The migration preserves public spots, forecasts, and old follows. It adds users, private spot ownership, follows, sessions, and temporary login attempts. The old uniqueness constraint is replaced by public and per-owner indexes. A rollback to an older binary can read existing public data, but restoring its old editing behavior requires the pre-migration database backup. Do not restore over live account data without a recovery decision.

Without the Google client file, the droplet startup script stops and reports the missing file. Do not deploy this configuration until the credential is installed. A failure at Google affects sign-in; already signed-in users and public forecast browsing continue to work.

Run `cargo test --all-targets`, then the ignored PostGIS integration test with `BODHI_TEST_DATABASE_URL` pointing to a dedicated disposable database. It checks account isolation, private-ID access, follow limits, concurrent requests, CSRF, callback replay, session expiry, and logout. Real Google consent and the full callback still require a configured client and browser testing.
