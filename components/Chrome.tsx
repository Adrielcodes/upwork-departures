"use client";

import { useSyncExternalStore } from "react";
import { isSoundOn, onSoundChange, setSound } from "@/lib/sound";

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

export function SoundToggle() {
  const on = useSyncExternalStore(onSoundChange, isSoundOn, () => false);

  return (
    <button className="key key--sound" aria-pressed={on} onClick={() => setSound(!on)}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? (
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
      Board sound {on ? "on" : "off"}
    </button>
  );
}
