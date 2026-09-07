// Find nearest POI
  let nearest: CorrelationResult["nearestPOI"] = null;
  for (const feat of pois.features) {
    // Handle different geometry types - we expect Points for POIs
    let poiPt: [number, number] | null = null;
    
    if (feat.geometry.type === "Point") {
      const coords = feat.geometry.coordinates as [number, number];
      poiPt = coords;
    } else if (feat.geometry.type === "Polygon") {
      // For polygons, take the first coordinate of the first ring
      const rings = feat.geometry.coordinates as number[][][];
      if (rings.length > 0 && rings[0].length > 0) {
        poiPt = rings[0][0] as [number, number];
      }
    }
    
    if (poiPt) {
      const d = haversineMeters(pt, poiPt);
      if (!nearest || d < nearest.distanceMeters) {
        nearest = {
          id: feat.properties.osm_id?.toString() ?? "unknown",
          name: feat.properties.name ?? "Unnamed",
          type: feat.properties.amenity ?? feat.properties.office ?? "POI",
          distanceMeters: d
        };
      }
    }
  }