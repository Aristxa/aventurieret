"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { SavedSpot, Stop } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ROUTE_SOURCE = "day-route";

const NO_SAVED: SavedSpot[] = [];

export function TripMap({
  stops,
  saved = NO_SAVED,
  center,
  activeId,
  onSelect,
}: {
  stops: Stop[];
  /** TikTok spots not yet in a day, shown as outlined pins. */
  saved?: SavedSpot[];
  center: { lat: number; lng: number };
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!TOKEN || !container.current) return;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !container.current) return;
      mapboxgl.accessToken = TOKEN;
      const m = new mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [center.lng, center.lat],
        zoom: 12,
      });
      m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      m.on("load", () => {
        m.addSource(ROUTE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: ROUTE_SOURCE,
          type: "line",
          source: ROUTE_SOURCE,
          paint: { "line-color": "#e4572e", "line-width": 3, "line-dasharray": [1.5, 1.5], "line-opacity": 0.8 },
          layout: { "line-cap": "round" },
        });
        setReady(true);
      });
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers + route line with the selected day's stops.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();

      stops.forEach((s, i) => {
        // Mapbox owns the wrapper's transform, so we style/scale an inner pin.
        const el = document.createElement("div");
        const pin = document.createElement("button");
        pin.className =
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-lg transition-transform";
        pin.style.background = s.isHiddenGem ? "#c99a2e" : "#1d1b18";
        pin.textContent = String(i + 1);
        pin.title = s.name;
        pin.onclick = (e) => {
          e.stopPropagation();
          onSelect(s.id);
        };
        el.appendChild(pin);
        const mk = new mapboxgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(m);
        markers.current.set(s.id, mk);
      });

      saved.forEach((s) => {
        const el = document.createElement("div");
        el.className =
          "flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-ink bg-white/90 text-xs shadow";
        el.textContent = "📌";
        el.title = `Saved: ${s.name}`;
        const mk = new mapboxgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(m);
        markers.current.set(`saved-${s.id}`, mk);
      });

      (m.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) },
      });

      if (stops.length) {
        const bounds = new mapboxgl.LngLatBounds();
        stops.forEach((s) => bounds.extend([s.lng, s.lat]));
        m.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 800 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stops, saved, ready, onSelect]);

  // Highlight + fly to the active stop.
  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const el = mk.getElement();
      const pin = el.firstElementChild as HTMLElement | null;
      el.style.zIndex = id === activeId ? "10" : "";
      if (pin) {
        pin.style.transform = id === activeId ? "scale(1.35)" : "";
        pin.style.boxShadow = id === activeId ? "0 0 0 4px rgba(228,87,46,.45)" : "";
      }
    });
    const s = stops.find((x) => x.id === activeId);
    if (s && map.current) map.current.easeTo({ center: [s.lng, s.lat], duration: 600 });
  }, [activeId, stops]);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-line bg-paper p-8 text-center text-sm text-muted">
        Add <code className="mx-1 rounded bg-sand px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to .env.local to see the map.
      </div>
    );
  }
  return <div ref={container} className="h-full w-full overflow-hidden rounded-3xl" />;
}
