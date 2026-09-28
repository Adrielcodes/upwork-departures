import type { Stage } from "./types";

/** Upwork's VendorProposalStatusName → a stage on the board. */
export const UPWORK_STATUS_TO_STAGE: Record<string, Stage | undefined> = {
  Pending: "checkin",
  // Careful: for a freelancer, "Accepted" means Upwork accepted the submission,
  // not that the client accepted me.
  Accepted: "enroute",
  Activated: "contact",
  Offered: "approach",
  Hired: "landed",
  Declined: "cancelled",
  Archived: "diverted",
  Withdrawn: "grounded",
  // "Invalid" is intentionally unmapped and dropped.
};

export const UPWORK_STATUSES = Object.keys(UPWORK_STATUS_TO_STAGE);

interface StageInfo {
  /** Status label shown in the table */
  label: string;
  /** Lamp colour on the board */
  lamp: "amber" | "white" | "green" | "cyan" | "red" | "dim";
  /** Plain-English meaning for the legend */
  meaning: string;
  /** Did the client engage? */
  connected: boolean;
  /** Is it over, one way or another? */
  closed: boolean;
}

export const STAGES: Record<Stage, StageInfo> = {
  checkin: { label: "Pending", lamp: "amber", meaning: "Just sent — Upwork is still processing it", connected: false, closed: false },
  enroute: { label: "Waiting", lamp: "white", meaning: "Sent — waiting to hear back from the client", connected: false, closed: false },
  contact: { label: "Replied", lamp: "cyan", meaning: "Client started a conversation", connected: true, closed: false },
  approach: { label: "Offer", lamp: "cyan", meaning: "Client sent an offer", connected: true, closed: false },
  landed: { label: "Hired", lamp: "green", meaning: "Won the job", connected: true, closed: true },
  cancelled: { label: "Declined", lamp: "red", meaning: "Client passed", connected: false, closed: true },
  diverted: { label: "No reply", lamp: "dim", meaning: "Job closed without a response", connected: false, closed: true },
  grounded: { label: "Withdrawn", lamp: "dim", meaning: "I pulled the proposal", connected: false, closed: true },
};

export const STAGE_ORDER: Stage[] = ["checkin", "enroute", "contact", "approach", "landed", "cancelled", "diverted", "grounded"];
