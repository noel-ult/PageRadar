import Link from "next/link";
export function RadarMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={`radar-mark ${className}`}
    >
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <g stroke="var(--on-primary)" strokeWidth="1.5">
        <circle cx="20" cy="20" r="12" opacity=".45" />
        <circle cx="20" cy="20" r="7" opacity=".7" />
        <path d="M20 20V8M20 20l9 8" />
        <circle cx="20" cy="20" r="2" fill="var(--on-primary)" />
        <circle
          cx="28"
          cy="12"
          r="2.5"
          fill="var(--on-primary)"
          stroke="none"
        />
      </g>
    </svg>
  );
}
export function Brand({
  href = "/",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="brand" aria-label="PageRadar home">
      <RadarMark />
      <span>
        PageRadar{!compact ? <small>CHANGE INTELLIGENCE</small> : null}
      </span>
    </Link>
  );
}
