import { Dashboard } from "@/components/Dashboard";
import { loadSnapshot } from "@/lib/snapshot";

// The snapshot only changes when /api/sync runs (which also revalidates this page)
export const revalidate = 3600;

const TIME_ZONE = process.env.NEXT_PUBLIC_BOARD_TZ || "America/New_York";

export default async function Page() {
  const snapshot = await loadSnapshot();
  const isDemo = snapshot.source === "demo";
  const updated = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(
    new Date(snapshot.generatedAt)
  );

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
            </svg>
          </span>
          <div>
            <h1 className="brand__name">Departures</h1>
            <p className="brand__tagline">Upwork proposal dashboard</p>
          </div>
        </div>
        <p className="header__meta">{isDemo ? <span className="badge">Demo data</span> : <>Updated {updated}</>}</p>
      </header>

      {isDemo && (
        <p className="notice" role="note">
          You&apos;re looking at sample data. Real proposals will appear here automatically once Upwork approves the API key.
        </p>
      )}

      <main className="main">
        <Dashboard flights={snapshot.flights} nowIso={new Date().toISOString()} timeZone={TIME_ZONE} />
      </main>

      <footer className="footer">
        <p>
          Public dashboard, private data: only each proposal&apos;s status, rough time, job category and pay type are stored.
          Client names, job titles, rates and cover letters are never collected. Times are rounded to the hour and
          reference numbers are scrambled.
        </p>
        <p>
          <a href="https://github.com/Adrielcodes/upwork-departures">Source on GitHub</a> · Built by{" "}
          <a href="https://github.com/Adrielcodes">Adriel Ramirez</a>
        </p>
      </footer>
    </div>
  );
}
