'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { LayersIcon, MapIcon, SearchIcon } from '@/components/icons';
import type { Park } from '@/types/park';

type PickedLatLng = {
  lat: number;
  lng: number;
};

type LeafletModule = typeof import('leaflet');

type MapProps = {
  parks: Park[];
  selectedPark: Park | null;
  notice: string;
  pickingSpot: boolean;
  onNotice: (message: string) => void;
  onPickingSpotChange: (picking: boolean) => void;
  onParkSelect: (park: Park) => void;
  onSpotPicked: (latLng: PickedLatLng) => void;
};

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch));
}

function makeMarkerSVG(verified: boolean, hidden?: boolean) {
  const gradId = hidden ? 'gH' : verified ? 'gV' : 'gR';
  const c1 = hidden ? '#ffc83a' : verified ? '#45e09c' : '#ff3a2f';
  const c2 = hidden ? '#ffe17a' : verified ? '#6ce8b8' : '#ff7d68';

  return `
    <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/>
      </linearGradient></defs>
      <path d="M15 0 C6.7 0 0 6.7 0 15 C0 25 15 38 15 38 C15 38 30 25 30 15 C30 6.7 23.3 0 15 0 Z"
            fill="url(#${gradId})" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
      <circle cx="15" cy="14" r="9" fill="#08080a"/>
      <line x1="10" y1="10" x2="20" y2="10" stroke="${c2}" stroke-width="2" stroke-linecap="round"/>
      <line x1="10.5" y1="10" x2="10.5" y2="18" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="19.5" y1="10" x2="19.5" y2="18" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
}

export default function Map({
  parks,
  selectedPark,
  notice,
  pickingSpot,
  onNotice,
  onPickingSpotChange,
  onParkSelect,
  onSpotPicked
}: MapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const satGroupRef = useRef<Leaflet.LayerGroup | null>(null);
  const darkLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const streetLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'map'>('satellite');
  const [search, setSearch] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (mapRef.current || !mapEl.current) return;

      const L = await import('leaflet');
      if (cancelled || !mapEl.current) return;
      leafletRef.current = L;

      const map = L.map(mapEl.current, { zoomControl: true }).setView([53.4, -7.9], 7);
      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Esri, Maxar, Earthstar Geographics', maxZoom: 19 }
      );
      const satelliteLabels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, opacity: 0.85 }
      );
      const satGroup = L.layerGroup([satelliteLayer, satelliteLabels]).addTo(map);
      const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19
      });
      const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19
      });

      satGroupRef.current = satGroup;
      darkLayerRef.current = darkLayer;
      streetLayerRef.current = streetLayer;

      let satelliteTileErrors = 0;
      let darkTileErrors = 0;
      let streetTileErrors = 0;

      const fallbackFromSatellite = () => {
        if (!map.hasLayer(satGroup)) return;
        map.removeLayer(satGroup);
        darkLayer.addTo(map);
        setActiveLayer('map');
        onNotice('Satellite imagery did not load, so BARMAP switched to the street map.');
      };
      const fallbackFromDark = () => {
        if (!map.hasLayer(darkLayer)) return;
        map.removeLayer(darkLayer);
        streetLayer.addTo(map);
        setActiveLayer('map');
        onNotice('The dark map tiles did not load, so BARMAP switched to the backup street map.');
      };

      satelliteLayer.on('tileerror', () => {
        satelliteTileErrors += 1;
        if (satelliteTileErrors >= 3) fallbackFromSatellite();
      });
      satelliteLabels.on('tileerror', () => {
        satelliteTileErrors += 1;
        if (satelliteTileErrors >= 3) fallbackFromSatellite();
      });
      darkLayer.on('tileerror', () => {
        darkTileErrors += 1;
        if (darkTileErrors >= 3) fallbackFromDark();
      });
      streetLayer.on('tileerror', () => {
        streetTileErrors += 1;
        if (streetTileErrors === 3) onNotice('Map tiles are not loading. Check the internet connection or content blocker.');
      });
      setMapReady(true);
    }

    setupMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [onNotice]);

  useEffect(() => {
    const L = leafletRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapReady || !L || !markerLayer) return;

    markerLayer.clearLayers();
    parks.forEach(park => {
      const pinClass = `bar-pin${park.verified ? ' verified' : ''}${park.hiddenSpot ? ' hidden' : ''}`;
      const icon = L.divIcon({
        className: 'bar-pin-wrap',
        html: `<div class="${pinClass}">${makeMarkerSVG(park.verified, park.hiddenSpot)}</div>`,
        iconSize: [30, 38],
        iconAnchor: [15, 38]
      });
      L.marker([park.lat, park.lng], { icon })
        .addTo(markerLayer)
        .bindTooltip(`<b>${escapeHtml(park.name)}</b><br><span style="color:#888">${escapeHtml(park.area)}</span>`, {
          direction: 'top',
          offset: [0, -32]
        })
        .on('click', () => onParkSelect(park));
    });
  }, [parks, onParkSelect, mapReady]);

  useEffect(() => {
    if (!selectedPark || !mapRef.current) return;
    mapRef.current.flyTo([selectedPark.lat, selectedPark.lng], 17, { duration: 0.8 });
  }, [selectedPark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickingSpot) return;

    const handler = (event: Leaflet.LeafletMouseEvent) => {
      onPickingSpotChange(false);
      onSpotPicked({ lat: event.latlng.lat, lng: event.latlng.lng });
    };
    map.once('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [pickingSpot, onPickingSpotChange, onSpotPicked]);

  useEffect(() => {
    document.body.classList.toggle('marking-spot', pickingSpot);
    return () => document.body.classList.remove('marking-spot');
  }, [pickingSpot]);

  function showSatelliteLayer() {
    const map = mapRef.current;
    const satGroup = satGroupRef.current;
    const darkLayer = darkLayerRef.current;
    const streetLayer = streetLayerRef.current;
    if (!map || !satGroup || !darkLayer || !streetLayer) return;

    map.removeLayer(darkLayer);
    map.removeLayer(streetLayer);
    satGroup.addTo(map);
    setActiveLayer('satellite');
  }

  function showMapLayer() {
    const map = mapRef.current;
    const satGroup = satGroupRef.current;
    const darkLayer = darkLayerRef.current;
    const streetLayer = streetLayerRef.current;
    if (!map || !satGroup || !darkLayer || !streetLayer) return;

    map.removeLayer(satGroup);
    map.removeLayer(streetLayer);
    darkLayer.addTo(map);
    setActiveLayer('map');
  }

  function focusSearchMatch(openPanel = false, query = search) {
    const q = query.toLowerCase().trim();
    if (!q) return;
    const match = parks.find(park => park.name.toLowerCase().includes(q) || park.area.toLowerCase().includes(q));
    if (!match) return;

    mapRef.current?.flyTo([match.lat, match.lng], openPanel ? 17 : 14);
    if (openPanel) onParkSelect(match);
  }

  return (
    <>
      <div className="search-wrap">
        <SearchIcon />
        <input
          id="searchBox"
          placeholder="Search park or city..."
          value={search}
          onChange={event => {
            const nextSearch = event.target.value;
            setSearch(nextSearch);
            focusSearchMatch(false, nextSearch);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') focusSearchMatch(true);
          }}
        />
      </div>

      <div className="layer-toggle">
        <button id="btnSat" className={activeLayer === 'satellite' ? 'active' : ''} onClick={showSatelliteLayer}>
          <LayersIcon />
          Satellite
        </button>
        <button id="btnMap" className={activeLayer === 'map' ? 'active' : ''} onClick={showMapLayer}>
          <MapIcon />
          Map
        </button>
      </div>

      <div id="map" ref={mapEl} />

      <div className={`spot-toast${pickingSpot ? ' show' : ''}`} id="spotToast">
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M12 2v20" />
          <path d="M2 12h20" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span>Click the exact park location to submit for verification.</span>
        <button className="btn btn-ghost" id="cancelSpotPick" type="button" onClick={() => onPickingSpotChange(false)}>
          Cancel
        </button>
      </div>

      <div className="count-pill">
        <span className="dot" />
        <span className="num" id="visibleCount">
          {parks.length}
        </span>{' '}
        verified parks tracked
      </div>

      <div id="loadingMsg" style={{ display: 'none' }}>
        <span className="spinner" />
        Loading map...
      </div>
      <div id="errorMsg" style={{ display: notice ? 'block' : 'none' }}>
        {notice}
      </div>
    </>
  );
}
