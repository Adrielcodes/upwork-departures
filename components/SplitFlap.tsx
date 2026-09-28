"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clack } from "@/lib/sound";

// The order characters are printed on a real flap drum. Each cell steps through
// this sequence until it reaches its target, just like the mechanical boards.
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.:/&',";
const FLIP_MS = 62;

function drumIndex(ch: string) {
  const i = DRUM.indexOf(ch);
  return i === -1 ? 0 : i;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** true when the visitor asked for less motion — the board then shows text without flipping */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );
}

const Cell = memo(function Cell({ target, delay }: { target: string; delay: number }) {
  const [shown, setShown] = useState(" ");
  const [next, setNext] = useState<string | null>(null);
  const shownRef = useRef(" ");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const step = () => {
      if (cancelled || shownRef.current === target) return;
      const upcoming = DRUM[(drumIndex(shownRef.current) + 1) % DRUM.length];
      setNext(upcoming);
      clack();
      timer = setTimeout(() => {
        shownRef.current = upcoming;
        setShown(upcoming);
        setNext(null);
        timer = setTimeout(step, 8);
      }, FLIP_MS);
    };

    timer = setTimeout(step, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [target, delay, reduced]);

  if (reduced) {
    return (
      <span className="flap" aria-hidden="true">
        <span className="flap__half flap__top">
          <span className="flap__glyph">{target}</span>
        </span>
        <span className="flap__half flap__bottom">
          <span className="flap__glyph">{target}</span>
        </span>
      </span>
    );
  }

  const top = next ?? shown;
  return (
    <span className="flap" aria-hidden="true">
      <span className="flap__half flap__top">
        <span className="flap__glyph">{top}</span>
      </span>
      <span className="flap__half flap__bottom">
        <span className="flap__glyph">{shown}</span>
      </span>
      {next !== null && (
        <span className="flap__leaf">
          <span className="flap__half flap__top flap__front">
            <span className="flap__glyph">{shown}</span>
          </span>
          <span className="flap__half flap__bottom flap__back">
            <span className="flap__glyph">{next}</span>
          </span>
        </span>
      )}
    </span>
  );
});

interface SplitFlapProps {
  text: string;
  width: number;
  /** Base delay before this field starts flipping, so rows cascade */
  delay?: number;
  className?: string;
}

export function SplitFlap({ text, width, delay = 0, className }: SplitFlapProps) {
  const chars = text.toUpperCase().padEnd(width, " ").slice(0, width).split("");
  return (
    <span className={`flaps ${className ?? ""}`} role="text" aria-label={text.trim()}>
      {chars.map((ch, i) => (
        <Cell key={i} target={DRUM.includes(ch) ? ch : " "} delay={delay + i * 18 + ((i * 37) % 60)} />
      ))}
    </span>
  );
}
