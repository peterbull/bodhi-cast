import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  compass,
  dayKey,
  height,
  number,
  speed,
  matchesSpot,
  readSpotId,
  resolveSpot,
  waveRange,
  readUnitPreference,
} from "./format";
import { request } from "./api";
import SpotMap from "./Map";
import Wave from "./Wave";
import type {
  Capabilities,
  ForecastResponse,
  Spot,
  Station,
  Status,
  Units,
} from "./types";

const date = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(undefined, options).format(new Date(value));
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

function Direction({ value }: { value: number | null | undefined }) {
  return (
    <span className="direction">
      {value != null && (
        <span
          className="direction-arrow"
          style={{ transform: `rotate(${value + 180}deg)` }}
          aria-hidden="true"
        >
          ↑
        </span>
      )}
      {compass(value)}
    </span>
  );
}
function Logo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="currentColor" />
      <path
        d="M8 29c9 4 12-14 23-12-7 4-5 11 7 10M8 35h30"
        stroke="#faf8f1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function App() {
  const [initialPreference] = useState(readUnitPreference);
  const [spots, setSpots] = useState<Spot[]>([]),
    [status, setStatus] = useState<Status>(),
    [caps, setCaps] = useState<Capabilities>();
  const [authNotice, setAuthNotice] = useState(() =>
    new URLSearchParams(location.search).has("auth_error")
      ? "Google sign-in did not finish. Please try again."
      : "",
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState("");
  const [requestedId, setRequestedId] = useState(() =>
    readSpotId(location.search),
  );
  const [query, setQuery] = useState(""),
    [listMode, setListMode] = useState<"all" | "following" | null>(null);
  const [page, setPage] = useState(0);
  const [statusError, setStatusError] = useState("");
  const [capsError, setCapsError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [linkNotice, setLinkNotice] = useState("");
  const [forecastRefresh, setForecastRefresh] = useState(0);
  const [unitNotice, setUnitNotice] = useState(initialPreference.notice);
  const [units, setUnits] = useState<Units>(initialPreference.units);
  const changeUnits = (value: Units) => {
    setUnits(value);
    try {
      localStorage.setItem("bodhi.units", value);
      setUnitNotice("");
    } catch {
      setUnitNotice(
        "Your unit preference will apply for this visit; browser storage is unavailable.",
      );
    }
  };
  const [forecastState, setForecast] = useState<{
      spotId: number;
      data: ForecastResponse;
    }>(),
    [stationState, setStations] = useState<{
      spotId: number;
      data: Station[];
    }>(),
    [forecastError, setForecastError] = useState(""),
    [stationsError, setStationsError] = useState("");
  const [selectedTime, setSelectedTime] = useState(""),
    [selectedDay, setSelectedDay] = useState("");
  const [draft, setDraft] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null),
    [showUnlock, setShowUnlock] = useState(false);
  const selected = resolveSpot(spots, requestedId);
  const selectedId = selected?.id ?? 0;
  const signInUrl = `/api/auth/google${selectedId ? `?spot=${selectedId}` : ""}`;
  const writeHeaders = () =>
    caps?.csrf_token ? { "X-CSRF-Token": caps.csrf_token } : undefined;
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.has("auth_error")) {
      url.searchParams.delete("auth_error");
      history.replaceState(null, "", url);
    }
  }, []);
  const forecast =
    forecastState?.spotId === selectedId ? forecastState.data : undefined;
  const stations = stationState?.spotId === selectedId ? stationState.data : [];
  const following = spots.filter((s) => s.watched);
  const activeMode = listMode ?? (following.length ? "following" : "all");
  const visible = spots.filter(
    (s) => (activeMode === "all" || s.watched) && matchesSpot(s, query),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / 24));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSpots = visible.slice(currentPage * 24, (currentPage + 1) * 24);
  const chooseMode = (mode: "all" | "following") => {
    setListMode(mode);
    setPage(0);
  };
  const searchSpots = (value: string) => {
    setQuery(value);
    setPage(0);
    if (value.trim()) setListMode("all");
  };
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const catalogRequest = request<Spot[]>("/spots", {}, token, signal).then(
        (nextSpots) => {
          if (signal?.aborted) return;
          setSpots(nextSpots);
          setListMode(
            (mode) =>
              mode ??
              (nextSpots.some((spot) => spot.watched) ? "following" : "all"),
          );
          setCatalogLoaded(true);
          setError("");
        },
      );
      const statusRequest = request<Status>("/status", {}, token, signal)
        .then((nextStatus) => {
          if (!signal?.aborted) {
            setStatus(nextStatus);
            setStatusError("");
          }
        })
        .catch(() => {
          if (!signal?.aborted)
            setStatusError(
              "Update status is temporarily unavailable. Browsing and forecasts still work.",
            );
        });
      const capsRequest = request<Capabilities>(
        "/capabilities",
        {},
        token,
        signal,
      )
        .then((nextCaps) => {
          if (!signal?.aborted) {
            setCaps(nextCaps);
            setCapsError("");
          }
        })
        .catch(() => {
          if (!signal?.aborted)
            setCapsError(
              "Editing status is unavailable. You can still browse forecasts.",
            );
        });
      await Promise.all([catalogRequest, statusRequest, capsRequest]);
    },
    [token],
  );
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void load(controller.signal).catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    const onPop = () => setRequestedId(readSpotId(location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (
      !catalogLoaded ||
      !selectedId ||
      !new URLSearchParams(location.search).has("spot")
    )
      return;
    if (requestedId === selectedId) return;
    setLinkNotice(
      "That spot could not be found. Showing a saved spot instead.",
    );
    const url = new URL(location.href);
    url.searchParams.set("spot", String(selectedId));
    history.replaceState(null, "", url);
    setRequestedId(selectedId);
  }, [catalogLoaded, requestedId, selectedId]);
  const select = useCallback((id: number) => {
    setRequestedId(id);
    setLinkNotice("");
    const url = new URL(location.href);
    url.searchParams.set("spot", String(id));
    if (url.href !== location.href) history.pushState(null, "", url);
    if (window.matchMedia("(max-width: 700px)").matches) {
      requestAnimationFrame(() =>
        document.getElementById("spot-forecast")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      );
    }
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setForecast((previous) =>
      previous?.spotId === selectedId ? previous : undefined,
    );
    setStations((previous) =>
      previous?.spotId === selectedId ? previous : undefined,
    );
    setForecastError("");
    setStationsError("");
    const refresh = () => {
      void request<ForecastResponse>(
        `/spots/${selectedId}/forecasts`,
        {},
        "",
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setForecast({ spotId: selectedId, data });
            setForecastError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setForecastError(message(e));
        });
      void request<Station[]>(
        `/spots/${selectedId}/stations`,
        {},
        "",
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setStations({ spotId: selectedId, data });
            setStationsError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setStationsError(message(e));
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [selectedId, forecastRefresh]);
  useEffect(() => {
    setSelectedTime("");
    setSelectedDay("");
  }, [selectedId]);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    setMutationError("");
    try {
      await action();
      await load();
    } catch (e) {
      setMutationError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const points = forecast?.points ?? [];
  const days = [...new Set(points.map((p) => dayKey(p.valid_time)))];
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const dayPoints = points.filter((p) => dayKey(p.valid_time) === activeDay);
  const point =
    dayPoints.find((p) => p.valid_time === selectedTime) ??
    dayPoints.find((p) => Date.parse(p.valid_time) >= Date.now()) ??
    dayPoints[0];
  const pending = status?.jobs.find((j) => j.status === "pending")?.count ?? 0;
  const failed = status?.jobs.find((j) => j.status === "failed")?.count ?? 0;
  const heightUnit = units === "imperial" ? "ft" : "m",
    windUnit = units === "imperial" ? "kn" : "m/s";
  const addAt = useCallback((latitude: number, longitude: number) => {
    setDraft({
      latitude,
      longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
    });
  }, []);
  return (
    <>
      <a className="skip-link" href="#spot-forecast">
        Skip to forecast
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Bodhi Cast home">
          <Logo />
          <span>
            BODHI<span className="brand-light">CAST</span>
            <small>WAVES · WIND · TIDES</small>
          </span>
        </a>
        <div className="header-right">
          <span className="live-status">
            <i className={error ? "offline" : ""} />
            {error
              ? "Connection interrupted"
              : pending
                ? "Updating forecasts"
                : "Ocean outlook"}
          </span>
          <div
            className="unit-switch"
            role="group"
            aria-label="Measurement units"
          >
            <button
              aria-pressed={units === "imperial"}
              onClick={() => changeUnits("imperial")}
            >
              ft / kn
            </button>
            <button
              aria-pressed={units === "metric"}
              onClick={() => changeUnits("metric")}
            >
              m / m/s
            </button>
          </div>
          {caps?.google_sign_in &&
            (caps.user ? (
              <details className="account-menu">
                <summary>{caps.user.name || "Your account"}</summary>
                <div className="account-popover">
                  <span>{caps.user.email}</span>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void mutate(async () => {
                        await request("/auth/logout", {
                          method: "POST",
                          headers: writeHeaders(),
                        });
                        location.replace("/");
                      })
                    }
                  >
                    Sign out
                  </button>
                </div>
              </details>
            ) : (
              <a className="sign-in-button" href={signInUrl}>
                Sign in with Google
              </a>
            ))}
          {caps?.requires_token && !caps.can_write && (
            <button className="text-button" onClick={() => setShowUnlock(true)}>
              Unlock editing
            </button>
          )}
        </div>
      </header>
      {authNotice && (
        <div className="alert" role="alert">
          {authNotice}
          <button onClick={() => setAuthNotice("")}>Dismiss</button>
        </div>
      )}
      {error && (
        <div className="alert" role="alert">
          {error}
          <button
            onClick={() => void load().catch((e) => setError(message(e)))}
          >
            Try again
          </button>
        </div>
      )}
      {mutationError && (
        <div className="alert" role="alert">
          {mutationError}
          <button onClick={() => setMutationError("")}>Dismiss</button>
        </div>
      )}
      {(statusError || capsError || unitNotice || linkNotice) && (
        <div className="service-notice" role="status">
          {[statusError, capsError, unitNotice, linkNotice]
            .filter(Boolean)
            .join(" ")}
        </div>
      )}
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <span className="eyebrow">SURF FORECAST</span>
            <h1>Find a spot.</h1>
            <p>Wave forecasts and coastal observations.</p>
          </div>
          <div className="spot-tools">
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search surf spots"
                placeholder="Search a spot or coastline…"
                value={query}
                onChange={(e) => searchSpots(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => searchSpots("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>
            <div className="list-tabs" role="group" aria-label="Spot filter">
              <button
                aria-pressed={activeMode === "all"}
                onClick={() => chooseMode("all")}
              >
                Explore <span>{spots.length.toLocaleString()}</span>
              </button>
              <button
                aria-pressed={activeMode === "following"}
                onClick={() => chooseMode("following")}
              >
                {caps?.google_sign_in && !caps.user ? "Featured" : "Following"}{" "}
                <span>{following.length}</span>
              </button>
            </div>
          </div>
          <div className="spot-list" aria-label="Surf spots">
            {visible.length === 0 ? (
              <p className="list-empty">
                {!catalogLoaded
                  ? error
                    ? "Spots are unavailable. Retry the connection above."
                    : "Loading surf spots…"
                  : query
                    ? "No spots match your search. Try a town, coastline, or shorter name."
                    : "Follow a spot to keep its forecast close."}
                {catalogLoaded && activeMode === "following" && !query && (
                  <button
                    className="text-button"
                    onClick={() => chooseMode("all")}
                  >
                    Explore all spots
                  </button>
                )}
              </p>
            ) : (
              pageSpots.map((s) => (
                <button
                  key={s.id}
                  className={`spot-card ${s.id === selectedId ? "selected" : ""}`}
                  onClick={() => select(s.id)}
                  aria-pressed={s.id === selectedId}
                >
                  <span className="spot-dot" aria-hidden="true">
                    {s.watched ? "●" : "○"}
                  </span>
                  <span>
                    <strong>{s.spot_name}</strong>
                    <small>
                      {s.street_address ||
                        `${s.latitude.toFixed(2)}°, ${s.longitude.toFixed(2)}°`}
                    </small>
                  </span>
                  <span className="spot-chevron" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))
            )}
          </div>
          {pageCount > 1 && (
            <nav className="spot-pagination" aria-label="Spot result pages">
              <button
                disabled={currentPage === 0}
                aria-label="Previous spots"
                onClick={() => setPage(currentPage - 1)}
              >
                ←
              </button>
              <span role="status">
                {currentPage * 24 + 1}–
                {Math.min((currentPage + 1) * 24, visible.length)} of{" "}
                {visible.length}
              </span>
              <button
                disabled={currentPage === pageCount - 1}
                aria-label="Next spots"
                onClick={() => setPage(currentPage + 1)}
              >
                →
              </button>
            </nav>
          )}
          <div className="sidebar-footer">
            <button
              className="add-spot"
              disabled={!caps?.can_write}
              onClick={() =>
                setDraft({
                  latitude: selected?.latitude ?? 36.83,
                  longitude: selected?.longitude ?? -75.97,
                })
              }
            >
              ＋ Add a surf spot
            </button>
            <small>
              {caps?.can_write
                ? caps?.user
                  ? "Your custom spots are private. Click the map to add one."
                  : "Or click anywhere on the map."
                : caps?.google_sign_in
                  ? "Sign in to save your spots."
                  : "Browsing only."}
            </small>
          </div>
        </aside>
        <section className="main-panel" aria-label="Selected surf spot">
          <div className="map-wrap">
            <SpotMap
              spots={spots}
              selected={selected}
              onSelect={select}
              onAdd={caps?.can_write ? addAt : undefined}
            />
            <div className="map-badge">
              <span className="eyebrow">SURF SPOTS</span>
              <span>{spots.length.toLocaleString()} spots worldwide</span>
            </div>
            <div className="map-coordinates">
              {selected
                ? `${Math.abs(selected.latitude).toFixed(3)}° ${selected.latitude >= 0 ? "N" : "S"}  /  ${Math.abs(selected.longitude).toFixed(3)}° ${selected.longitude >= 0 ? "E" : "W"}`
                : "EXPLORE THE COAST"}
            </div>
          </div>
          <div className="forecast-content" id="spot-forecast" tabIndex={-1}>
            <div className="spot-heading">
              <div>
                <div className="eyebrow location-label">
                  {selected?.street_address || "SELECT A SPOT"}
                </div>
                <h2>
                  {selected?.spot_name ??
                    (error
                      ? "Spots are unavailable"
                      : catalogLoaded
                        ? "Add your first surf spot"
                        : "Loading spots…")}
                </h2>
              </div>
              {selected && (
                <button
                  className={`follow-button ${selected.watched ? "is-following" : ""}`}
                  disabled={(!caps?.can_write && !caps?.google_sign_in) || busy}
                  onClick={() => {
                    if (!caps?.can_write && caps?.google_sign_in) {
                      location.assign(signInUrl);
                      return;
                    }
                    void mutate(() =>
                      request(
                        `/spots/${selected.id}/watch`,
                        {
                          method: "PUT",
                          body: JSON.stringify({ watched: !selected.watched }),
                          headers: writeHeaders(),
                        },
                        token,
                      ),
                    );
                  }}
                >
                  {caps?.google_sign_in && !caps.user
                    ? "Sign in to follow"
                    : selected.watched
                      ? "✓ Following"
                      : "+ Follow spot"}
                </button>
              )}
            </div>
            <div className="forecast-meta">
              <span>
                {forecast?.source ?? "NOAA GEFS Wave · ensemble mean · 0.25°"}
              </span>
              <span>
                {point
                  ? `Model ${date(point.time, { month: "short", day: "numeric", hour: "numeric", timeZone: "UTC" })} UTC`
                  : "Forecasts are fetched for followed spots"}
              </span>
            </div>
            {forecastError && forecast && (
              <div className="notice" role="status">
                We couldn’t refresh this outlook. The last loaded forecast
                remains below; check its model time.
              </div>
            )}
            {forecastError && !forecast ? (
              <div className="empty-state" role="alert">
                <strong>We couldn’t load this forecast.</strong>
                <p>{forecastError}</p>
                <button
                  className="outline-button"
                  onClick={() => setForecastRefresh((v) => v + 1)}
                >
                  Retry forecast
                </button>
              </div>
            ) : !selected ? (
              <div className="empty-state" role="status">
                {error
                  ? "Use Try again above to load spots."
                  : catalogLoaded
                    ? "Add a surf spot to get started."
                    : "Loading spots…"}
              </div>
            ) : !forecast ? (
              <div className="empty-state" role="status">
                Loading forecast…
              </div>
            ) : points.length === 0 ? (
              <div className="empty-state">
                <span className="empty-wave">∿</span>
                <strong>
                  {selected?.watched ? "Forecast pending" : "No forecast yet"}
                </strong>
                <p>
                  {selected?.watched
                    ? "Downloading the NOAA forecast. The first points should arrive in a few minutes. Inland spots may have no coverage."
                    : "Follow this spot to load its forecast."}
                </p>
                {!caps?.can_write && (
                  <small>
                    {caps?.google_sign_in ? (
                      <a href={signInUrl}>Sign in to follow this spot.</a>
                    ) : (
                      "Editing is unavailable."
                    )}
                  </small>
                )}
              </div>
            ) : (
              <>
                {forecast.stale && (
                  <div className="notice" role="status">
                    This forecast uses an older model run. Check the model time
                    before planning a session.
                  </div>
                )}
                <div
                  className="day-tabs"
                  role="group"
                  aria-label="Forecast day"
                >
                  {days.map((day) => {
                    const representative = points.find(
                      (p) => dayKey(p.valid_time) === day,
                    )!;
                    return (
                      <button
                        key={day}
                        aria-pressed={day === activeDay}
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedTime("");
                        }}
                      >
                        <strong>
                          {date(representative.valid_time, {
                            weekday: "short",
                          })}
                        </strong>
                        <span>
                          {date(representative.valid_time, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="day-range">
                          {waveRange(
                            points.filter((p) => dayKey(p.valid_time) === day),
                            units,
                          )}{" "}
                          {heightUnit}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="conditions-grid">
                  <div className="conditions">
                    <div className="eyebrow">
                      {point &&
                        date(point.valid_time, {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZoneName: "short",
                        })}
                    </div>
                    <div className="wave-height">
                      {height(point?.swh, units)}
                      <span>{heightUnit}</span>
                    </div>
                    <p className="wave-description">
                      Combined sea height <span>· open ocean</span>
                    </p>
                    <div className="condition-stats">
                      <div>
                        <span>Wave period</span>
                        <strong>
                          {number(point?.perpw)} <small>s</small>
                        </strong>
                      </div>
                      <div>
                        <span>Wave direction</span>
                        <strong>
                          <Direction value={point?.dirpw} />
                        </strong>
                      </div>
                      <div>
                        <span>Wind</span>
                        <strong>
                          {speed(point?.ws, units)} <small>{windUnit}</small>
                        </strong>
                      </div>
                    </div>
                  </div>
                  <Wave point={point} spot={selected} units={units} />
                </div>
                <div className="timeline-heading">
                  <span className="eyebrow">WAVE HEIGHT</span>
                  <span>Wave height · {heightUnit}</span>
                </div>
                <div className="height-chart">
                  {dayPoints.map((p) => (
                    <button
                      key={p.valid_time}
                      className={p === point ? "active" : ""}
                      aria-label={`${date(p.valid_time, { hour: "numeric" })}, ${height(p.swh, units)} ${heightUnit}`}
                      aria-pressed={p === point}
                      onClick={() => setSelectedTime(p.valid_time)}
                    >
                      <span className="chart-value">
                        {height(p.swh, units)}
                      </span>
                      <span
                        className="chart-bar"
                        style={{
                          height: `${p.swh == null ? 0 : Math.max(5, (p.swh / Math.max(...dayPoints.map((p) => p.swh ?? 0), 0.1)) * 65)}px`,
                        }}
                      />
                      <small>{date(p.valid_time, { hour: "numeric" })}</small>
                    </button>
                  ))}
                </div>
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Forecast detail table"
                  tabIndex={0}
                >
                  <table>
                    <caption className="sr-only">
                      Detailed ocean forecast. Select a time to update the swell
                      preview. Heights in {heightUnit}; wind in {windUnit}.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Sea height</th>
                        <th scope="col">Primary swell</th>
                        <th scope="col">Secondary swell</th>
                        <th scope="col">Wind waves</th>
                        <th scope="col">Wind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayPoints.map((p) => (
                        <tr
                          key={p.valid_time}
                          className={p === point ? "current" : ""}
                        >
                          <td>
                            <button
                              onClick={() => setSelectedTime(p.valid_time)}
                              aria-pressed={p === point}
                            >
                              {date(p.valid_time, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </button>
                          </td>
                          <td>
                            <strong>
                              {height(p.swh, units)} <small>{heightUnit}</small>
                            </strong>
                            <small>
                              {number(p.perpw)} s ·{" "}
                              <Direction value={p.dirpw} />
                            </small>
                          </td>
                          <td>
                            {height(p.swells[0]?.height, units)}{" "}
                            <small>{heightUnit}</small>
                            <small>{number(p.swells[0]?.period)} s</small>
                          </td>
                          <td>
                            {height(p.swells[1]?.height, units)}{" "}
                            <small>{heightUnit}</small>
                            <small>{number(p.swells[1]?.period)} s</small>
                          </td>
                          <td>
                            {height(p.shww, units)} <small>{heightUnit}</small>
                            <small>{number(p.mpww)} s</small>
                          </td>
                          <td>
                            {speed(p.ws, units)} <small>{windUnit}</small>
                            <small>
                              <Direction value={p.wdir} />
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="forecast-note">
                  Ocean model output is an outlook, not a breaking-wave
                  prediction. Local wind, tides, and bathymetry shape the surf.
                  {point && (
                    <>
                      {" "}
                      Nearest wet grid point:{" "}
                      {(point.distance / 1000).toFixed(1)} km from the spot.
                    </>
                  )}
                </p>
              </>
            )}
            <section className="stations-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">OBSERVATIONS</span>
                  <h3>Nearby stations</h3>
                </div>
                <span>Nearby NOAA stations · within 200 km</span>
              </div>
              {stationsError && (
                <p className="notice" role="status">
                  Observations couldn’t be refreshed.{" "}
                  <button onClick={() => setForecastRefresh((v) => v + 1)}>
                    Retry
                  </button>
                  {stations.length
                    ? " Last loaded readings remain below with their original times."
                    : " Try again shortly."}
                </p>
              )}
              {stations.length === 0 ? (
                <p className="muted">
                  Live coastal observations will appear after a followed spot is
                  refreshed. NOAA CO-OPS coverage is primarily in the United
                  States.
                </p>
              ) : (
                <div className="stations-grid">
                  {stations.slice(0, 3).map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      units={units}
                    />
                  ))}
                </div>
              )}
            </section>
            <footer className="content-footer">
              <span>
                BODHI CAST{" "}
                <span className="footer-wave" aria-hidden="true">
                  ∿
                </span>{" "}
                NOAA data · <a href="/privacy.html">Privacy</a>
              </span>
              <details>
                <summary>
                  Data & updates {failed > 0 && `· ${failed} failed`}
                </summary>
                <p>
                  Wave forecasts update four times daily with a six-hour
                  publication allowance. Observations refresh every 10 minutes.
                  Times are local unless marked UTC. Missing measurements are
                  shown as —.
                </p>
                <p>
                  {pending} queued jobs · {failed} failed jobs
                </p>
                {status?.errors.map((e) => (
                  <p key={e.id} className="job-error">
                    Job {e.id}: {e.error}
                  </p>
                ))}
                {failed > 0 && caps?.can_retry_jobs && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void mutate(() =>
                        request("/jobs/retry", { method: "POST" }, token),
                      )
                    }
                  >
                    Retry failed jobs
                  </button>
                )}
              </details>
            </footer>
          </div>
        </section>
      </main>
      {draft && (
        <AddSpot
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={async (input) => {
            const created = await request<Spot>(
              "/spots",
              {
                method: "POST",
                body: JSON.stringify(input),
                headers: writeHeaders(),
              },
              token,
            );
            await load();
            select(created.id);
            setDraft(null);
          }}
        />
      )}
      {showUnlock && (
        <Unlock
          onClose={() => setShowUnlock(false)}
          onUnlock={async (value) => {
            const result = await request<Capabilities>(
              "/capabilities",
              {},
              value,
            );
            if (!result.can_write)
              throw new Error("That token did not unlock editing.");
            setToken(value);
            setCaps(result);
            setShowUnlock(false);
          }}
        />
      )}
    </>
  );
}

function StationCard({ station, units }: { station: Station; units: Units }) {
  const water = station.observations.water_temperature,
    wind = station.observations.wind,
    level = station.observations.water_level;
  const observed = [water, wind, level]
    .flatMap((o) => (o ? [o.t] : []))
    .sort()
    .at(-1);
  const isOld = (o: typeof water) =>
    !!o && Date.now() - Date.parse(`${o.t.replace(" ", "T")}Z`) > 2 * 3600_000;
  const stale = !observed || [water, wind, level].some(isOld);
  function numeric(value: string | undefined) {
    if (value == null || value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  const temp = numeric(water?.v);
  return (
    <article className="station-card">
      <div className="station-title">
        <strong>{station.name}</strong>
        <span>{(station.distance / 1000).toFixed(0)} km</span>
      </div>
      <div className="station-values">
        <div title={water ? `Observed ${water.t} UTC` : undefined}>
          <span>Water{isOld(water) ? " · old" : ""}</span>
          <strong>
            {number(
              temp == null
                ? null
                : units === "imperial"
                  ? temp * 1.8 + 32
                  : temp,
            )}
            <small> °{units === "imperial" ? "F" : "C"}</small>
          </strong>
        </div>
        <div title={wind ? `Observed ${wind.t} UTC` : undefined}>
          <span>Wind{isOld(wind) ? " · old" : ""}</span>
          <strong>
            {speed(numeric(wind?.s), units)}
            <small> {units === "imperial" ? "kn" : "m/s"}</small>
          </strong>
        </div>
        <div title={level ? `Observed ${level.t} UTC` : undefined}>
          <span>Tide · MLLW{isOld(level) ? " · old" : ""}</span>
          <strong>
            {height(numeric(level?.v), units)}
            <small> {units === "imperial" ? "ft" : "m"}</small>
          </strong>
        </div>
      </div>
      <small className={stale ? "observation-stale" : "observation-time"}>
        {observed
          ? `${stale ? "Older observation · " : ""}${date(`${observed.replace(" ", "T")}Z`, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
          : "No recent observations"}
      </small>
    </article>
  );
}

function AddSpot({
  draft,
  onClose,
  onSave,
}: {
  draft: { latitude: number; longitude: number };
  onClose: () => void;
  onSave: (input: Omit<Spot, "id" | "watched">) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSave({
        spot_name: String(data.get("name")),
        street_address: String(data.get("address")),
        latitude: Number(data.get("latitude")),
        longitude: Number(data.get("longitude")),
      });
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="modal"
      aria-labelledby="add-spot-title"
    >
      <button
        className="modal-close"
        onClick={() => dialog.current?.close()}
        aria-label="Close add spot"
      >
        ×
      </button>
      <span className="eyebrow">CUSTOM SPOT</span>
      <h2 id="add-spot-title">Add a surf spot</h2>
      <p>Enter coordinates to find the nearest ocean forecast.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Spot name
          <input
            name="name"
            required
            maxLength={160}
            autoFocus
            placeholder="Spot name"
          />
        </label>
        <label>
          Coastline or address
          <input name="address" maxLength={240} placeholder="Town, country" />
        </label>
        <div className="form-row">
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              required
              min="-90"
              max="90"
              defaultValue={draft.latitude.toFixed(6)}
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              required
              min="-180"
              max="180"
              defaultValue={draft.longitude.toFixed(6)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={saving}>
          {saving ? "Saving…" : "Save & follow spot"}
        </button>
        <small>
          Up to 20 followed spots. Ocean forecasts may be unavailable for inland
          locations and lakes.
        </small>
      </form>
    </dialog>
  );
}
function Unlock({
  onClose,
  onUnlock,
}: {
  onClose: () => void;
  onUnlock: (token: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("token"));
    setSaving(true);
    try {
      await onUnlock(value);
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal"
      onClose={onClose}
      aria-labelledby="unlock-title"
    >
      <button
        className="modal-close"
        onClick={() => dialog.current?.close()}
        aria-label="Close unlock editing"
      >
        ×
      </button>
      <span className="eyebrow">ADMIN ACCESS</span>
      <h2 id="unlock-title">Unlock editing</h2>
      <p>
        Enter the write token configured on your server. It stays in memory for
        this page session.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Write token
          <input
            type="password"
            name="token"
            autoComplete="off"
            required
            autoFocus
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary-button" disabled={saving}>
          {saving ? "Checking…" : "Unlock editing"}
        </button>
      </form>
    </dialog>
  );
}
