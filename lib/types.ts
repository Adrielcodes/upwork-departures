/**
 * Everything in this file is safe to show publicly.
 * Raw Upwork data never leaves the server — see lib/sanitize.ts.
 */

export type Stage =
  | "checkin" // Pending: still being validated by Upwork
  | "enroute" // Accepted: submitted, waiting on the client
  | "contact" // Activated: the client replied / started a conversation
  | "approach" // Offered: an offer is on the table
  | "landed" // Hired
  | "cancelled" // Declined by the client
  | "diverted" // Archived: the job closed without a response
  | "grounded"; // Withdrawn by me

export type Gate = "HRLY" | "FIXD" | "----";

export interface Flight {
  /** Salted hash of the proposal id — stable, but can't be traced back to the job */
  flight: string;
  /** Submission time, rounded down to the hour */
  departedAt: string;
  /** Last status change, rounded down to the hour */
  updatedAt: string;
  stage: Stage;
  /** Upwork job category, e.g. "WEB, MOBILE & SOFTWARE DEV" */
  destination: string;
  gate: Gate;
  /** null when Upwork didn't report it */
  viewed: boolean | null;
}

export interface Snapshot {
  generatedAt: string;
  source: "upwork" | "demo";
  flights: Flight[];
}
