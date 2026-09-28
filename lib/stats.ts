import { STAGES, STAGE_ORDER } from "./stages";
import type { Flight, Stage } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export interface FunnelStep {
  label: string;
  count: number;
}

export interface Destination {
  name: string;
  sent: number;
  connected: number;
  rate: number;
}

export interface Week {
  weekStart: string;
  sent: number;
  connected: number;
}

export interface Stats {
  /** All proposals in range, including ones Upwork is still processing */
  total: number;
  /** Proposals that actually reached a client (excludes Pending) */
  sent: number;
  connected: number;
  hired: number;
  waiting: number;
  connectRate: number;
  hireRate: number;
  /** Age in days of the oldest proposal still waiting on a reply */
  oldestWaitingDays: number | null;
  funnel: FunnelStep[];
  destinations: Destination[];
  statusCounts: { stage: Stage; count: number }[];
}

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function computeStats(flights: Flight[], now = new Date()): Stats {
  // Pending proposals haven't reached a client yet, so they don't count against rates
  const sent = flights.filter((f) => f.stage !== "checkin");
  const connected = sent.filter((f) => STAGES[f.stage].connected);
  const offered = sent.filter((f) => f.stage === "approach" || f.stage === "landed");
  const hired = sent.filter((f) => f.stage === "landed");
  const waiting = flights.filter((f) => !STAGES[f.stage].closed && !STAGES[f.stage].connected);

  const withViewData = sent.filter((f) => f.viewed !== null);
  const viewed = withViewData.filter((f) => f.viewed || STAGES[f.stage].connected);

  const byDestination = new Map<string, { sent: number; connected: number }>();
  for (const f of sent) {
    const d = byDestination.get(f.destination) ?? { sent: 0, connected: 0 };
    d.sent++;
    if (STAGES[f.stage].connected) d.connected++;
    byDestination.set(f.destination, d);
  }

  const oldestWaiting = waiting.reduce<number | null>((min, f) => {
    const t = Date.parse(f.departedAt);
    return min === null || t < min ? t : min;
  }, null);

  return {
    total: flights.length,
    sent: sent.length,
    connected: connected.length,
    hired: hired.length,
    waiting: waiting.length,
    connectRate: ratio(connected.length, sent.length),
    hireRate: ratio(hired.length, sent.length),
    oldestWaitingDays: oldestWaiting === null ? null : Math.floor((now.getTime() - oldestWaiting) / DAY),
    funnel: [
      { label: "Sent", count: sent.length },
      ...(withViewData.length > 0 ? [{ label: "Viewed", count: viewed.length }] : []),
      { label: "Replied", count: connected.length },
      { label: "Offer", count: offered.length },
      { label: "Hired", count: hired.length },
    ],
    destinations: [...byDestination.entries()]
      .map(([name, d]) => ({ name, ...d, rate: ratio(d.connected, d.sent) }))
      .sort((a, b) => b.sent - a.sent),
    statusCounts: STAGE_ORDER.map((stage) => ({ stage, count: flights.filter((f) => f.stage === stage).length })),
  };
}

/** Proposals per Monday-based week, oldest first. */
export function weeklyActivity(flights: Flight[], weeks: number, now = new Date()): Week[] {
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const sent = flights.filter((f) => f.stage !== "checkin");

  return Array.from({ length: weeks }, (_, i) => {
    const start = monday.getTime() - (weeks - 1 - i) * 7 * DAY;
    const inWeek = sent.filter((f) => {
      const t = Date.parse(f.departedAt);
      return t >= start && t < start + 7 * DAY;
    });
    return {
      weekStart: new Date(start).toISOString().slice(0, 10),
      sent: inWeek.length,
      connected: inWeek.filter((f) => STAGES[f.stage].connected).length,
    };
  });
}
