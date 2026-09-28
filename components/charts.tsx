"use client";

import { useEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import type { Week } from "@/lib/stats";

/* ─── Tooltip ─────────────────────────────────────────────── */

export interface TipRow {
  label: string;
  value: string;
  /** CSS class for the short line-key beside the row */
  key?: string;
}

interface Tip {
  x: number;
  y: number;
  /** Open to the left when the pointer is on the right half, so the tooltip stays inside the card */
  flip: boolean;
  title: string;
  rows: TipRow[];
}

/** One tooltip per chart card. Values lead, labels follow; the same content shows on hover and keyboard focus. */
export function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  function place(clientX: number, clientY: number, title: string, rows: TipRow[]) {
    const host = hostRef.current?.getBoundingClientRect();
    if (!host) return;
    const x = clientX - host.left;
    setTip({ x, y: clientY - host.top, flip: x > host.width / 2, title, rows });
  }

  const bind = (title: string, rows: TipRow[]) => ({
    tabIndex: 0,
    onPointerMove: (e: PointerEvent) => place(e.clientX, e.clientY, title, rows),
    onPointerLeave: () => setTip(null),
    onFocus: (e: FocusEvent<Element>) => {
      const r = e.currentTarget.getBoundingClientRect();
      place(r.left + r.width / 2, r.top, title, rows);
    },
    onBlur: () => setTip(null),
  });

  const node = tip ? (
    <div
      className="tooltip"
      role="status"
      style={{ left: tip.x, top: tip.y, transform: `translate(${tip.flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      <div className="tooltip__title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} className="tooltip__row">
          {r.key && <span className={`tooltip__key ${r.key}`} aria-hidden="true" />}
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  return { hostRef, bind, node };
}

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/* ─── KPI tile ────────────────────────────────────────────── */

export interface Delta {
  text: string;
  good: boolean | null;
  direction: "up" | "down" | "flat";
}

export function KpiTile({ label, value, sub, delta }: { label: string; value: string; sub?: ReactNode; delta?: Delta | null }) {
  return (
    <div className="card kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta && (
        <div className={`kpi__delta ${delta.good === null ? "" : delta.good ? "kpi__delta--good" : "kpi__delta--bad"}`}>
          <span aria-hidden="true">{delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■"}</span> {delta.text}
        </div>
      )}
      {sub && <div className="kpi__sub">{sub}</div>}
    </div>
  );
}

/* ─── Weekly activity: stacked columns ───────────────────── */

function niceMax(n: number) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= n) return m * pow;
  return 10 * pow;
}

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number, round: boolean) {
  if (h <= 0) return "";
  const r = round ? Math.min(4, h, w / 2) : 0;
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const [ref, width] = useWidth<HTMLDivElement>(640);
  const { hostRef, bind, node } = useTooltip();
  const height = 220;
  const pad = { top: 10, right: 4, bottom: 26, left: 34 };
  const innerW = Math.max(100, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...weeks.map((w) => w.sent), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max)).filter((v, i, a) => a.indexOf(v) === i);
  const band = innerW / weeks.length;
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const labelEvery = Math.ceil(weeks.length / Math.max(2, Math.floor(innerW / 64)));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  // Keep edge labels inside the plot instead of clipping them
  const labelAnchor = (cx: number) => (cx > width - 28 ? "end" : "middle");
  const labelX = (cx: number) => (cx > width - 28 ? width - pad.right : cx);

  return (
    <div className="chart" ref={hostRef}>
      <div ref={ref} className="chart__plot">
        <svg width={width} height={height} role="img" aria-label="Proposals sent per week, split by whether they got a reply">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={t === 0 ? "axis" : "grid"} />
              <text x={pad.left - 8} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = pad.left + i * band + (band - barW) / 2;
            const replied = w.connected;
            const rest = w.sent - w.connected;
            const hReplied = (replied / max) * innerH;
            const hRest = (rest / max) * innerH;
            const gap = replied > 0 && rest > 0 ? 2 : 0;
            const base = pad.top + innerH;
            return (
              <g key={w.weekStart}>
                <path d={columnPath(x, base - hReplied, barW, hReplied, rest === 0)} className="fill-replied" />
                <path d={columnPath(x, base - hReplied - gap - hRest, barW, Math.max(0, hRest - gap), true)} className="fill-noreply" />
                <rect
                  x={pad.left + i * band}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  className="hit"
                  aria-label={`Week of ${weekLabel(w.weekStart)}: ${w.sent} sent, ${w.connected} replied`}
                  {...bind(`Week of ${weekLabel(w.weekStart)}`, [
                    { label: "sent", value: String(w.sent) },
                    { label: "got a reply", value: String(w.connected), key: "key--replied" },
                    { label: "reply rate", value: w.sent ? pct(w.connected / w.sent) : "—" },
                  ])}
                />
                {i % labelEvery === (weeks.length - 1) % labelEvery && (
                  <text x={labelX(pad.left + i * band + band / 2)} y={height - 8} className="tick" textAnchor={labelAnchor(pad.left + i * band + band / 2)}>
                    {weekLabel(w.weekStart)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend-row">
        <span className="legend-item">
          <span className="swatch fill-replied" /> Got a reply
        </span>
        <span className="legend-item">
          <span className="swatch fill-noreply" /> No reply
        </span>
      </div>
      {node}
    </div>
  );
}

/* ─── Horizontal bar list (funnel, categories) ───────────── */

export interface BarItem {
  label: string;
  value: number;
  /** Text at the bar tip */
  display: string;
  tip: TipRow[];
}

interface BarListProps {
  items: BarItem[];
  max?: number;
  ariaLabel: string;
  /** Fixed column widths so every bar starts on the same baseline */
  labelWidth?: number;
  valueWidth?: number;
}

export function BarList({ items, max, ariaLabel, labelWidth = 120, valueWidth = 80 }: BarListProps) {
  const { hostRef, bind, node } = useTooltip();
  const top = max ?? Math.max(...items.map((i) => i.value), 0);
  return (
    <div className="chart" ref={hostRef}>
      <ul
        className="bars"
        aria-label={ariaLabel}
        style={{ "--label-w": `${labelWidth}px`, "--value-w": `${valueWidth}px` } as React.CSSProperties}
      >
        {items.map((item) => (
          <li key={item.label} className="bars__row" {...bind(item.label, item.tip)}>
            <span className="bars__label" title={item.label}>
              {item.label}
            </span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: top ? `${(item.value / top) * 100}%` : 0 }} />
            </span>
            <span className="bars__value">{item.display}</span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
