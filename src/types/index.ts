export interface Coordinates {
  lng: number;
  lat: number;
}

export interface RouteData {
  geometry: {
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
  legs?: {
    steps: RouteStep[];
  }[];
}

export interface RouteStep {
  distance: number;
  maneuver: {
    type: string;
    modifier?: string;
    instruction?: string;
    name?: string;
  };
}

export interface RiskSegment {
  start?: [number, number];
  end?: [number, number];
  risk_probability?: number;
  risk_score?: number;
  traffic_level?: number;
}

export interface Incident {
  type: string;
  severity: string;
  location: [number, number];
}

export interface WeatherData {
  weather?: {
    main: string;
    description?: string;
  }[];
  main?: {
    temp: number;
  };
}

export interface GeocodingResult {
  id: string | number;
  place_id?: number;
  place_name: string;
  display_name?: string;
  center: [number, number];
  lon?: string;
  lat?: string;
  type?: string;
}

export interface SavedLocation {
  id: number;
  name: string;
  address: string;
  loc: [number, number];
  timestamp: number;
}

export interface UserProfile {
  name: string;
  email: string;
  photo?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
}

export type Theme = 'dark' | 'light';
export type VehicleType = 'driving' | 'cycling';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface RouteAnalysis {
  segments: RiskSegment[];
  incidents: Incident[];
  overallRisk: number;
  safetyScore: number;
}

export interface AirQualityStation {
  lat: number;
  lon: number;
  value: number;
  parameter: string;
  unit: string;
  city: string;
  location: string;
}

export interface ContextMenuPosition {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export interface MeasurePoint {
  lng: number;
  lat: number;
}
