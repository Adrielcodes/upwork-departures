import { Board, type BoardRow } from "@/components/Board";
import { Clock } from "@/components/Chrome";
import { BoardingPass, Dial, FlightLog, Odometer, RouteMap } from "@/components/Instruments";
import { loadSnapshot } from "@/lib/snapshot";
import { STAGES, STAGE_ORDER } from "@/lib/stages";
import { computeStats } from "@/lib/stats";
import type { Flight } from "@/lib/types";

// The snapshot only changes when /api/sync runs (which also revalidates this page)
export const revalidate = 3600;

const TIME_ZONE = process.env.NEXT_PUBLIC_BOARD_TZ || "America/New_York";

const PAY_LABEL: Record<Flight["gate"], string> = { HOURLY: "Hourly", FIXED: "Fixed", "": "—" };

function relative(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric" }).format(new Date(iso));
}

function toRow(f: Flight, now: Date): BoardRow {
  const applied = new Date(f.departedAt);
  const info = STAGES[f.stage];
  return {
    ref: f.flight,
    appliedAt: applied.getTime(),
    appliedDate: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(applied),
    appliedTime: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric" }).format(applied),
    updatedAt: Date.parse(f.updatedAt),
    updated: relative(f.updatedAt, now),
    category: f.destination,
    pay: PAY_LABEL[f.gate],
    status: info.label,
    lamp: info.lamp,
    stageOrder: STAGE_ORDER.indexOf(f.stage),
    group: info.connected ? "connected" : info.closed ? "closed" : "air",
  };
}

export default async function Page() {
  const snapshot = await loadSnapshot();
  const now = new Date();
  const stats = computeStats(snapshot.flights, now);
  const isDemo = snapshot.source === "demo";
  const updated = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.generatedAt));

  return (
    <>
      <header className="sign">
        <div className="sign__inner">
          <div className="sign__title">
            <span className="pictogram" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M6 38h36v3H6z" />
                <path d="M41.6 14.2c-.7-1.6-2.6-2.3-4.2-1.6L29 16.5 16.8 10.8l-3.6 1.6 8.4 7.3-7.4 3.4-4.4-2.4-2.8 1.3 4.6 6.5c.5.7 1.5 1 2.3.6l26.1-12.1c1.6-.7 2.3-2.6 1.6-4.2z" />
              </svg>
            </span>
            <div>
              <h1>Departures</h1>
              <p>Every Upwork proposal I&apos;ve sent</p>
            </div>
          </div>
          <div className="sign__right">
            <Clock timeZone={TIME_ZONE} />
          </div>
        </div>
      </header>

      {isDemo && (
        <div className="ticker" role="note">
          <div className="ticker__track">
            {Array.from({ length: 2 }, (_, i) => (
              <span key={i} aria-hidden={i === 1}>
                ● Demo data: sample proposals until Upwork approves the API key &nbsp;&nbsp; ● Real proposals will replace these
                automatically &nbsp;&nbsp; ● Client names, job titles, rates and cover letters are never shown &nbsp;&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="terminal">
        <section className="deck" aria-labelledby="deck-title">
          <h2 id="deck-title" className="section-sign">
            <span className="section-sign__num">A</span> Flight deck
          </h2>
          <div className="deck__instruments">
            <Dial value={stats.connectRate} scaleMax={0.4} label="Reply rate" caption={`${stats.connected} of ${stats.total} got a response`} />
            <Dial value={stats.hireRate} scaleMax={0.2} label="Hire rate" caption={`${stats.hired} landed`} />
            {stats.viewRate !== null && <Dial value={stats.viewRate} label="Viewed" caption="Opened by the client" />}
            <Odometer value={stats.last30} label="Sent" caption="Last 30 days" />
            <Odometer value={stats.inTheAir} label="Waiting" caption="Waiting on a reply" />
          </div>
        </section>

        <Board rows={snapshot.flights.map((f) => toRow(f, now))} />

        <section className="panel" aria-labelledby="route-title">
          <h2 id="route-title" className="section-sign">
            <span className="section-sign__num">B</span> Route
          </h2>
          <RouteMap stops={stats.route} />
        </section>

        <div className="split">
          <section className="panel" aria-labelledby="log-title">
            <h2 id="log-title" className="section-sign">
              <span className="section-sign__num">C</span> Flight log · 12 weeks
            </h2>
            <FlightLog weekly={stats.weekly} />
          </section>
          <section className="panel" aria-labelledby="pass-title">
            <h2 id="pass-title" className="section-sign">
              <span className="section-sign__num">D</span> Best route
            </h2>
            <BoardingPass destinations={stats.destinations} />
          </section>
        </div>

        <section className="panel" aria-labelledby="legend-title">
          <h2 id="legend-title" className="section-sign">
            <span className="section-sign__num">E</span> What the statuses mean
          </h2>
          <ul className="legend">
            {STAGE_ORDER.map((s) => (
              <li key={s}>
                <span className={`lamp lamp--${STAGES[s].lamp}`} aria-hidden="true" />
                <span className={`pill pill--${STAGES[s].lamp}`}>
                  <span className="pill__dot" aria-hidden="true" />
                  {STAGES[s].label}
                </span>
                <span className="legend__meaning">{STAGES[s].meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="manifest">
        <p>
          <strong>Passenger manifest sealed.</strong> This board is public, but the data behind it isn&apos;t. The
          server keeps only each proposal&apos;s status, rough time, job category and contract type. Flight numbers are
          scrambled, times are rounded to the hour, and client names, job titles, rates and cover letters never leave
          the cockpit.
        </p>
        <p className="manifest__meta">
          {isDemo ? "Showing demo data" : `Last synced ${updated}`} ·{" "}
          <a href="https://github.com/Adrielcodes/upwork-departures">Source on GitHub</a> · Built by{" "}
          <a href="https://github.com/Adrielcodes">Adriel Ramirez</a>
        </p>
      </footer>
    </>
  );
}
