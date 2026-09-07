/**
 * Validation tests for OSM ↔ Sheriff location correlation.
 * Run with: npx ts-node connectors/gov-data/osm/test-osm-correlation.ts
 * (or compile with tsc and run node)
 */
import { correlateLocation } from "./correlate";

interface TestCase {
  name: string;
  lat: number;
  lon: number;
  expectInside: boolean;
  maxBoundaryDistMeters?: number; // only checked if expectInside === true
  maxPOIDistMeters?: number; // optional sanity check
}

const testCases: TestCase[] = [
  {
    name: "Cookeville City Hall (inside Putnam County)",
    lat: 36.1629,
    lon: -85.5016,
    expectInside: true,
    maxBoundaryDistMeters: 5000, // should be well within county
    maxPOIDistMeters: 2000 // expect a police/courthouse POI within 2 km
  },
  {
    name: "Nashville (outside Putnam County)",
    lat: 36.1627,
    lon: -86.7816,
    expectInside: false
  },
  {
    name: "Baxter, TN (inside county, small town)",
    lat: 36.1512,
    lon: -85.6325,
    expectInside: true,
    maxBoundaryDistMeters: 5000,
    maxPOIDistMeters: 5000
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n▶ ${tc.name}`);
    try {
      const result = await correlateLocation({
        lat: tc.lat,
        lon: tc.lon,
        description: tc.name
      });

      // Inside/outside check
      if (result.insideBoundary !== tc.expectInside) {
        throw new Error(
          `Expected insideBoundary=${tc.expectInside}, got ${result.insideBoundary}`
        );
      }
      console.log(`  ✅ insideBoundary = ${result.insideBoundary}`);

      // Distance to boundary (only for inside points)
      if (tc.expectInside && typeof tc.maxBoundaryDistMeters === "number") {
        if (result.distanceToBoundaryMeters > tc.maxBoundaryDistMeters) {
          throw new Error(
            `Distance to boundary ${result.distanceToBoundaryMeters.toFixed(
              0
            )} m exceeds limit ${tc.maxBoundaryDistMeters} m`
          );
        }
        console.log(
          `  ✅ distanceToBoundary = ${result.distanceToBoundaryMeters.toFixed(
            0
          )} m (limit ${tc.maxBoundaryDistMeters} m)`
        );
      }

      // Nearest POI sanity check
      if (tc.maxPOIDistMeters && result.nearestPOI) {
        if (result.nearestPOI.distanceMeters > tc.maxPOIDistMeters) {
          throw new Error(
            `Nearest POI (${result.nearestPOI.name}) at ${result.nearestPOI.distanceMeters.toFixed(
              0
            )} m exceeds limit ${tc.maxPOIDistMeters} m`
          );
        }
        console.log(
          `  ✅ nearest POI = ${result.nearestPOI.name} (${result.nearestPOI.type}) @ ${result.nearestPOI.distanceMeters.toFixed(
            0
          )} m`
        );
      } else if (tc.maxPOIDistMeters && !result.nearestPOI) {
        console.warn(
          `  ⚠️  No POI found – cannot verify maxPOIDistMeters`
        );
      }

      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});