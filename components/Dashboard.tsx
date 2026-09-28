"use client";

import { useMemo, useState } from "react";
import { STAGES, STAGE_ORDER } from "@/lib/stages";
import { computeStats, weeklyActivity, type Stats } from "@/lib/stats";
import type { Flight } from "@/lib/types";
import { BarList, KpiTile, WeeklyChart, type Delta } from "./charts";
import { ProposalsTable, type ProposalRow } from "./ProposalsTable";

const DAY = 86_400_000;

const RANGES = [
  { id: "30", label: "30 days", days: 30, weeks: 5 },
  { id: "90", label: "90 days", days: 90, weeks: 13 },
  { id: "365", label: "12 months", days: 365, weeks: 52 },
  { id: "all", label: "All time", days: null, weeks: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const PAY_LABEL: Record<Flight["gate"], string> = { HOURLY: "Hourly", FIXED: "Fixed", "": "—" };

const pct = (n: number) => `${Math.round(n * 100)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Props {
  flights: Flight[];
  /** Server render time, so relative dates match between server and browser */
  nowIso: string;
  timeZone: string;
}

export function Dashboard({ flights, nowIso, timeZone }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [rangeId, setRangeId] = useState<RangeId>("90");
  const [category, setCategory] = useState("all");
  const range = RANGES.find((r) => r.id === rangeId)!;

  const categories = useMemo(() => [...new Set(flights.map((f) => f.destination))].sort(), [flights]);

  const { current, previous, weeks } = useMemo(() => {
    const inCategory = category === "all" ? flights : flights.filter((f) => f.destination === category);
    const between = (from: number, to: number) =>
      inCategory.filter((f) => {
        const t = Date.parse(f.departedAt);
        return t >= from && t < to;
      });
    const end = now.getTime() + 1;

    if (range.days === null) {
      const first = Math.min(...inCategory.map((f) => Date.parse(f.departedAt)), now.getTime());
      const weekCount = Math.min(52, Math.max(4, Math.ceil((now.getTime() - first) / (7 * DAY)) + 1));
      return { current: inCategory, previous: null, weeks: weeklyActivity(inCategory, weekCount, now) };
    }
    const start = now.getTime() - range.days * DAY;
    const cur = between(start, end);
    return {
      current: cur,
      previous: between(start - range.days * DAY, start),
      weeks: weeklyActivity(cur, range.weeks, now),
    };
  }, [flights, category, range, now]);

  const stats = useMemo(() => computeStats(current, now), [current, now]);
  const prev = useMemo(() => (previous && previous.length ? computeStats(previous, now) : null), [previous, now]);

  const rows = useMemo(() => current.map((f) => toRow(f, now, timeZone)), [current, now, timeZone]);

  return (
    <>
      <div className="filters" role="group" aria-label="Filters">
        <div className="segmented" role="radiogroup" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} role="radio" aria-checked={rangeId === r.id} onClick={() => setRangeId(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <label className="select">
          <span className="visually-hidden">Job category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="kpis" aria-label="Key numbers">
        <KpiTile
          label="Proposals sent"
          value={String(stats.total)}
          delta={countDelta(stats.total, prev?.total, range.label)}
          sub={range.days === null ? "All time" : `Last ${range.label}`}
        />
        <KpiTile
          label="Reply rate"
          value={pct(stats.connectRate)}
          delta={prev ? rateDelta(stats.connectRate, prev.connectRate, range.label) : null}
          sub={`${stats.connected} of ${stats.sent} got a reply`}
        />
        <KpiTile
          label="Hired"
          value={String(stats.hired)}
          delta={countDelta(stats.hired, prev?.hired, range.label)}
          sub={`${pct(stats.hireRate)} hire rate`}
        />
        <KpiTile
          label="Waiting on a reply"
          value={String(stats.waiting)}
          sub={stats.oldestWaitingDays === null ? "Nothing pending" : `Oldest sent ${plural(stats.oldestWaitingDays, "day")} ago`}
        />
      </section>

      <div className="cards cards--wide">
        <section className="card" aria-labelledby="weekly-title">
          <div className="card__head">
            <h2 id="weekly-title" className="card__title">
              Weekly activity
            </h2>
            <p className="card__hint">Proposals sent each week</p>
          </div>
          <WeeklyChart weeks={weeks} />
        </section>

        <section className="card" aria-labelledby="funnel-title">
          <div className="card__head">
            <h2 id="funnel-title" className="card__title">
              Funnel
            </h2>
            <p className="card__hint">How far proposals get</p>
          </div>
          <Funnel stats={stats} />
        </section>
      </div>

      <div className="cards">
        <section className="card" aria-labelledby="category-title">
          <div className="card__head">
            <h2 id="category-title" className="card__title">
              Reply rate by category
            </h2>
            <p className="card__hint">Where proposals get answered most</p>
          </div>
          {stats.destinations.length ? (
            <BarList
              ariaLabel="Reply rate by job category"
              labelWidth={180}
              valueWidth={96}
              items={[...stats.destinations].sort((a, b) => b.rate - a.rate || b.sent - a.sent).map((d) => ({
                label: d.name,
                value: d.rate,
                display: `${pct(d.rate)} · ${d.connected}/${d.sent}`,
                tip: [
                  { label: "reply rate", value: pct(d.rate) },
                  { label: "sent", value: String(d.sent) },
                  { label: "got a reply", value: String(d.connected) },
                ],
              }))}
            />
          ) : (
            <p className="empty">No proposals in this range.</p>
          )}
        </section>

        <section className="card" aria-labelledby="status-title">
          <div className="card__head">
            <h2 id="status-title" className="card__title">
              By status
            </h2>
            <p className="card__hint">Where every proposal stands now</p>
          </div>
          <StatusBreakdown stats={stats} />
        </section>
      </div>

      <ProposalsTable rows={rows} />
    </>
  );
}

function Funnel({ stats }: { stats: Stats }) {
  const sent = stats.funnel[0]?.count ?? 0;
  if (!sent) return <p className="empty">No proposals in this range.</p>;
  return (
    <BarList
      ariaLabel="Proposal funnel"
      labelWidth={64}
      valueWidth={76}
      max={sent}
      items={stats.funnel.map((s) => ({
        label: s.label,
        value: s.count,
        display: s.label === "Sent" ? String(s.count) : `${s.count} · ${pct(s.count / sent)}`,
        tip: [
          { label: "proposals", value: String(s.count) },
          { label: "of sent", value: pct(s.count / sent) },
        ],
      }))}
    />
  );
}

function StatusBreakdown({ stats }: { stats: Stats }) {
  return (
    <ul className="statuses">
      {stats.statusCounts.map(({ stage, count }) => (
        <li key={stage} className={count === 0 ? "statuses__row statuses__row--zero" : "statuses__row"}>
          <span className={`status status--${STAGES[stage].lamp}`}>
            <span className="status__dot" aria-hidden="true" />
            {STAGES[stage].label}
          </span>
          <span className="statuses__meaning">{STAGES[stage].meaning}</span>
          <span className="statuses__count">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function countDelta(current: number, previous: number | undefined, rangeLabel: string): Delta | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  return {
    text: `${diff === 0 ? "No change" : `${diff > 0 ? "+" : ""}${diff}`} vs previous ${rangeLabel}`,
    good: diff === 0 ? null : diff > 0,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
  };
}

function rateDelta(current: number, previous: number, rangeLabel: string): Delta {
  const pts = Math.round((current - previous) * 100);
  return {
    text: `${pts === 0 ? "No change" : `${pts > 0 ? "+" : ""}${pts} pts`} vs previous ${rangeLabel}`,
    good: pts === 0 ? null : pts > 0,
    direction: pts > 0 ? "up" : pts < 0 ? "down" : "flat",
  };
}

function relative(iso: string, now: Date, timeZone: string): string {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
}

function toRow(f: Flight, now: Date, timeZone: string): ProposalRow {
  const applied = new Date(f.departedAt);
  const info = STAGES[f.stage];
  return {
    ref: f.flight,
    appliedAt: applied.getTime(),
    appliedDate: new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" }).format(applied),
    appliedTime: new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" }).format(applied),
    updatedAt: Date.parse(f.updatedAt),
    updated: relative(f.updatedAt, now, timeZone),
    category: f.destination,
    pay: PAY_LABEL[f.gate],
    status: info.label,
    lamp: info.lamp,
    stageOrder: STAGE_ORDER.indexOf(f.stage),
    group: info.connected ? "connected" : info.closed ? "closed" : "air",
  };
}
