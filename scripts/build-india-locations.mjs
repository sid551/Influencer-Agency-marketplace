/**
 * Generates `src/data/india-locations.json` from the public
 * `india-state-city` data files (state list + GeoNames-derived cities).
 *
 * Run: `node scripts/build-india-locations.mjs`
 *
 * Output shape:
 *   { "states": string[], "citiesByState": Record<string, string[]> }
 *
 * Only names are kept (no coordinates), deduplicated and sorted per state,
 * so the onboarding bundle stays small. Re-run it if the upstream data
 * changes — nothing else in the repo needs editing.
 */
import { mkdir, writeFile } from "node:fs/promises";

const BASE =
  "https://cdn.jsdelivr.net/npm/india-state-city@1.0.3/lib/assets/";

async function getJson(file) {
  const response = await fetch(BASE + file);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file}: ${response.status}`);
  }
  return response.json();
}

const states = await getJson("state.json");
const cities = await getJson("city.json");

/** ISO code → full state name (case-insensitive). */
const stateByCode = new Map(
  states.map((state) => [state.isoCode.toUpperCase(), state.name]),
);

/** [name, countryCode, isoCode, lat, lng] → grouped city names. */
const grouped = new Map(states.map((state) => [state.name, new Set()]));

let skipped = 0;
for (const [name, countryCode, isoCode] of cities) {
  if (typeof name !== "string") continue;
  if (countryCode !== "IN") {
    skipped += 1;
    continue;
  }
  const stateName = stateByCode.get(String(isoCode).toUpperCase());
  const bucket = stateName ? grouped.get(stateName) : null;
  if (!bucket) {
    skipped += 1;
    continue;
  }
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length > 1) bucket.add(clean);
}

const compare = (a, b) => a.localeCompare(b, "en");

/**
 * Common English/legacy spellings people type. Added alongside the
 * canonical name so both show up in search.
 */
const ALIASES = {
  Bengaluru: ["Bangalore"],
  Mumbai: ["Bombay"],
  Chennai: ["Madras"],
  Kolkata: ["Calcutta"],
  Mysuru: ["Mysore"],
  Visakhapatnam: ["Vizag", "Visakhapatnam"],
  Varanasi: ["Banaras", "Benares"],
  Thiruvananthapuram: ["Trivandrum"],
  Kozhikode: ["Calicut"],
  Puducherry: ["Pondicherry"],
  Bhubaneswar: ["Bhubaneshwar"],
  Guwahati: ["Gauhati"],
};

const stateNames = states.map((state) => state.name).sort(compare);
for (const stateName of stateNames) {
  const bucket = grouped.get(stateName);
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (!bucket.has(canonical)) continue;
    for (const alias of aliases) bucket.add(alias);
  }
}

const output = {
  states: states.map((state) => state.name).sort(compare),
  citiesByState: Object.fromEntries(
    states
      .map((state) => state.name)
      .sort(compare)
      .map((stateName) => [
        stateName,
        [...grouped.get(stateName)].sort(compare),
      ]),
  ),
};

const json = JSON.stringify(output, null, 0);
const outUrl = new URL("../src/data/india-locations.json", import.meta.url);
await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outUrl, json);

const total = Object.values(output.citiesByState).reduce(
  (sum, list) => sum + list.length,
  0,
);
const smallest = Object.entries(output.citiesByState)
  .sort((a, b) => a[1].length - b[1].length)
  .slice(0, 5)
  .map(([name, list]) => `${name}: ${list.length}`);
const largest = Object.entries(output.citiesByState)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 5)
  .map(([name, list]) => `${name}: ${list.length}`);

console.log(`states: ${output.states.length}`);
console.log(`cities: ${total} (skipped ${skipped})`);
console.log(`bytes:  ${json.length}`);
console.log(`smallest: ${smallest.join(", ")}`);
console.log(`largest:  ${largest.join(", ")}`);
console.log(`sample:   ${output.citiesByState["Maharashtra"].slice(0, 8).join(", ")}`);
