"use client";

import { useSyncExternalStore } from "react";

function subscribeToSeconds(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

/** Live terminal clock in the board's time zone. Shows dashes during server render to avoid hydration drift. */
export function Clock({ timeZone }: { timeZone: string }) {
  const seconds = useSyncExternalStore(
    subscribeToSeconds,
    () => Math.floor(Date.now() / 1000),
    () => null
  );
  const now = seconds === null ? null : new Date(seconds * 1000);

  const time = now
    ? new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now)
    : "--:--:--";
  const zone = now
    ? (new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "")
    : "";

  return (
    <div className="clock" aria-label="Local time">
      <span className="clock__time">{time}</span>
      <span className="clock__zone">{zone}</span>
    </div>
  );
}
