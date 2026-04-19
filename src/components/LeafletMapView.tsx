import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Construction, Crosshair, MapPin, Navigation, Ruler, Wind, Compass, RotateCw, Trash2, MousePointer2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import FloatingSearchBar from './FloatingSearchBar';
import { MapLayersMenu } from './MapLayersMenu';

function AirQualityMarkers({ center, zoom }: { center: [number, number], zoom: number }) {
  const [aqData, setAqData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (zoom < 10) return;
    
    const fetchAQData = async () => {
      setLoading(true);
      try {
        const bbox = [
          center[1] - 2,
          center[0] - 2,
          center[1] + 2,
          center[0] + 2
        ].join(',');
        
        const response = await fetch(
          `https://api.openaq.org/v2/measurements?city=&country=&location=&parameter=pm25&limit=20&offset=0&sort=desc&radius=100&bbox=${bbox}`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await response.json();
        
        if (data.results) {
          const uniqueLocations = new Map();
          data.results.forEach((m: any) => {
            const key = `${m.coordinates.latitude},${m.coordinates.longitude}`;
            if (!uniqueLocations.has(key)) {
              uniqueLocations.set(key, {
                lat: m.coordinates.latitude,
                lon: m.coordinates.longitude,
                value: m.value,
                parameter: m.parameter,
                unit: m.unit,
                city: m.city,
                location: m.location
              });
            }
          });
          setAqData(Array.from(uniqueLocations.values()));
        }
      } catch (error) {
        console.log('AQ API not available, using mock data');
        setAqData([
          { lat: center[1] + 0.02, lon: center[0] + 0.02, value: 35, city: 'Demo City A', location: 'Station A' },
          { lat: center[1] - 0.015, lon: center[0] + 0.01, value: 78, city: 'Demo City B', location: 'Station B' },
          { lat: center[1] + 0.01, lon: center[0] - 0.015, value: 150, city: 'Demo City C', location: 'Station C' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAQData();
  }, [center, zoom]);

  const getAQColor = (value: number) => {
    if (value <= 50) return '#22c55e';
    if (value <= 100) return '#eab308';
    if (value <= 150) return '#f97316';
    if (value <= 200) return '#ef4444';
    if (value <= 300) return '#a855f7';
    return '#7c3aed';
  };

  const getAQLevel = (value: number) => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive';
    if (value <= 200) return 'Unhealthy';
    if (value <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  if (loading || aqData.length === 0) return null;

  return (
    <>
      {aqData.map((station, idx) => (
        <CircleMarker
          key={idx}
          center={[station.lat, station.lon]}
          radius={10}
          pathOptions={{
            color: getAQColor(station.value),
            fillColor: getAQColor(station.value),
            fillOpacity: 0.6,
            weight: 2
          }}
        >
          <Popup>
            <div className="p-2 min-w-[150px]">
              <div className="flex items-center gap-2 mb-2">
                <Wind size={16} style={{ color: getAQColor(station.value) }} />
                <span className="font-bold" style={{ color: getAQColor(station.value) }}>
                  {station.value.toFixed(0)} {station.unit}
                </span>
              </div>
              <p className="text-sm font-medium">{station.location}</p>
              <p className="text-xs text-gray-500">{station.city}</p>
              <p className="text-xs mt-1" style={{ color: getAQColor(station.value) }}>
                {getAQLevel(station.value)}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function MapEvents({ 
  onContextMenu, 
  onClick, 
  activeLayersRef,
  measurePointsRef,
  setMeasurePoints,
  setRotation
}: { 
  onContextMenu: (e: L.LeafletMouseEvent) => void,
  onClick: (e: L.LeafletMouseEvent) => void,
  activeLayersRef: React.MutableRefObject<string[]>,
  measurePointsRef: React.MutableRefObject<[number, number][]>,
  setMeasurePoints: (points: [number, number][]) => void,
  setRotation: (rotation: number) => void
}) {
  const map = useMap();
  
  useEffect(() => {
    map.doubleClickZoom.disable();
    map.keyboard.disable();
    
    let isRotating = false;
    let startX = 0;
    let startRotation = 0;
    const mapPane = map.getPanes().mapPane;
    
    const updateRotation = (bearing: number) => {
      if (mapPane) {
        mapPane.style.transform = `rotate(${bearing}deg)`;
      }
      setRotation(bearing);
    };
    
    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.shiftKey || e.originalEvent.button === 2) {
        isRotating = true;
        startX = e.originalEvent.clientX;
        startRotation = (map as any).getBearing?.() || 0;
        map.dragging.disable();
        map.getContainer().style.cursor = 'grab';
      }
    };
    
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isRotating) {
        const deltaX = e.originalEvent.clientX - startX;
        const newBearing = startRotation + deltaX * 0.5;
        (map as any).setBearing?.(newBearing);
        updateRotation(newBearing);
        map.getContainer().style.cursor = 'grabbing';
      }
    };
    
    const handleMouseUp = () => {
      if (isRotating) {
        isRotating = false;
        map.dragging.enable();
        map.getContainer().style.cursor = '';
      }
    };
    
    let lastTouchDistance = 0;
    let lastTouchAngle = 0;
    let touchStartBearing = 0;
    
    const handleTouchStart = (e: any) => {
      if (e.touches?.length === 2) {
        e.preventDefault?.();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        lastTouchAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        touchStartBearing = (map as any).getBearing?.() || 0;
        isRotating = true;
        map.dragging.disable();
      }
    };
    
    const handleTouchMove = (e: any) => {
      if (e.touches?.length === 2 && isRotating) {
        e.preventDefault?.();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const angleDelta = angle - lastTouchAngle;
        const newBearing = touchStartBearing + angleDelta;
        
        (map as any).setBearing?.(newBearing);
        updateRotation(newBearing);
        
        lastTouchAngle = angle;
      }
    };
    
    const handleTouchEnd = () => {
      if (isRotating) {
        isRotating = false;
        map.dragging.enable();
      }
    };
    
    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('touchstart', handleTouchStart);
    map.on('touchmove', handleTouchMove);
    map.on('touchend', handleTouchEnd);
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      e.latlng && map.flyTo(e.latlng, map.getZoom() + 1, { duration: 0.5 });
    });
    
    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('touchstart', handleTouchStart);
      map.off('touchmove', handleTouchMove);
      map.off('touchend', handleTouchEnd);
      map.doubleClickZoom.enable();
      map.keyboard.enable();
    };
  }, [map, setRotation]);
  
  useMapEvents({
    contextmenu: (e) => {
      if (!activeLayersRef.current.includes('measure')) {
        e.originalEvent.preventDefault();
        onContextMenu(e);
      }
    },
    click: (e) => {
      if (activeLayersRef.current.includes('measure')) {
        setMeasurePoints([...measurePointsRef.current, [e.latlng.lng, e.latlng.lat]]);
      } else {
        onClick(e);
      }
    }
  });
  return null;
}

function FlyToLocation({ coords, mapRef }: { coords: [number, number] | null, mapRef: React.RefObject<L.Map | null> }) {
  const map = useMap();
  
  useEffect(() => {
    if (coords && mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.min(Math.max(currentZoom, 12), 15);
      map.flyTo([coords[1], coords[0]], targetZoom, { 
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coords, map, mapRef]);
  
  return null;
}

function FitRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length < 2) return;
    
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { 
      padding: [50, 50],
      duration: 1.5,
      maxZoom: 14
    });
  }, [positions, map]);
  
  return null;
}

function RoutePlayback({ 
  positions, 
  progress,
  showPlayback
}: { 
  positions: [number, number][], 
  progress: number,
  showPlayback: boolean
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!positions.length) return;
    
    map.eachLayer((layer) => {
      if ((layer as any).options?.pane === 'playbackPane') {
        map.removeLayer(layer);
      }
    });
    
    if (!showPlayback) return;
    
    const playbackPane = map.createPane('playbackPane');
    if (playbackPane) {
      (playbackPane as any).style.zIndex = '450';
    }
    
    const progressLength = Math.floor(positions.length * progress);
    const visiblePositions = positions.slice(0, Math.max(1, progressLength));
    const currentPosition = positions[Math.max(0, progressLength - 1)];
    
    if (visiblePositions.length > 1) {
      L.polyline(visiblePositions, {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        pane: 'playbackPane'
      }).addTo(map);
      
      L.polyline(positions.slice(progressLength), {
        color: '#94a3b8',
        weight: 6,
        opacity: 0.4,
        dashArray: '10, 10',
        pane: 'playbackPane'
      }).addTo(map);
    }
    
    if (currentPosition) {
      const playheadIcon = L.divIcon({
        html: `<div class="bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white" style="animation: pulse 1s infinite;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>`,
        className: 'playhead-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      
      L.marker([currentPosition[0], currentPosition[1]], {
        icon: playheadIcon,
        pane: 'playbackPane'
      }).addTo(map);
    }
    
    return () => {
      map.eachLayer((layer) => {
        if ((layer as any).options?.pane === 'playbackPane') {
          map.removeLayer(layer);
        }
      });
    };
  }, [positions, progress, showPlayback, map]);
  
  return null;
}

function RiskPolyline({ 
  positions, 
  riskData,
  showPlayback 
}: { 
  positions: [number, number][], 
  riskData: any[],
  showPlayback?: boolean
}) {
  const map = useMap();
  const riskDataRef = useRef(riskData);
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    riskDataRef.current = riskData;
  }, [riskData]);
  
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);
  
  useEffect(() => {
    if (!positions.length || !riskData.length) return;
    if (showPlayback) return;
    
    const getColor = (risk: number) => {
      if (risk < 0.4) return '#10b981';
      if (risk < 0.7) return '#f59e0b';
      return '#f43f5e';
    };
    
    const getWidth = (traffic: number) => {
      return 4 + traffic * 8;
    };
    
    const currentRiskData = riskDataRef.current;
    const currentPositions = positionsRef.current;
    if (!currentPositions.length || !currentRiskData.length) return;
    
    const segments = currentRiskData;
    
    segments.forEach((segment: any) => {
      if (segment.start && segment.end) {
        const latlngs: L.LatLngExpression[] = [
          [segment.start[1], segment.start[0]],
          [segment.end[1], segment.end[0]]
        ];
        const risk = segment.risk_probability || segment.risk_score || 0;
        const traffic = segment.traffic_level || 0;
        
        L.polyline(latlngs, {
          color: getColor(risk),
          weight: getWidth(traffic),
          opacity: 0.9
        }).addTo(map);
      }
    });
    
    return () => {
      map.eachLayer((layer) => {
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          map.removeLayer(layer);
        }
      });
    };
  }, [map, showPlayback]);
  
  return null;
}

const carIcon = L.divIcon({
  html: `<div class="bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white drop-shadow-lg" style="transform: translate(-50%, -50%);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11h14M5 11a2 2 0 100 4h14a2 2 0 100-4M7 15v2M17 15v2M7 15a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const bikeIcon = L.divIcon({
  html: `<div class="bg-blue-500 text-white p-2 rounded-full shadow-lg border-2 border-white drop-shadow-lg" style="transform: translate(-50%, -50%);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
      <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h2"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const startIcon = (vehicleType: string = 'driving') => L.divIcon({
  html: `<div class="${vehicleType === 'cycling' ? 'bg-blue-500' : 'bg-emerald-500'} text-white p-2 rounded-full shadow-lg border-2 border-white drop-shadow-lg" style="transform: translate(-50%, -50%);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const endIcon = L.divIcon({
  html: `<div class="bg-rose-500 text-white p-2 rounded-full shadow-lg border-2 border-white drop-shadow-lg" style="transform: translate(-50%, -50%);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const waypointIcon = L.divIcon({
  html: `<div class="bg-blue-500 text-white w-6 h-6 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-xs font-bold drop-shadow-lg" style="transform: translate(-50%, -50%);">
    <span>?</span>
  </div>`,
  className: 'custom-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const incidentIcon = (type: string, severity: string) => {
  const isAccident = type.toLowerCase() === 'accident';
  const isHigh = severity.toLowerCase() === 'high';
  const size = isHigh ? 28 : 22;
  const color = isAccident ? (isHigh ? 'bg-rose-600' : 'bg-rose-400') : 'bg-amber-500';
  
  return L.divIcon({
    html: `<div class="${color} text-white p-2 rounded-full shadow-lg" style="transform: translate(-50%, -50%);">
      ${isAccident 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${isHigh ? 20 : 16}" height="${isHigh ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.02 7.8 19.02 5.8a1 1 0 0 1 1.41 0l.71.7a1 1 0 0 1 0 1.42L20.42 9"/><path d="m18 9 1-4a1 1 0 0 1 1.41 0l.71.7a1 1 0 0 1 0 1.42l-2.12 2.12"/><path d="m3.7 19.32 8.55-8.55"/><path d="m14.87 7.4 3.03-3.03a1 1 0 0 1 1.41 0l.71.7a1 1 0 0 1 0 1.42l-3.03 3.03"/><path d="M20.66 10.37H15.3"/><path d="M17.03 7.7V3.03"/><path d="m21.36 17.36-2.12 2.12"/><path d="M3 21h18"/><path d="M16.97 21.37 14.87 19.27"/><path d="m20.66 13.36-3.03 3.03"/><path d="M7 3 4.87 5.12"/><path d="M17.03 21.37h-6.64"/><path d="M14.13 17.37 11.3 14.54"/></svg>`
      }
    </div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

interface LeafletMapViewProps {
  routeData: any;
  alternativeRoutes?: any[];
  riskData: any;
  previousRouteData?: any;
  previousRiskData?: any;
  incidentsData: any;
  startLoc: [number, number] | null;
  endLoc: [number, number] | null;
  setStartLoc: (loc: [number, number] | null) => void;
  setEndLoc: (loc: [number, number] | null) => void;
  setStartQuery: (query: string) => void;
  setEndQuery: (query: string) => void;
  theme: 'dark' | 'light';
  showIncidents: boolean;
  showRoutePlayback?: boolean;
  playbackSpeed?: number;
  mapStyleType?: string;
  setMapStyleType?: (type: string) => void;
  activeLayers?: string[];
  setActiveLayers?: (layers: string[]) => void;
  vehicleType?: 'driving' | 'cycling';
  waypoints?: Array<{ id: number; query: string; loc: [number, number] | null }>;
}

export default function LeafletMapView({
  routeData, alternativeRoutes, riskData, previousRouteData, previousRiskData, incidentsData,
  startLoc, endLoc,
  setStartLoc, setEndLoc,
  setStartQuery, setEndQuery,
  theme, showIncidents, showRoutePlayback, playbackSpeed = 1, mapStyleType = 'default', setMapStyleType,
  activeLayers = [], setActiveLayers,
  vehicleType = 'driving',
  waypoints = []
}: LeafletMapViewProps) {
  const [viewState, setViewState] = useState({
    center: [20.5937, 78.9629] as [number, number],
    zoom: 5
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewState({
            center: [position.coords.latitude, position.coords.longitude],
            zoom: 12
          });
        },
        () => {
          console.log('Geolocation not available, using default center');
        },
        { timeout: 5000 }
      );
    }
  }, []);
  const [contextMenu, setContextMenu] = useState<{lat: number, lng: number, x: number, y: number} | null>(null);
  const [hoveredIncident, setHoveredIncident] = useState<any | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<any | null>(null);
  const [poiResults, setPoiResults] = useState<any[]>([]);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [progress, setProgress] = useState(1);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [rotation, setRotation] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const activeLayersRef = useRef(activeLayers);
  const measurePointsRef = useRef(measurePoints);

  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

  useEffect(() => {
    measurePointsRef.current = measurePoints;
  }, [measurePoints]);

  const tileLayers = useMemo(() => ({
    default: theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    cycling: 'https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
    navigation: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  }), [theme]);

  const routePositions = useMemo(() => {
    if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) return [];
    return routeData.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  }, [routeData]);

  const previousRoutePositions = useMemo(() => {
    if (!previousRouteData || !previousRouteData.geometry || !previousRouteData.geometry.coordinates) return null;
    return previousRouteData.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  }, [previousRouteData]);

  const alternativeRoutePositions = useMemo(() => {
    if (!alternativeRoutes || alternativeRoutes.length === 0) return [];
    return alternativeRoutes
      .filter((r: any) => r && r.geometry && r.geometry.coordinates)
      .map((route: any) => route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]));
  }, [alternativeRoutes]);

  const measureDistance = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      const p1 = measurePoints[i - 1];
      const p2 = measurePoints[i];
      const R = 6371e3;
      const φ1 = p1[1] * Math.PI/180;
      const φ2 = p2[1] * Math.PI/180;
      const Δφ = (p2[1]-p1[1]) * Math.PI/180;
      const Δλ = (p2[0]-p1[0]) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      dist += R * c;
    }
    return dist;
  }, [measurePoints]);

  useEffect(() => {
    if (startLoc) {
      setViewState(prev => ({
        ...prev,
        center: [startLoc[1], startLoc[0]]
      }));
    }
  }, [startLoc]);

  useEffect(() => {
    if (!riskData || riskData.length === 0) {
      setProgress(1);
      return;
    }
    
    setProgress(0);
    let start: number;
    let animationFrameId: number;
    const baseDuration = showRoutePlayback ? 10000 : 2000;
    const duration = baseDuration / playbackSpeed;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const currentProgress = Math.min(elapsed / duration, 1);
      
      setProgress(currentProgress);

      if (currentProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else if (showRoutePlayback) {
        start = timestamp;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [riskData, showRoutePlayback, playbackSpeed]);

  const handleContextMenu = (e: L.LeafletMouseEvent) => {
    setContextMenu({
      lng: e.latlng.lng,
      lat: e.latlng.lat,
      x: e.containerPoint.x,
      y: e.containerPoint.y
    });
  };

  const handleClick = () => {
    setContextMenu(null);
    setPoiResults([]);
  };

  const currentTileLayer = tileLayers[mapStyleType as keyof typeof tileLayers] || tileLayers.default;

  const getRiskColor = (risk: number) => {
    if (risk < 0.4) return '#10b981';
    if (risk < 0.7) return '#f59e0b';
    return '#f43f5e';
  };

  const getRiskWeight = (traffic: number) => {
    return 4 + traffic * 8;
  };

  return (
    <div className="w-full h-full relative" style={{ height: '100vh' }}>
      <MapContainer
        center={viewState.center}
        zoom={viewState.zoom}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={currentTileLayer}
        />
        
        {activeLayers.includes('cycling') && (
          <TileLayer
            attribution='&copy; <a href="https://www.opencyclemap.org">OpenCycleMap</a>'
            url="https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png"
            opacity={0.6}
            zIndex={500}
          />
        )}
        
        {activeLayers.includes('terrain') && (
          <TileLayer
            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            opacity={0.4}
            zIndex={490}
          />
        )}
        
        {activeLayers.includes('traffic') && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a> Traffic'
            url="https://tile2.openstreetmap.org/tilesRH/{z}/{x}/{y}.png"
            opacity={0.3}
            zIndex={480}
          />
        )}

        {activeLayers.includes('airquality') && (
          <>
            <TileLayer
              attribution='&copy; Air Quality Index'
              url="https://tiles.waqi.info/tiles/aqicn_{z}/{x}/{y}.png"
              opacity={0.5}
              zIndex={485}
            />
            <AirQualityMarkers center={viewState.center} zoom={viewState.zoom} />
          </>
        )}

        {activeLayers.includes('labels') && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> Labels'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_only/{z}/{x}/{y}{r}.png"
            opacity={0.8}
            zIndex={470}
          />
        )}

        {activeLayers.includes('3dbuildings') && (
          <TileLayer
            attribution='&copy; OSM Buildings'
            url="https://tiles.osmbuildings.org/14/{x}/{y}.json"
            opacity={0.7}
            zIndex={475}
          />
        )}
        
        <MapEvents 
          onContextMenu={handleContextMenu}
          onClick={handleClick}
          activeLayersRef={activeLayersRef}
          measurePointsRef={measurePointsRef}
          setMeasurePoints={setMeasurePoints}
          setRotation={setRotation}
        />
        
        <FlyToLocation coords={startLoc} mapRef={mapRef} />

        {startLoc && (
          <Marker position={[startLoc[1], startLoc[0]]} icon={startIcon(vehicleType)}>
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span>{vehicleType === 'cycling' ? '🚴' : '🚗'}</span> Start Location
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {waypoints.filter(w => w.loc).map((wp, idx) => (
          <Marker key={`wp-${wp.id}`} position={[wp.loc![1], wp.loc![0]]} icon={waypointIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-blue-500">Stop {idx + 1}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {endLoc && (
          <Marker position={[endLoc[1], endLoc[0]]} icon={endIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-rose-600">Destination</div>
              </div>
            </Popup>
          </Marker>
        )}

        <AnimatePresence>
          {Array.isArray(poiResults) && poiResults.map((poi: any, idx: number) => (
            <Marker 
              key={`poi-${idx}`} 
              position={[parseFloat(poi.lat || poi.center?.[1]), parseFloat(poi.lon || poi.center?.[0])]}
              eventHandlers={{
                click: (e) => {
                  if (setEndLoc && setEndQuery) {
                    setEndLoc([parseFloat(poi.lon || poi.center?.[0]), parseFloat(poi.lat || poi.center?.[1])]);
                    setEndQuery(poi.display_name || poi.place_name);
                    setPoiResults([]);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-semibold">{poi.name || (poi.display_name || poi.place_name || '').split(',')[0]}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {showIncidents && incidentsData && incidentsData.map((incident: any, idx: number) => (
            <Marker 
              key={idx} 
              position={[incident.location[1], incident.location[0]]}
              icon={incidentIcon(incident.type, incident.severity)}
              eventHandlers={{
                mouseover: () => setHoveredIncident(incident),
                mouseout: () => setHoveredIncident(null)
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-bold">{incident.type.toUpperCase()}</div>
                  <p className="text-sm">Severity: {incident.severity}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </AnimatePresence>

        {activeLayers.includes('measure') && measurePoints.length > 0 && (
          <>
            <Polyline 
              positions={measurePoints.map(([lng, lat]) => [lat, lng])} 
              pathOptions={{ color: '#10b981', weight: 3, dashArray: '5, 5' }} 
            />
            {measurePoints.map((pt, i) => (
              <Marker key={`measure-${i}`} position={[pt[1], pt[0]]}>
                <Popup>
                  <div className="font-bold text-emerald-600">
                    Point {i + 1}
                  </div>
                </Popup>
              </Marker>
            ))}
            {measurePoints.length > 1 && (
              <Marker position={[measurePoints[measurePoints.length - 1][1], measurePoints[measurePoints.length - 1][0]]}>
                <Popup>
                  <div className="font-bold text-emerald-600">
                    Distance: {measureDistance > 1000 ? `${(measureDistance / 1000).toFixed(2)} km` : `${Math.round(measureDistance)} m`}
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}

        {previousRoutePositions && (
          <Polyline 
            positions={previousRoutePositions} 
            pathOptions={{ color: theme === 'dark' ? '#52525b' : '#a1a1aa', weight: 4, dashArray: '5, 5', opacity: 0.6 }} 
          />
        )}

        {alternativeRoutePositions.map((positions, idx) => (
          <Polyline 
            key={`alt-${idx}`}
            positions={positions} 
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.4 }} 
          />
        ))}

        {routePositions.length > 0 && (
          <>
            <FitRouteBounds positions={routePositions} />
            {showRoutePlayback ? (
              <RoutePlayback 
                positions={routePositions} 
                progress={progress}
                showPlayback={showRoutePlayback}
              />
            ) : (
              <>
                <Polyline 
                  positions={routePositions} 
                  pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9 }} 
                />
                {riskData && riskData.length > 0 && (
                  <RiskPolyline positions={routePositions} riskData={riskData} />
                )}
              </>
            )}
          </>
        )}

        {contextMenu && (
          <Popup 
            position={[contextMenu.lat, contextMenu.lng]}
            closeButton={false}
            closeOnClick={false}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setStartLoc([contextMenu.lng, contextMenu.lat]);
                  setStartQuery(`${contextMenu.lat.toFixed(4)}, ${contextMenu.lng.toFixed(4)}`);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
              >
                <Crosshair size={16} className="text-emerald-500" /> Set as Origin
              </button>
              <button
                onClick={() => {
                  setEndLoc([contextMenu.lng, contextMenu.lat]);
                  setEndQuery(`${contextMenu.lat.toFixed(4)}, ${contextMenu.lng.toFixed(4)}`);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
              >
                <Navigation size={16} className="text-rose-500" /> Set as Destination
              </button>
            </div>
          </Popup>
        )}
      </MapContainer>

      <div 
        className="absolute top-4 left-4 z-[1001] flex flex-col gap-3 pointer-events-auto"
        style={{ isolation: 'isolate' }}
      >
        <FloatingSearchBar 
          setEndLoc={setEndLoc}
          setEndQuery={setEndQuery}
          viewState={{ longitude: viewState.center[0], latitude: viewState.center[1] }}
        />
      </div>

      <div 
        className="absolute top-4 right-4 z-[1001] flex flex-col gap-2 pointer-events-auto"
        style={{ isolation: 'isolate' }}
      >
        <MapLayersMenu 
          mapStyleType={mapStyleType}
          setMapStyleType={setMapStyleType}
          activeLayers={activeLayers}
          setActiveLayers={setActiveLayers}
        />
      </div>

      {activeLayers.includes('measure') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-[1001] pointer-events-auto"
          style={{ isolation: 'isolate' }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 px-6 py-4 min-w-80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Measure Distance</span>
              </div>
              {measurePoints.length > 0 && (
                <button
                  onClick={() => setMeasurePoints([])}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                  title="Clear measurements"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            {measurePoints.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Points</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{measurePoints.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Distance</span>
                  <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    {measureDistance > 1000 
                      ? `${(measureDistance / 1000).toFixed(2)} km`
                      : `${Math.round(measureDistance)} m`
                    }
                  </span>
                </div>
                {measurePoints.length > 1 && (
                  <div className="flex gap-2 mt-3">
                    {measurePoints.slice(0, -1).map((pt, i) => {
                      const p1 = pt;
                      const p2 = measurePoints[i + 1];
                      const R = 6371e3;
                      const φ1 = p1[1] * Math.PI/180;
                      const φ2 = p2[1] * Math.PI/180;
                      const Δφ = (p2[1]-p1[1]) * Math.PI/180;
                      const Δλ = (p2[0]-p1[0]) * Math.PI/180;
                      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                      const segDist = R * c;
                      return (
                        <div key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                          {segDist > 1000 ? `${(segDist/1000).toFixed(1)}km` : `${Math.round(segDist)}m`}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <MousePointer2 size={16} className="animate-pulse" />
                Click on the map to add measurement points
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-20 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => {
            setRotation(0);
            if (mapRef.current) {
              (mapRef.current as any).setBearing?.(0);
              const mapPane = (mapRef.current as any).getPanes?.().mapPane;
              if (mapPane) mapPane.style.transform = 'rotate(0deg)';
            }
          }}
          className="bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
          title="Reset to North (360°)"
        >
          <Compass size={24} style={{ transform: `rotate(${-rotation}deg)`, transition: 'transform 0.3s ease' }} />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => {
            if (mapRef.current) {
              const currentZoom = mapRef.current.getZoom();
              mapRef.current.setZoom(currentZoom + 1, { animate: true, duration: 0.5 });
            }
          }}
          className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button
          onClick={() => {
            if (mapRef.current) {
              const currentZoom = mapRef.current.getZoom();
              mapRef.current.setZoom(currentZoom - 1, { animate: true, duration: 0.5 });
            }
          }}
          className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
        >
          <span className="text-lg font-bold">−</span>
        </button>
      </div>
    </div>
  );
}
