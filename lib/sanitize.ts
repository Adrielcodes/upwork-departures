import { createHmac } from "node:crypto";
import { UPWORK_STATUS_TO_STAGE } from "./stages";
import type { Flight, Gate } from "./types";

/** The only fields we ever request from Upwork. No titles, clients, rates, or cover letters. */
export interface RawProposal {
  id: string;
  status: string;
  createdDateTime: string;
  modifiedDateTime?: string | null;
  category?: string | null;
  contractType?: string | null;
  viewedByClient?: boolean | null;
}

/** Round down to the hour so exact submission times can't be matched to a job post. */
function toHour(iso: string): string {
  const d = new Date(iso);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function flightNumber(id: string, salt: string): string {
  const digest = createHmac("sha256", salt).update(id).digest();
  return `#${(digest.readUInt32BE(0) % 9000) + 1000}`;
}

function gate(contractType?: string | null): Gate {
  if (contractType === "HOURLY") return "HOURLY";
  if (contractType === "FIXED") return "FIXED";
  return "";
}

function destination(category?: string | null): string {
  return (category ?? "").replace(/\s+/g, " ").trim() || "General";
}

export function sanitize(raw: RawProposal[], salt: string): Flight[] {
  const flights: Flight[] = [];
  for (const p of raw) {
    const stage = UPWORK_STATUS_TO_STAGE[p.status];
    if (!stage) continue;
    flights.push({
      flight: flightNumber(p.id, salt),
      departedAt: toHour(p.createdDateTime),
      updatedAt: toHour(p.modifiedDateTime ?? p.createdDateTime),
      stage,
      destination: destination(p.category),
      gate: gate(p.contractType),
      viewed: p.viewedByClient ?? null,
    });
  }
  return flights.sort((a, b) => b.departedAt.localeCompare(a.departedAt));
}
