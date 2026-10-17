import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Spot } from "./types";

export default function SpotMap({
  spots,
  selected,
  onSelect,
  onAdd,
}: {
  spots: Spot[];
  selected: Spot | undefined;
  onSelect: (id: number) => void;
  onAdd?: (lat: number, lon: number) => void;
}) {
  const [tileError, setTileError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef({ onSelect, onAdd });
  callbacks.current = { onSelect, onAdd };
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      preferCanvas: true,
      zoomControl: false,
      minZoom: 2,
    }).setView([35, -65], 3);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 17,
      referrerPolicy: "strict-origin-when-cross-origin",
    })
      .on("tileerror", () => setTileError(true))
      .on("tileload", () => setTileError(false))
      .addTo(instance);
    L.control.zoom({ position: "bottomright" }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    instance.on("click", (event: L.LeafletMouseEvent) =>
      callbacks.current.onAdd?.(event.latlng.lat, event.latlng.lng),
    );
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    map.current = instance;
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    for (const spot of spots) {
      const active = spot.id === selected?.id;
      const marker = L.circleMarker([spot.latitude, spot.longitude], {
        radius: active ? 8 : spot.watched ? 5 : 3,
        weight: active ? 3 : 1,
        color: active ? "#fff" : "#1b6660",
        fillColor: active ? "#d36a48" : spot.watched ? "#1b6660" : "#5b9189",
        fillOpacity: active ? 1 : 0.7,
      }).addTo(group);
      const label = document.createElement("span");
      label.textContent = spot.spot_name;
      marker.bindTooltip(label);
      marker.on("click", (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event);
        callbacks.current.onSelect(spot.id);
      });
    }
  }, [spots, selected?.id]);
  useEffect(() => {
    if (selected) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        map.current?.setView([selected.latitude, selected.longitude], 8);
      else
        map.current?.flyTo([selected.latitude, selected.longitude], 8, {
          duration: 0.6,
        });
    }
  }, [selected?.id, selected?.latitude, selected?.longitude]);
  return (
    <>
      <div
        ref={container}
        className="spot-map"
        role="region"
        aria-label={`Surf spot map. Select a marker to view its forecast.${onAdd ? " Click the map to add a spot." : ""}`}
      />
      {tileError && (
        <div className="map-notice" role="status">
          Map tiles are unavailable. You can still choose spots from the list.
        </div>
      )}
    </>
  );
}
