"use client";

import { useEffect, useMemo, useState } from "react";
import { SplitFlap } from "./SplitFlap";

export interface BoardRow {
  flight: string;
  date: string;
  time: string;
  destination: string;
  gate: string;
  remark: string;
  lamp: string;
  group: "air" | "connected" | "closed";
}

const ROWS_PER_PAGE = 10;
const PAGE_SECONDS = 14;

const FILTERS = [
  { id: "all", label: "All flights" },
  { id: "air", label: "In the air" },
  { id: "connected", label: "Connected" },
  { id: "closed", label: "Closed" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const COLUMNS = [
  { key: "date", label: "Date", width: 6, className: "col--date" },
  { key: "time", label: "Time", width: 5, className: "col--time" },
  { key: "flight", label: "Flight", width: 7, className: "col--flight" },
  { key: "destination", label: "Destination", width: 24, className: "col--dest" },
  { key: "gate", label: "Gate", width: 4, className: "col--gate" },
  { key: "remark", label: "Remarks", width: 9, className: "col--remark" },
] as const;

export function Board({ rows }: { rows: BoardRow[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.group === filter)), [rows, filter]);
  const pages = Math.max(1, Math.ceil(visible.length / ROWS_PER_PAGE));
  const current = Math.min(page, pages - 1);

  // Real boards cycle through pages on their own
  useEffect(() => {
    if (paused || pages < 2) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_SECONDS * 1000);
    return () => clearInterval(id);
  }, [pages, paused]);

  const pageRows = visible.slice(current * ROWS_PER_PAGE, (current + 1) * ROWS_PER_PAGE);
  const padded = [...pageRows, ...Array(ROWS_PER_PAGE - pageRows.length).fill(null)] as (BoardRow | null)[];

  return (
    <section className="board" aria-label="Departures board: my Upwork proposals">
      <div className="board__controls">
        <div className="board__filters" role="tablist" aria-label="Filter flights">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className="key"
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="board__pager">
          <button className="key key--icon" aria-label="Previous page" onClick={() => setPage((current - 1 + pages) % pages)}>
            ◂
          </button>
          <button
            className="key key--icon"
            aria-label={paused ? "Resume page rotation" : "Pause page rotation"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "▸" : "❚❚"}
          </button>
          <button className="key key--icon" aria-label="Next page" onClick={() => setPage((current + 1) % pages)}>
            ▸
          </button>
        </div>
      </div>

      <div className="board__housing">
        <div className="board__row board__row--head" aria-hidden="true">
          <span className="lamp lamp--off" />
          {COLUMNS.map((c) => (
            <span key={c.key} className={`board__label ${c.className}`} style={{ "--chars": c.width } as React.CSSProperties}>
              {c.label}
            </span>
          ))}
        </div>

        <ol className="board__rows">
          {padded.map((row, i) => (
            <li key={i} className="board__row">
              <span className={`lamp lamp--${row?.lamp ?? "off"}`} aria-hidden="true" />
              {COLUMNS.map((c) => (
                <SplitFlap
                  key={c.key}
                  text={row ? row[c.key] : ""}
                  width={c.width}
                  delay={i * 90}
                  className={`${c.className} ${c.key === "remark" && row ? `remark--${row.lamp}` : ""}`}
                />
              ))}
            </li>
          ))}
        </ol>

        <div className="board__footer">
          <SplitFlap text={`PAGE ${current + 1} OF ${pages}`} width={12} delay={400} />
          <span className="board__count">{visible.length} flights</span>
        </div>
      </div>
    </section>
  );
}
