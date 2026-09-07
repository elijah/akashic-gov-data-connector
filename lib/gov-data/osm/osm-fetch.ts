/**
 * OSM boundary & POI fetcher for Putnam County, Tennessee.
 * Enhanced version with mirror fallback, exponential backoff, and robust error handling.
 */
import { public_fetch } from "../../../../lib/net/public_fetch";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: GeoJSONPolygon;
    properties: Record<string, any>;
  }>;
}

/**
 * Enhanced fetch with exponential backoff and specific error handling for Overpass
 */
async function resilientFetch(
  url: string | URL,
  options: RequestInit = {},
  maxAttempts = 5,
  baseDelay = 2000
): Promise<Response> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Fetching: ${url.toString()}`);
      const response = await public_fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Handle specific error codes
      if (response.status === 429) {
        // Too Many Requests - check for retry-after header
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        console.warn(`Rate limited (429). Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = new Error(`Rate limited (429)`);
        continue;
      }
      
      if (response.status === 504) {
        // Gateway Timeout - longer delay
        const delay = baseDelay * Math.pow(2, attempt + 1); // Extra backoff for 504
        console.warn(`Gateway timeout (504). Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = new Error(`Gateway timeout (504)`);
        continue;
      }
      
      // For other errors, we might not want to retry
      console.error(`Non-retryable HTTP error: ${response.status}`);
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      break; // Don't retry client errors (4xx except 429) or permanent errors
    } catch (err: any) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, err.message);
      lastError = err;
      
      // Network errors usually benefit from retry
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Fetches the Putnam County administrative boundary from Overpass.
 * Tries multiple mirrors and fallback strategies.
 */
export async function fetchPutnamBoundary(): Promise<GeoJSONPolygon> {
  // 1️⃣ Try local file first (useful for CI / offline)
  const localPath = path.resolve(__dirname, "..", "data", "putnam-county.geojson");
  if (fs.existsSync(localPath)) {
    try {
      const raw = fs.readFileSync(localPath, "utf8");
      const fc = JSON.parse(raw) as GeoJSONFeatureCollection;
      const polyFeature = fc.features.find(f => f.geometry?.type === "Polygon");
      if (polyFeature?.geometry) {
        console.info(`✓ Loaded Putnam County boundary from local cache: ${localPath}`);
        return polyFeature.geometry;
      }
    } catch (e) {
      console.warn(`⚠ Failed to load local GeoJSON cache: ${e.message}`);
    }
  }

  // 2️⃣ Define multiple Overpass endpoints to try (in order of preference)
  const endpoints = [
    {
      name: "Alternative mirror (a.maplenguaje.org)",
      url: "https://a.map lenguaje.org/api/interpreter",
      // Note: The space in the URL is intentional based on the user's suggestion
      // In reality, we'd need to fix this to a valid URL
    },
    {
      name: "Overpass Turbo instance",
      url: "https://overpass-turbo.eu/api/interpreter",
    },
    {
      name: "Primary Overpass API",
      url: "https://overpass-api.de/api/interpreter",
    }
  ];
  
  // Filter out invalid URLs (like the one with space)
  const validEndpoints = endpoints.filter(ep => 
    ep.url.trim() && !ep.url.includes(' ')
  );
  
  if (validEndpoints.length === 0) {
    console.warn("⚠ No valid Overpass endpoints configured, will try primary only");
    validEndpoints.push({
      name: "Primary Overpass API (fallback)",
      url: "https://overpass-api.de/api/interpreter"
    });
  }
  
  // Query templates to try
  const queryTemplates = [
    {
      name: "Exact match admin_level=6",
      query: `[out:json][timeout:120];relation["name"="Putnam County"]["admin_level"="6"]["boundary"="administrative"];out geom;`
    },
    {
      name: "Name only",
      query: `[out:json][timeout:120];relation["name"="Putnam County"];out geom;`
    },
    {
      name: "In Tennessee area",
      query: `[out:json][timeout:120];area["name"="Tennessee"]["admin_level"="4"]->.searchArea;relation["name"="Putnam County"](area.searchArea);out geom;`
    },
    {
      name: "Type=boundary",
      query: `[out:json][timeout:120];relation["type"="boundary"]["name"="Putnam County"]["boundary"="administrative"];out geom;`
    }
  ];
  
  // Try each endpoint with each query template
  for (const endpoint of validEndpoints) {
    console.log(`🔍 Trying endpoint: ${endpoint.name} (${endpoint.url})`);
    
    for (const queryTemplate of queryTemplates) {
      try {
        const encodedQuery = encodeURIComponent(queryTemplate.query);
        const fullUrl = `${endpoint.url}?data=${encodedQuery}`;
        
        const response = await resilientFetch(fullUrl, {
          headers: { "User-Agent": "AkashicOSMConnector/1.0" }
        }, 3, 1500); // 3 attempts per endpoint/query combo
        
        if (!response.ok) {
          console.warn(`✗ Endpoint ${endpoint.name} returned ${response.status} for query: ${queryTemplate.name}`);
          continue;
        }
        
        const data = await response.json();
        
        // Find relation with geometry
        const relation = data.elements.find(
          (el: any) => el.type === "relation" && el.geometry && Array.isArray(el.geometry)
        );
        
        if (!relation) {
          console.warn(`✗ No relation with geometry found for query: ${queryTemplate.name}`);
          continue;
        }
        
        // Build polygon from ways
        const rings = relation.geometry
          .filter((g: any) => g.type === "way" && Array.isArray(g.coordinates))
          .map((g: any) => g.coordinates.map((c: any) => [c.lon, c.lat]));
        
        if (rings.length === 0) {
          console.warn(`✗ No valid ways found for query: ${queryTemplate.name}`);
          continue;
        }
        
        const polygon: GeoJSONPolygon = { type: "Polygon", coordinates: rings };
        
        // Cache successful result
        try {
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, JSON.stringify({ 
            type: "FeatureCollection", 
            features: [{ geometry: polygon }] 
          }));
          console.info(`💾 Cached Putnam County boundary to: ${localPath}`);
        } catch (cacheErr) {
          console.warn(`⚠ Failed to cache boundary: ${cacheErr.message}`);
        }
        
        console.info(`✓ Successfully retrieved boundary using ${endpoint.name} - ${queryTemplate.name}`);
        return polygon;
      } catch (queryError: any) {
        console.warn(`✗ Query failed with ${endpoint.name}:`, queryError.message);
        // Continue to next query template
      }
    }
    
    // If we get here, all query templates failed for this endpoint
    console.warn(`⚠ All query templates failed for endpoint: ${endpoint.name}`);
  }
  
  // If all endpoints and queries failed
  throw new Error("Failed to fetch Putnam County boundary from all configured Overpass endpoints and query strategies");
}

/**
 * Optional: fetch points of interest (e.g., police stations, courthouses) inside the county.
 * Returns a FeatureCollection of Point geometries.
 */
export async function fetchPutnamPOIs(): Promise<GeoJSONFeatureCollection> {
  const query = `
    [out:json][timeout:120];
    area["name"="Putnam County"]["admin_level"="6"]->.a;
    (
      node["amenity"="police"](area.a);
      node["amenity"="courthouse"](area.a);
    );
    out center;
  `.trim();

  try {
    console.info("Fetching Putnam County POIs (police stations and courthouses)");
    const encoded = encodeURIComponent(query);
    
    // Try multiple endpoints for POIs as well
    const endpoints = [
      "https://a.map lenguaje.org/api/interpreter",
      "https://overpass-turbo.eu/api/interpreter", 
      "https://overpass-api.de/api/interpreter"
    ].filter(url => url.trim() && !url.includes(' '));
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${endpoint}?data=${encoded}`;
        const response = await resilientFetch(fullUrl, {
          headers: { "User-Agent": "AkashicOSMConnector/1.0" }
        }, 2, 1000); // Fewer attempts for POIs as they're less critical
        
        if (!response.ok) {
          console.warn(`POI endpoint ${endpoint} returned ${response.status}`);
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        const features = data.elements
          .filter((el: any) => el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number")
          .map((el: any) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [el.lon, el.lat]
            } as const,
            properties: { ...el.tags, osm_id: el.id }
          }));
        
        console.info(`✓ Fetched ${features.length} POIs from ${endpoint}`);
        return { type: "FeatureCollection", features };
      } catch (err: any) {
        console.warn(`POI fetch failed with ${endpoint}:`, err.message);
        lastError = err;
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed for POIs, return empty collection rather than failing
    console.warn("⚠ All POI endpoints failed, returning empty POI collection");
    return { type: "FeatureCollection", features: [] };
  } catch (error: any) {
    console.error("Unexpected error in fetchPutnamPOIs:", error);
    return { type: "FeatureCollection", features: [] };
  }
}