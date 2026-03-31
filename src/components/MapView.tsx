import { AlertTriangle, Construction, Crosshair, MapPin, Navigation } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import Map, { FullscreenControl, GeolocateControl, Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import FloatingSearchBar from './FloatingSearchBar';
import { MapLayersMenu } from './MapLayersMenu';

interface MapViewProps {
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
}

export default function MapView({ 
  routeData, alternativeRoutes, riskData, previousRouteData, previousRiskData, incidentsData, 
  startLoc, endLoc, 
  setStartLoc, setEndLoc,
  setStartQuery, setEndQuery,
  theme, showIncidents, showRoutePlayback, playbackSpeed = 1, mapStyleType = 'default', setMapStyleType,
  activeLayers = [], setActiveLayers
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: 77.4126, // Default to India center roughly
    latitude: 23.2599,
    zoom: 5
  });
  const [progress, setProgress] = useState(1);
  const [contextMenu, setContextMenu] = useState<{lng: number, lat: number, x: number, y: number} | null>(null);
  const [hoveredIncident, setHoveredIncident] = useState<any | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<any | null>(null);
  const [poiResults, setPoiResults] = useState<any[]>([]);

  // Map styles based on theme and mapStyleType using completely free providers
  const getMapStyle = () => {
    if (mapStyleType === 'satellite') {
      return {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      };
    }
    if (mapStyleType === 'navigation') {
      return "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
    }
    // Default / Fallback to Carto
    return theme === 'dark' 
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  };

  useEffect(() => {
    if (startLoc) {
      setViewState(prev => ({
        ...prev,
        longitude: startLoc[0],
        latitude: startLoc[1],
        zoom: 12
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
    // Base duration is 2 seconds for initial load, 10 seconds for playback
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
        // Loop playback
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

  const geojson = useMemo(() => {
    if (!riskData || riskData.length === 0) return null;
    
    const visibleCount = Math.max(1, Math.floor(riskData.length * progress));
    const visibleSegments = riskData.slice(0, visibleCount);

    return {
      type: 'FeatureCollection',
      features: visibleSegments.map((segment: any) => ({
        type: 'Feature',
        properties: {
          risk: segment.risk_probability || segment.risk_score || 0,
          traffic: segment.traffic_level || 0,
          explanation: segment.explanation || 'No specific risk factors'
        },
        geometry: {
          type: 'LineString',
          coordinates: [segment.start, segment.end]
        }
      }))
    };
  }, [riskData, progress]);

  const previousGeojson = useMemo(() => {
    if (!previousRouteData || !previousRouteData.geometry) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: previousRouteData.geometry
    };
  }, [previousRouteData]);

  const alternativeGeojson = useMemo(() => {
    if (!alternativeRoutes || alternativeRoutes.length === 0) return null;
    const validRoutes = alternativeRoutes.filter((r: any) => r && r.geometry);
    if (validRoutes.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: validRoutes.map((route: any) => ({
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }))
    };
  }, [alternativeRoutes]);

  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  // Calculate distance for measure tool
  const measureDistance = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      const p1 = measurePoints[i - 1];
      const p2 = measurePoints[i];
      // Haversine formula
      const R = 6371e3; // metres
      const φ1 = p1[1] * Math.PI/180; // φ, λ in radians
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

  const [bearing, setBearing] = useState(0);

  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute top-4 left-4 z-[1000]">
        <FloatingSearchBar 
          setEndLoc={setEndLoc} 
          setEndQuery={setEndQuery} 
          viewState={viewState}
        />
      </div>
      <div className="absolute top-4 right-4 z-[1000]">
        <MapLayersMenu 
          mapStyleType={mapStyleType} 
          setMapStyleType={setMapStyleType} 
          activeLayers={activeLayers}
          setActiveLayers={(layers) => {
            if (setActiveLayers) setActiveLayers(layers);
            if (!layers.includes('measure')) setMeasurePoints([]);
          }}
        />
      </div>
      <button
        onClick={() => {
          setViewState(v => ({ ...v, bearing: 0 }));
          setBearing(0);
        }}
        className="absolute top-32 right-4 z-[1000] p-2.5 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        title="Reset bearing to North"
      >
        <Navigation 
          size={22} 
          className="transition-transform duration-300"
          style={{ transform: `rotate(${-bearing}deg)` }}
        />
      </button>
      <Map
        {...viewState}
        onMove={evt => {
          setViewState(evt.viewState);
          setBearing(evt.viewState.bearing || 0);
        }}
        mapStyle={getMapStyle() as any}
        interactiveLayerIds={geojson ? ['route-layer'] : []}
        onMouseMove={(e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.layer.id === 'route-layer') {
              setHoveredSegment({
                lng: e.lngLat.lng,
                lat: e.lngLat.lat,
                properties: feature.properties
              });
            }
          } else {
            setHoveredSegment(null);
          }
        }}
        onMouseLeave={() => setHoveredSegment(null)}
        onContextMenu={(e) => {
          e.originalEvent.preventDefault();
          setContextMenu({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            x: e.point.x,
            y: e.point.y
          });
        }}
        onClick={(e) => {
          if (activeLayers.includes('measure')) {
            setMeasurePoints([...measurePoints, [e.lngLat.lng, e.lngLat.lat]]);
            return;
          }
          setContextMenu(null);
          setPoiResults([]);
        }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {startLoc && (
          <Marker longitude={startLoc[0]} latitude={startLoc[1]} anchor="bottom">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-emerald-500 drop-shadow-lg"
            >
              <MapPin size={36} fill="currentColor" className={theme === 'dark' ? "text-zinc-950" : "text-white"} />
            </motion.div>
          </Marker>
        )}
        
        {endLoc && (
          <Marker longitude={endLoc[0]} latitude={endLoc[1]} anchor="bottom">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-rose-500 drop-shadow-lg"
            >
              <MapPin size={36} fill="currentColor" className={theme === 'dark' ? "text-zinc-950" : "text-white"} />
            </motion.div>
          </Marker>
        )}

        <AnimatePresence>
          {Array.isArray(poiResults) && poiResults.map((poi: any, idx: number) => (
            <Marker key={`poi-${idx}`} longitude={parseFloat(poi.lon || poi.center?.[0])} latitude={parseFloat(poi.lat || poi.center?.[1])} anchor="bottom">
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex flex-col items-center text-blue-500 drop-shadow-md cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  if (setEndLoc && setEndQuery) {
                    setEndLoc([parseFloat(poi.lon || poi.center?.[0]), parseFloat(poi.lat || poi.center?.[1])]);
                    setEndQuery(poi.display_name || poi.place_name);
                    setPoiResults([]);
                  }
                }}
              >
                <MapPin size={28} fill="currentColor" className={theme === 'dark' ? "text-zinc-950" : "text-white"} />
                <div className="mt-1 px-2 py-0.5 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 rounded-md shadow-sm whitespace-nowrap max-w-[120px] truncate border border-zinc-200 dark:border-zinc-700">
                  {poi.name || (poi.display_name || poi.place_name || '').split(',')[0]}
                </div>
              </motion.div>
            </Marker>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {showIncidents && incidentsData && incidentsData.map((incident: any, idx: number) => (
            <Marker key={idx} longitude={incident.location[0]} latitude={incident.location[1]} anchor="center">
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onMouseEnter={() => setHoveredIncident(incident)}
                onMouseLeave={() => setHoveredIncident(null)}
                className={`p-2 rounded-full shadow-lg cursor-pointer transition-transform ${
                  incident.type.toLowerCase() === 'accident' 
                    ? (incident.severity.toLowerCase() === 'high' ? 'bg-rose-600 text-white ring-4 ring-rose-600/30 scale-125 z-10' : 'bg-rose-400 text-white') 
                    : 'bg-amber-500 text-white'
                }`}
              >
                {incident.type.toLowerCase() === 'accident' ? <AlertTriangle size={incident.severity.toLowerCase() === 'high' ? 20 : 16} /> : <Construction size={16} />}
              </motion.div>
            </Marker>
          ))}
        </AnimatePresence>

        {hoveredIncident && (
          <Popup
            longitude={hoveredIncident.location[0]}
            latitude={hoveredIncident.location[1]}
            anchor="bottom"
            offset={[0, -10]}
            closeButton={false}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                {hoveredIncident.type.toLowerCase() === 'accident' ? <AlertTriangle size={14} className="text-rose-500" /> : <Construction size={14} className="text-amber-500" />}
                <span className="font-bold">{hoveredIncident.type.toUpperCase()}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Severity: <span className={`font-semibold ${hoveredIncident.severity.toLowerCase() === 'high' ? 'text-rose-500' : 'text-amber-500'}`}>{hoveredIncident.severity}</span>
              </p>
            </div>
          </Popup>
        )}

        {hoveredSegment && (
          <Popup
            longitude={hoveredSegment.lng}
            latitude={hoveredSegment.lat}
            anchor="bottom"
            offset={[0, -10]}
            closeButton={false}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <Navigation size={14} className="text-emerald-500" />
                <span className="font-bold">Route Segment</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                Risk Score: <span className={`font-semibold ${(hoveredSegment.properties?.risk || 0) > 0.7 ? 'text-rose-500' : (hoveredSegment.properties?.risk || 0) > 0.4 ? 'text-amber-500' : 'text-emerald-500'}`}>{((hoveredSegment.properties?.risk || 0) * 100).toFixed(0)}%</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                Traffic: <span className="font-semibold">{((hoveredSegment.properties?.traffic || 0) * 100).toFixed(0)}%</span>
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {hoveredSegment.properties?.explanation || 'No specific risk factors'}
              </p>
            </div>
          </Popup>
        )}

        {activeLayers.includes('transit') && (
          <Source id="transit" type="raster" tiles={['https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="transit-layer" type="raster" minzoom={0} maxzoom={22} />
          </Source>
        )}

        {activeLayers.includes('biking') && (
          <Source id="biking" type="raster" tiles={['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="biking-layer" type="raster" minzoom={0} maxzoom={22} />
          </Source>
        )}

        {activeLayers.includes('terrain') && (
          <Source id="terrain" type="raster" tiles={['https://tile.opentopomap.org/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="terrain-layer" type="raster" minzoom={0} maxzoom={22} />
          </Source>
        )}

        {activeLayers.includes('traffic') && (
          <Source id="traffic" type="raster" tiles={['https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="traffic-layer" type="raster" minzoom={0} maxzoom={22} paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}

        {activeLayers.includes('streetview') && (
          <Source id="streetview" type="raster" tiles={['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="streetview-layer" type="raster" minzoom={0} maxzoom={22} paint={{ 'raster-opacity': 0.8 }} />
          </Source>
        )}

        {activeLayers.includes('wildfires') && (
          <Source id="wildfires" type="raster" tiles={['https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2']} tileSize={256}>
            <Layer id="wildfires-layer" type="raster" minzoom={0} maxzoom={22} paint={{ 'raster-opacity': 0.7 }} />
          </Source>
        )}

        {activeLayers.includes('airquality') && (
          <Source id="airquality" type="raster" tiles={['https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=demo']} tileSize={256}>
            <Layer id="airquality-layer" type="raster" minzoom={0} maxzoom={22} paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}

        {activeLayers.includes('traveltime') && startLoc && (
          <Source id="traveltime" type="geojson" data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                Array.from({ length: 36 }).map((_, i) => {
                  const angle = (i * 10 * Math.PI) / 180;
                  const radius = 0.05; // approx 5km in degrees
                  return [
                    startLoc[0] + radius * Math.cos(angle),
                    startLoc[1] + radius * Math.sin(angle)
                  ];
                }).concat([[startLoc[0] + 0.05, startLoc[1]]])
              ]
            }
          }}>
            <Layer 
              id="traveltime-layer" 
              type="fill" 
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.2
              }} 
            />
            <Layer 
              id="traveltime-layer-outline" 
              type="line" 
              paint={{
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }} 
            />
          </Source>
        )}

        {activeLayers.includes('measure') && measurePoints.length > 0 && (
          <>
            <Source id="measure-line" type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: measurePoints
              }
            }}>
              <Layer 
                id="measure-line-layer" 
                type="line" 
                paint={{
                  'line-color': '#10b981',
                  'line-width': 3,
                  'line-dasharray': [2, 2]
                }} 
              />
            </Source>
            
            {measurePoints.map((pt, i) => (
              <Marker key={`measure-pt-${i}`} longitude={pt[0]} latitude={pt[1]}>
                <div className="w-3 h-3 bg-white border-2 border-emerald-500 rounded-full shadow-md" />
              </Marker>
            ))}
            
            {measurePoints.length > 1 && (
              <Popup
                longitude={measurePoints[measurePoints.length - 1][0]}
                latitude={measurePoints[measurePoints.length - 1][1]}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={[0, -10]}
              >
                <div className="px-2 py-1 text-sm font-bold text-emerald-600">
                  {measureDistance > 1000 
                    ? `${(measureDistance / 1000).toFixed(2)} km` 
                    : `${Math.round(measureDistance)} m`}
                </div>
              </Popup>
            )}
          </>
        )}

        {previousGeojson && (
          <Source id="previous-route" type="geojson" data={previousGeojson as any}>
            <Layer 
              id="previous-route-layer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-width': 4,
                'line-color': theme === 'dark' ? '#52525b' : '#a1a1aa', // zinc-600 or zinc-400
                'line-dasharray': [2, 2],
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {alternativeGeojson && (
          <Source id="alternative-routes" type="geojson" data={alternativeGeojson as any}>
            <Layer 
              id="alternative-routes-layer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-width': 4,
                'line-color': theme === 'dark' ? '#3b82f6' : '#60a5fa', // blue-500 or blue-400
                'line-opacity': 0.4
              }}
            />
          </Source>
        )}

        {geojson && (
          <Source id="route" type="geojson" data={geojson as any}>
            <Layer 
              id="route-layer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['get', 'traffic'],
                  0, 6,
                  0.5, 8,
                  1.0, 12
                ],
                'line-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'risk'],
                  0, '#10b981',    // Low risk (< 0.4) Emerald
                  0.4, '#f59e0b',  // Medium risk (0.4 - 0.7) Amber
                  0.7, '#f43f5e',  // High risk (>= 0.7) Rose
                  1.0, '#9f1239'   // Severe risk Dark Rose
                ]
              }}
            />
          </Source>
        )}

        {contextMenu && (
          <Popup
            longitude={contextMenu.lng}
            latitude={contextMenu.lat}
            anchor="top-left"
            closeButton={false}
            closeOnClick={false}
            className="z-50"
            offset={[0, 0]}
            maxWidth="200px"
          >
            <div className="flex flex-col gap-1 p-1 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800">
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setStartLoc([contextMenu.lng, contextMenu.lat]);
                  setStartQuery(`${contextMenu.lat.toFixed(4)}, ${contextMenu.lng.toFixed(4)}`);
                  setContextMenu(null);
                }}
              >
                <Crosshair size={16} className="text-emerald-500" /> Set as Origin
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setEndLoc([contextMenu.lng, contextMenu.lat]);
                  setEndQuery(`${contextMenu.lat.toFixed(4)}, ${contextMenu.lng.toFixed(4)}`);
                  setContextMenu(null);
                }}
              >
                <Navigation size={16} className="text-rose-500" /> Set as Destination
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
