import assert from "node:assert/strict";
import { test } from "node:test";
import {
  number,
  height,
  speed,
  compass,
  matchesSpot,
  readSpotId,
  resolveSpot,
  waveRange,
} from "../src/format.ts";
import { request, ApiError } from "../src/api.ts";
import type { Spot } from "../src/types.ts";

test("measurements preserve calm zeroes and distinguish missing data", () => {
  assert.equal(number(0), "0.0");
  assert.equal(height(1, "imperial"), "3.3");
  assert.equal(speed(10, "imperial"), "19.4");
  for (const value of [null, undefined, NaN, Infinity])
    assert.equal(number(value), "—");
  assert.equal(compass(360), "N 0°");
  assert.equal(compass(-90), "W 270°");
  assert.equal(
    waveRange([{ swh: null }, { swh: 0 }, { swh: 2 }], "metric"),
    "0.0–2.0",
  );
  assert.equal(waveRange([{ swh: null }], "imperial"), "—");
});
test("search handles accents, punctuation, whitespace, and out-of-order location words", () => {
  const spot = {
    spot_name: "São Pedro",
    street_address: "Portugal · Praia de São Pedro",
  };
  assert.ok(matchesSpot(spot, "  portugal sao  "));
  assert.ok(matchesSpot(spot, "são-pedro"));
  assert.ok(matchesSpot(spot, ""));
  assert.ok(!matchesSpot(spot, "California"));
});
test("deep links reject malformed IDs and default to a followed spot", () => {
  for (const value of [
    "-1",
    "0",
    "2.2",
    "2x",
    "Infinity",
    "9007199254740992",
    "",
  ])
    assert.equal(readSpotId(`?spot=${value}`), null);
  assert.equal(readSpotId("?spot=286"), 286);
  const spots: Spot[] = [
    {
      id: 1,
      spot_name: "1st Street Jetty",
      street_address: "",
      latitude: 0,
      longitude: 0,
      watched: false,
    },
    {
      id: 2,
      spot_name: "Other",
      street_address: "",
      latitude: 0,
      longitude: 0,
      watched: true,
    },
  ];
  assert.equal(resolveSpot(spots, null)?.id, 2);
  assert.equal(resolveSpot(spots, 1)?.id, 1);
  assert.equal(resolveSpot(spots, 999)?.id, 2);
  assert.equal(resolveSpot([], null), undefined);
});
test("API preserves headers and reports server errors without losing status", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/spots");
    assert.equal(options.headers.get("Authorization"), "Bearer test-token");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.headers.get("X-Test"), "kept");
    return Response.json({ error: "At capacity" }, { status: 409 });
  });
  await assert.rejects(
    request(
      "/spots",
      {
        method: "POST",
        body: "{}",
        headers: new Headers({ "X-Test": "kept" }),
      },
      "test-token",
    ),
    (e: ApiError) =>
      e.kind === "http" && e.status === 409 && e.message === "At capacity",
  );
});
test("non-JSON responses and network failures have useful errors", async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>gateway error</html>", { status: 502 }),
  );
  await assert.rejects(
    request("/spots"),
    (e: ApiError) => e.kind === "http" && e.status === 502,
  );
  fetchMock.mock.mockImplementation(async () => new Response("broken json"));
  await assert.rejects(
    request("/spots"),
    (e: ApiError) => e.kind === "response",
  );
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    request("/spots"),
    (e: ApiError) => e.kind === "network",
  );
});
test("request timeout and caller cancellation remain distinguishable", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    (_url, options) =>
      new Promise((_resolve, reject) => {
        if (options.signal.aborted) reject(options.signal.reason);
        else
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          );
      }),
  );
  await assert.rejects(
    request("/spots", {}, "", undefined, 5),
    (e: ApiError) => e.kind === "timeout",
  );
  const controller = new AbortController();
  const pending = request("/spots", {}, "", controller.signal);
  controller.abort();
  await assert.rejects(pending, (e: Error) => e.name === "AbortError");
});
