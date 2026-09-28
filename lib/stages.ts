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
  /** Text on the split-flap STATUS column (max 9 chars) */
  remark: string;
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
  checkin: { remark: "PENDING", lamp: "amber", meaning: "Just sent — Upwork is still processing it", connected: false, closed: false },
  enroute: { remark: "WAITING", lamp: "white", meaning: "Sent — waiting to hear back from the client", connected: false, closed: false },
  contact: { remark: "REPLIED", lamp: "cyan", meaning: "Client started a conversation", connected: true, closed: false },
  approach: { remark: "OFFER", lamp: "cyan", meaning: "Client sent an offer", connected: true, closed: false },
  landed: { remark: "HIRED", lamp: "green", meaning: "Won the job", connected: true, closed: true },
  cancelled: { remark: "DECLINED", lamp: "red", meaning: "Client passed", connected: false, closed: true },
  diverted: { remark: "NO REPLY", lamp: "dim", meaning: "Job closed without a response", connected: false, closed: true },
  grounded: { remark: "WITHDRAWN", lamp: "dim", meaning: "I pulled the proposal", connected: false, closed: true },
};

export const STAGE_ORDER: Stage[] = ["checkin", "enroute", "contact", "approach", "landed", "cancelled", "diverted", "grounded"];
