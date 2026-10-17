import { useEffect, useRef, useState } from "react";
import { createOcean } from "./ocean";
import { height } from "./format";
import type { Forecast, Spot, Units } from "./types";

function OceanCanvas({
  point,
  spot,
  playing,
  enabled = true,
}: {
  point: Forecast | undefined;
  spot: Spot | undefined;
  playing: boolean;
  enabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const active = useRef({ playing, enabled });
  active.current = { playing, enabled };
  const redrawRef = useRef<(() => void) | null>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !point || !spot) return;
    let ocean: ReturnType<typeof createOcean>;
    try {
      ocean = createOcean(element, point, spot);
      setError("");
    } catch (error) {
      console.error("Ocean view unavailable", error);
      setError(
        "Ocean view is unavailable in this browser. The forecast is still available below.",
      );
      return;
    }
    let frame = 0,
      last = 0,
      visible = true,
      disposed = false;
    const draw = (timestamp: number) => {
      cancelAnimationFrame(frame);
      if (disposed) return;
      const animating =
        active.current.playing &&
        active.current.enabled &&
        visible &&
        !document.hidden;
      if (animating) frame = requestAnimationFrame(draw);
      if (animating && timestamp - last < 32) return;
      if (animating)
        elapsed.current += Math.min((timestamp - last) / 1000, 0.08);
      last = timestamp;
      ocean.draw(elapsed.current);
    };
    const redraw = () => {
      cancelAnimationFrame(frame);
      if (!disposed && active.current.enabled)
        frame = requestAnimationFrame(draw);
    };
    redrawRef.current = redraw;
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) redraw();
      else cancelAnimationFrame(frame);
    });
    intersection.observe(element);
    const resize = new ResizeObserver(redraw);
    resize.observe(element);
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      setError("Ocean view was paused by the browser. Reload to restore it.");
    };
    element.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", redraw);
    redraw();
    return () => {
      disposed = true;
      redrawRef.current = null;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      element.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", redraw);
      ocean.dispose();
    };
  }, [point?.time, point?.valid_time, spot?.id]);
  useEffect(() => {
    redrawRef.current?.();
  }, [playing, enabled]);
  return (
    <>
      <canvas
        ref={canvas}
        role="img"
        aria-label={
          point
            ? `Beach perspective at ${spot?.spot_name ?? "this spot"}: ${point.swh?.toFixed(1) ?? "unknown"} meter seas with a ${point.perpw?.toFixed(1) ?? "unknown"} second period`
            : "Beach perspective waiting for forecast data"
        }
      />
      {error && (
        <p className="ocean-error" role="status">
          {error}
        </p>
      )}
    </>
  );
}

export default function Wave({
  point,
  spot,
  units,
}: {
  point: Forecast | undefined;
  spot: Spot | undefined;
  units: Units;
}) {
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      if (motion.matches) setPlaying(false);
    };
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, []);
  return (
    <>
      <div className="wave-preview beach-preview">
        <OceanCanvas
          point={point}
          spot={spot}
          playing={playing}
          enabled={!expanded}
        />
        <div className="wave-label">
          <span className="eyebrow">BEACH VIEW</span>
          <span>
            {point ? "Forecast-driven waves" : "Waiting for forecast"}
          </span>
        </div>
        <button
          className="beach-expand"
          disabled={!point}
          onClick={() => setExpanded(true)}
        >
          Open beach view ↗
        </button>
        <button
          className="wave-play"
          onClick={() => setPlaying((v) => !v)}
          disabled={!point}
          aria-label={
            playing ? "Pause ocean animation" : "Play ocean animation"
          }
        >
          {playing ? "Ⅱ" : "▷"}
        </button>
      </div>
      {expanded && point && spot && (
        <BeachDialog
          point={point}
          spot={spot}
          playing={playing}
          units={units}
          onPlay={() => setPlaying((p) => !p)}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
function BeachDialog({
  point,
  spot,
  playing,
  onPlay,
  onClose,
  units,
}: {
  point: Forecast;
  spot: Spot;
  playing: boolean;
  onPlay: () => void;
  onClose: () => void;
  units: Units;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="beach-dialog"
      onClose={onClose}
      aria-label={`Beach view at ${spot.spot_name}`}
    >
      <div className="beach-scene">
        <OceanCanvas point={point} spot={spot} playing={playing} />
        <div className="beach-scene-title">
          <span className="eyebrow">BEACH VIEW</span>
          <h2>{spot.spot_name}</h2>
          <p>{spot.street_address}</p>
        </div>
        <button
          className="beach-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close beach view"
        >
          ×
        </button>
        <div className="beach-scene-controls">
          <span>
            {new Date(point.valid_time).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </span>
          <button
            onClick={onPlay}
            aria-label={
              playing ? "Pause beach animation" : "Play beach animation"
            }
          >
            {playing ? "Ⅱ Pause" : "▷ Play"}
          </button>
        </div>
      </div>
      <div className="beach-scene-note">
        <span>
          {height(point.swh, units)} {units === "imperial" ? "ft" : "m"} seas ·{" "}
          {point.perpw?.toFixed(1) ?? "—"} s period
        </span>
        <p>
          Waves follow the forecast. Shoreline, lighting, and breaking surf are
          illustrative.
        </p>
      </div>
    </dialog>
  );
}
