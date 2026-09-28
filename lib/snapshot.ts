import { demoSnapshot } from "./demo";
import { readJson, writeJson } from "./store";
import { sanitize } from "./sanitize";
import type { Snapshot } from "./types";
import { fetchProposals } from "./upwork";

const SNAPSHOT_PATH = "snapshot.json";

/** The public board data: the latest synced snapshot, or demo traffic if Upwork isn't connected yet. */
export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const snapshot = await readJson<Snapshot>(SNAPSHOT_PATH);
    if (snapshot?.flights.length) return snapshot;
  } catch (err) {
    console.error("Couldn't read snapshot, showing demo data", err);
  }
  return demoSnapshot();
}

/** Pull from Upwork, strip everything private, and save what the public page may show. */
export async function syncSnapshot(): Promise<Snapshot> {
  const salt = process.env.FLIGHT_SALT;
  if (!salt) throw new Error("Missing environment variable FLIGHT_SALT");
  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    source: "upwork",
    flights: sanitize(await fetchProposals(), salt),
  };
  await writeJson(SNAPSHOT_PATH, snapshot);
  return snapshot;
}
