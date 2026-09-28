import { STAGES } from "./stages";
import type { Flight } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export interface RouteStop {
  code: string;
  label: string;
  count: number;
}

export interface Destination {
  name: string;
  sent: number;
  connected: number;
  rate: number;
}

export interface Stats {
  total: number;
  inTheAir: number;
  connected: number;
  hired: number;
  connectRate: number;
  hireRate: number;
  viewRate: number | null;
  last30: number;
  /** Proposals sent per week, oldest first */
  weekly: { weekStart: string; sent: number; connected: number }[];
  route: RouteStop[];
  destinations: Destination[];
}

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function computeStats(flights: Flight[], now = new Date(), weeks = 12): Stats {
  // "checkin" proposals haven't really left yet, so they don't count against rates
  const sent = flights.filter((f) => f.stage !== "checkin");
  const connected = sent.filter((f) => STAGES[f.stage].connected);
  const offered = sent.filter((f) => f.stage === "approach" || f.stage === "landed");
  const hired = sent.filter((f) => f.stage === "landed");

  const withViewData = sent.filter((f) => f.viewed !== null);
  const viewed = withViewData.filter((f) => f.viewed || STAGES[f.stage].connected);

  // Monday-based weeks, oldest first
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday.getTime() - (weeks - 1 - i) * 7 * DAY);
    const end = start.getTime() + 7 * DAY;
    const inWeek = sent.filter((f) => {
      const t = Date.parse(f.departedAt);
      return t >= start.getTime() && t < end;
    });
    return {
      weekStart: start.toISOString().slice(0, 10),
      sent: inWeek.length,
      connected: inWeek.filter((f) => STAGES[f.stage].connected).length,
    };
  });

  const byDestination = new Map<string, { sent: number; connected: number }>();
  for (const f of sent) {
    const d = byDestination.get(f.destination) ?? { sent: 0, connected: 0 };
    d.sent++;
    if (STAGES[f.stage].connected) d.connected++;
    byDestination.set(f.destination, d);
  }
  const destinations = [...byDestination.entries()]
    .map(([name, d]) => ({ name, ...d, rate: ratio(d.connected, d.sent) }))
    .sort((a, b) => b.sent - a.sent);

  const route: RouteStop[] = [
    { code: "SNT", label: "Sent", count: sent.length },
    ...(withViewData.length > 0 ? [{ code: "VWD", label: "Viewed", count: viewed.length }] : []),
    { code: "RPL", label: "Replied", count: connected.length },
    { code: "OFR", label: "Offer", count: offered.length },
    { code: "HRD", label: "Hired", count: hired.length },
  ];

  return {
    total: sent.length,
    inTheAir: flights.filter((f) => !STAGES[f.stage].closed && !STAGES[f.stage].connected).length,
    connected: connected.length,
    hired: hired.length,
    connectRate: ratio(connected.length, sent.length),
    hireRate: ratio(hired.length, sent.length),
    viewRate: withViewData.length > 0 ? ratio(viewed.length, withViewData.length) : null,
    last30: sent.filter((f) => now.getTime() - Date.parse(f.departedAt) < 30 * DAY).length,
    weekly,
    route,
    destinations,
  };
}
