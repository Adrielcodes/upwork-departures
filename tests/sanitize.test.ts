import { describe, expect, it } from "vitest";
import { sanitize, type RawProposal } from "@/lib/sanitize";
import { computeStats } from "@/lib/stats";
import { demoSnapshot } from "@/lib/demo";

const base: RawProposal = {
  id: "1234567890",
  status: "Accepted",
  createdDateTime: "2026-09-20T14:37:52Z",
  modifiedDateTime: "2026-09-21T09:12:00Z",
  category: "Web, Mobile & Software Dev",
  contractType: "FIXED",
  viewedByClient: true,
};

describe("sanitize", () => {
  it("keeps only public fields", () => {
    const [flight] = sanitize([{ ...base, coverLetter: "secret", client: "Acme" } as RawProposal], "salt");
    expect(Object.keys(flight).sort()).toEqual(["departedAt", "destination", "flight", "gate", "stage", "updatedAt", "viewed"]);
    expect(JSON.stringify(flight)).not.toContain("secret");
    expect(JSON.stringify(flight)).not.toContain(base.id);
  });

  it("rounds times down to the hour", () => {
    const [flight] = sanitize([base], "salt");
    expect(flight.departedAt).toBe("2026-09-20T14:00:00.000Z");
    expect(flight.updatedAt).toBe("2026-09-21T09:00:00.000Z");
  });

  it("scrambles ids into flight numbers that depend on the salt", () => {
    const a = sanitize([base], "salt-a")[0].flight;
    expect(a).toMatch(/^#\d{4}$/);
    expect(sanitize([base], "salt-a")[0].flight).toBe(a);
    expect(sanitize([base], "salt-b")[0].flight).not.toBe(a);
  });

  it("maps Upwork statuses and drops Invalid", () => {
    const flights = sanitize(
      ["Pending", "Accepted", "Activated", "Offered", "Hired", "Declined", "Archived", "Withdrawn", "Invalid"].map((status, i) => ({
        ...base,
        id: String(i),
        status,
      })),
      "salt"
    );
    expect(flights.map((f) => f.stage).sort()).toEqual(
      ["cancelled", "checkin", "contact", "diverted", "enroute", "grounded", "landed", "approach"].sort()
    );
  });

  it("keeps category names readable and falls back to General", () => {
    const dest = (category: string | null) => sanitize([{ ...base, category }], "s")[0].destination;
    expect(dest("Web, Mobile & Software Dev")).toBe("Web, Mobile & Software Dev");
    expect(dest("  Design &   Creative ")).toBe("Design & Creative");
    expect(dest(null)).toBe("General");
  });

  it("maps contract types to pay types", () => {
    const gate = (contractType: string | null) => sanitize([{ ...base, contractType }], "s")[0].gate;
    expect(gate("HOURLY")).toBe("HOURLY");
    expect(gate("FIXED")).toBe("FIXED");
    expect(gate(null)).toBe("");
  });
});

describe("computeStats", () => {
  it("computes rates, ignoring proposals still in check-in", () => {
    const statuses = ["Pending", "Accepted", "Accepted", "Activated", "Hired", "Declined", "Archived", "Archived"];
    const flights = sanitize(
      statuses.map((status, i) => ({ ...base, id: String(i), status, viewedByClient: i % 2 === 0 })),
      "s"
    );
    const stats = computeStats(flights, new Date("2026-09-27T12:00:00Z"));
    expect(stats.total).toBe(7);
    expect(stats.connected).toBe(2);
    expect(stats.hired).toBe(1);
    expect(stats.connectRate).toBeCloseTo(2 / 7);
    expect(stats.route.map((r) => r.code)).toEqual(["SNT", "VWD", "RPL", "OFR", "HRD"]);
  });

  it("hides the Viewed stop when Upwork doesn't report views", () => {
    const flights = sanitize([{ ...base, viewedByClient: null }], "s");
    expect(computeStats(flights).route.map((r) => r.code)).not.toContain("VWD");
  });
});

describe("demoSnapshot", () => {
  it("is labelled as demo and stable for a given day", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    const a = demoSnapshot(now);
    expect(a.source).toBe("demo");
    expect(a.flights.length).toBeGreaterThan(50);
    expect(demoSnapshot(now).flights).toEqual(a.flights);
  });
});
