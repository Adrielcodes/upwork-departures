import { sanitize, type RawProposal } from "./sanitize";
import type { Snapshot } from "./types";

/**
 * Realistic sample traffic so the board has something to show before
 * the Upwork API key is approved. Always labelled "DEMO" in the UI.
 */

const CATEGORIES: [string, number][] = [
  ["Web, Mobile & Software Dev", 0.58],
  ["Design & Creative", 0.14],
  ["Data Science & Analytics", 0.1],
  ["IT & Networking", 0.08],
  ["Engineering & Architecture", 0.05],
  ["Sales & Marketing", 0.05],
];

// Small seeded PRNG so the demo board is stable between renders
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: [T, number][]): T {
  let r = rand();
  for (const [value, weight] of weighted) {
    if ((r -= weight) <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

export function demoSnapshot(now = new Date()): Snapshot {
  const rand = mulberry32(20260927);
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const raw: RawProposal[] = [];
  for (let i = 0; i < 128; i++) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.15) * 98);
    const hour = 13 + Math.floor(rand() * 10); // mostly afternoons/evenings UTC
    const created = new Date(today.getTime() - daysAgo * 86_400_000 + hour * 3_600_000);
    if (created > now) created.setUTCDate(created.getUTCDate() - 1);

    let status: string;
    if (daysAgo < 1) status = pick(rand, [["Pending", 0.3], ["Accepted", 0.7]]);
    else if (daysAgo < 6)
      status = pick(rand, [["Accepted", 0.72], ["Activated", 0.16], ["Declined", 0.08], ["Withdrawn", 0.04]]);
    else
      status = pick(rand, [
        ["Archived", 0.55],
        ["Declined", 0.19],
        ["Activated", 0.08],
        ["Offered", 0.03],
        ["Hired", 0.08],
        ["Withdrawn", 0.07],
      ]);

    const engaged = ["Activated", "Offered", "Hired"].includes(status);
    raw.push({
      id: `demo-${i}`,
      status,
      createdDateTime: created.toISOString(),
      modifiedDateTime: new Date(Math.min(now.getTime(), created.getTime() + Math.floor(rand() * 5) * 86_400_000)).toISOString(),
      category: pick(rand, CATEGORIES),
      contractType: rand() < 0.62 ? "FIXED" : "HOURLY",
      viewedByClient: engaged || rand() < 0.38,
    });
  }

  return { generatedAt: now.toISOString(), source: "demo", flights: sanitize(raw, "demo-salt") };
}
