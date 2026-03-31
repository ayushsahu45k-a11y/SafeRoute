import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '';

export async function getORSRoute(
  start: [number, number],
  end: [number, number],
  profile: string = 'driving-car'
): Promise<any> {
  const res = await axios.post(
    `https://api.openrouteservice.org/v2/directions/${profile}`,
    {
      coordinates: [
        [start[0], start[1]],
        [end[0], end[1]]
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      params: {
        geometries: 'geojson',
        overview: 'full',
        steps: true
      }
    }
  );

  return res.data;
}

export async function getORSRouteWithWaypoints(
  coordinates: [number, number][],
  profile: string = 'driving-car'
): Promise<any> {
  const res = await axios.post(
    `https://api.openrouteservice.org/v2/directions/${profile}`,
    {
      coordinates: coordinates.map(([lng, lat]) => [lng, lat])
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      params: {
        geometries: 'geojson',
        overview: 'full',
        steps: true
      }
    }
  );

  return res.data;
}

export async function searchLocation(query: string) {
  const res = await axios.get(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`
  );
  return res.data;
}

export async function reverseGeocode(lat: number, lon: number) {
  const res = await axios.get(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  );
  return res.data;
}

export function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

export function coordsToLeaflet(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
}
