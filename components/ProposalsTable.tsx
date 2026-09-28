"use client";

import { useMemo, useState } from "react";

/** Dates are pre-formatted in the owner's time zone so every visitor sees the same values. */
export interface ProposalRow {
  ref: string;
  appliedAt: number;
  appliedDate: string;
  appliedTime: string;
  updatedAt: number;
  updated: string;
  category: string;
  pay: string;
  status: string;
  lamp: string;
  /** Position in the pipeline, used for sorting by status */
  stageOrder: number;
  group: "air" | "connected" | "closed";
}

const PAGE_SIZE = 15;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "air", label: "Waiting" },
  { id: "connected", label: "Got a reply" },
  { id: "closed", label: "Closed" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type SortKey = "appliedAt" | "category" | "pay" | "stageOrder" | "updatedAt";

const COLUMNS: { key: SortKey | "ref"; label: string; className?: string }[] = [
  { key: "appliedAt", label: "Applied" },
  { key: "category", label: "Job category" },
  { key: "pay", label: "Pay type" },
  { key: "stageOrder", label: "Status" },
  { key: "updatedAt", label: "Last update" },
  { key: "ref", label: "Ref #", className: "cell--ref" },
];

export function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "appliedAt", dir: -1 });
  const [page, setPage] = useState(0);

  const inCategory = rows;

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: inCategory.length, air: 0, connected: 0, closed: 0 };
    for (const r of inCategory) c[r.group]++;
    return c;
  }, [inCategory]);

  const visible = useMemo(() => {
    const filtered = filter === "all" ? inCategory : inCategory.filter((r) => r.group === filter);
    return [...filtered].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return cmp * sort.dir || b.appliedAt - a.appliedAt;
    });
  }, [inCategory, filter, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE_SIZE;
  const pageRows = visible.slice(start, start + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "appliedAt" || key === "updatedAt" ? -1 : 1 }));
    setPage(0);
  }

  return (
    <section className="card card--flush" aria-labelledby="proposals-title">
      <div className="card__head">
        <h2 id="proposals-title" className="card__title">
          Proposals
        </h2>
      </div>

      <div>
        <div className="tabs" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className="tab"
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
            >
              {f.label}
              <span className="tab__count">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={c.className}
                    aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  >
                    {c.key === "ref" ? (
                      c.label
                    ) : (
                      <button className="sort" onClick={() => toggleSort(c.key as SortKey)}>
                        {c.label}
                        <span className="sort__arrow" aria-hidden="true">
                          {sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.ref}>
                  <td data-label="Applied">
                    <span className="cell__main">{r.appliedDate}</span>
                    <span className="cell__sub">{r.appliedTime}</span>
                  </td>
                  <td data-label="Job category" className="cell--category">
                    {r.category}
                  </td>
                  <td data-label="Pay type">{r.pay}</td>
                  <td data-label="Status">
                    <span className={`status status--${r.lamp}`}>
                      <span className="status__dot" aria-hidden="true" />
                      {r.status}
                    </span>
                  </td>
                  <td data-label="Last update" className="cell--muted">
                    {r.updated}
                  </td>
                  <td data-label="Ref #" className="cell--ref">
                    {r.ref}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="table__empty">
                    No proposals match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <span className="pager__range">
            {visible.length === 0 ? "0" : `${start + 1}–${start + pageRows.length}`} of {visible.length}
          </span>
          <div className="pager__buttons">
            <button className="btn btn--icon" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
              ‹
            </button>
            <span className="pager__page">
              Page {current + 1} of {pages}
            </span>
            <button className="btn btn--icon" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
