import type { Destination, RouteStop, Stats } from "@/lib/stats";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A cockpit-style dial. Sweeps 270° like an airspeed indicator. */
export function Dial({ value, label, caption, scaleMax = 1 }: { value: number; label: string; caption: string; scaleMax?: number }) {
  const START = -225;
  const SWEEP = 270;
  const clamped = Math.max(0, Math.min(1, value / scaleMax));
  const angle = START + SWEEP * clamped;
  const polar = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return [80 + r * Math.cos(rad), 80 + r * Math.sin(rad)];
  };
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const deg = START + (SWEEP * i) / 20;
    const major = i % 5 === 0;
    const [x1, y1] = polar(deg, major ? 56 : 60);
    const [x2, y2] = polar(deg, 66);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? "dial__tick dial__tick--major" : "dial__tick"} />;
  });
  const numbers = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const [x, y] = polar(START + SWEEP * f, 45);
    return (
      <text key={f} x={x} y={y} className="dial__num" textAnchor="middle" dominantBaseline="central">
        {Math.round(f * scaleMax * 100)}
      </text>
    );
  });
  const [arcX1, arcY1] = polar(START, 70);
  const [arcX2, arcY2] = polar(START + SWEEP * clamped, 70);
  const [nx, ny] = polar(angle, 58);

  return (
    <figure className="instrument">
      <svg viewBox="0 0 160 160" className="dial" role="img" aria-label={`${label}: ${pct(value)}`}>
        <circle cx="80" cy="80" r="76" className="dial__bezel" />
        <circle cx="80" cy="80" r="71" className="dial__face" />
        {clamped > 0 && (
          <path
            d={`M ${arcX1} ${arcY1} A 70 70 0 ${SWEEP * clamped > 180 ? 1 : 0} 1 ${arcX2} ${arcY2}`}
            className="dial__arc"
          />
        )}
        {ticks}
        {numbers}
        <line x1="80" y1="80" x2={nx} y2={ny} className="dial__needle" />
        <circle cx="80" cy="80" r="6" className="dial__hub" />
        <text x="80" y="142" className="dial__readout" textAnchor="middle">
          {pct(value)}
        </text>
      </svg>
      <figcaption>
        <span className="instrument__label">{label}</span>
        <span className="instrument__caption">{caption}</span>
      </figcaption>
    </figure>
  );
}

/** Mechanical drum counter. */
export function Odometer({ value, label, caption }: { value: number; label: string; caption: string }) {
  const digits = String(value).padStart(3, "0").split("");
  return (
    <figure className="instrument">
      <div className="odometer" role="img" aria-label={`${label}: ${value}`}>
        {digits.map((d, i) => (
          <span key={i} className="odometer__drum">
            {d}
          </span>
        ))}
      </div>
      <figcaption>
        <span className="instrument__label">{label}</span>
        <span className="instrument__caption">{caption}</span>
      </figcaption>
    </figure>
  );
}

/** The funnel, drawn as a flight route with a stopover at each stage. */
export function RouteMap({ stops }: { stops: RouteStop[] }) {
  const first = stops[0]?.count || 1;
  return (
    <ol className="route">
      {stops.map((stop, i) => (
        <li key={stop.code} className={`route__stop ${stop.count > 0 ? "route__stop--reached" : ""}`}>
          {i > 0 && (
            <svg className="route__leg" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 26 Q50 -8 100 26" />
            </svg>
          )}
          <span className="route__pin" aria-hidden="true" />
          <span className="route__code">{stop.code}</span>
          <span className="route__label">{stop.label}</span>
          <span className="route__count">{stop.count}</span>
          <span className="route__share">{i === 0 ? "departed" : `${pct(stop.count / first)} of departures`}</span>
        </li>
      ))}
    </ol>
  );
}

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
}

/** Weekly volume as altitude bars: outline = sent, filled = connected. */
export function FlightLog({ weekly }: { weekly: Stats["weekly"] }) {
  const max = Math.max(1, ...weekly.map((w) => w.sent));
  return (
    <div className="log">
      <div className="log__bars">
        {weekly.map((w, i) => (
          <div key={w.weekStart} className="log__week" title={`Week of ${weekLabel(w.weekStart)}: ${w.sent} sent, ${w.connected} connected`}>
            <span className="log__value">{w.sent || ""}</span>
            <div className="log__bar" style={{ height: `${(w.sent / max) * 100}%` }}>
              <div className="log__fill" style={{ height: w.sent ? `${(w.connected / w.sent) * 100}%` : 0 }} />
            </div>
            <span className="log__week-label">{i % 2 === weekly.length % 2 ? weekLabel(w.weekStart) : ""}</span>
          </div>
        ))}
      </div>
      <p className="log__key">
        <span className="swatch swatch--sent" /> Sent <span className="swatch swatch--conn" /> Got a reply
      </p>
    </div>
  );
}

/** Barcode stripes derived from the text, so each pass looks different but stays stable. */
function barcode(text: string) {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < 46; i++) {
    h ^= text.charCodeAt(i % text.length) + i;
    h = Math.imul(h, 16777619);
    bars.push(1 + ((h >>> 0) % 3));
  }
  let x = 0;
  return bars.map((w, i) => {
    const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="40" /> : null;
    x += w;
    return rect;
  });
}

export function BoardingPass({ destinations }: { destinations: Destination[] }) {
  const eligible = destinations.filter((d) => d.sent >= 5);
  const best = [...(eligible.length ? eligible : destinations)].sort((a, b) => b.rate - a.rate || b.sent - a.sent)[0];
  if (!best) return null;

  return (
    <article className="pass" aria-label={`Best route: ${best.name}`}>
      <div className="pass__main">
        <header className="pass__head">
          <span>Boarding pass</span>
          <span>Best route</span>
        </header>
        <div className="pass__route">
          <div>
            <span className="pass__field">From</span>
            <span className="pass__city">ADRIEL R.</span>
            <span className="pass__sub">Freelance developer</span>
          </div>
          <svg viewBox="0 0 24 24" className="pass__plane" aria-hidden="true">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
          </svg>
          <div>
            <span className="pass__field">To</span>
            <span className="pass__city">{best.name}</span>
            <span className="pass__sub">Upwork category</span>
          </div>
        </div>
        <dl className="pass__grid">
          <div>
            <dt>Sent</dt>
            <dd>{best.sent}</dd>
          </div>
          <div>
            <dt>Replies</dt>
            <dd>{best.connected}</dd>
          </div>
          <div>
            <dt>Reply rate</dt>
            <dd>{pct(best.rate)}</dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>First</dd>
          </div>
        </dl>
      </div>
      <div className="pass__stub">
        <span className="pass__field">Seat</span>
        <span className="pass__seat">1A</span>
        <svg viewBox="0 0 110 40" className="pass__barcode" preserveAspectRatio="none" aria-hidden="true">
          {barcode(best.name)}
        </svg>
      </div>
    </article>
  );
}
