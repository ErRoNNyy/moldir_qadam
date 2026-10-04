import type { MealStatus } from "@/lib/types";

export function Thumb({
  emoji,
  gradient,
  size = 48,
  radius = 12,
  className = "",
}: {
  emoji: string;
  gradient: [string, string];
  size?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        fontSize: size * 0.5,
        lineHeight: 1,
      }}
      aria-hidden
    >
      <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18))" }}>
        {emoji}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: MealStatus }) {
  if (status === "eaten") {
    return (
      <span className="rounded-full bg-eaten-bg px-2.5 py-1 text-xs font-semibold text-eaten">
        Eaten
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="rounded-full bg-line px-2.5 py-1 text-xs font-semibold text-muted">
        Skipped
      </span>
    );
  }
  return (
    <span className="rounded-full bg-planned-bg px-2.5 py-1 text-xs font-semibold text-planned">
      Planned
    </span>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-dark text-white shadow-sm">
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
          <path
            d="M12 3c3 2.5 5 5.2 5 8.6a5 5 0 0 1-10 0C7 8.2 9 5.5 12 3z"
            fill="#eaf5ec"
          />
          <path
            d="M12 8.5c1.4 1.2 2.3 2.4 2.3 3.9a2.3 2.3 0 0 1-4.6 0c0-1.5.9-2.7 2.3-3.9z"
            fill="#1f7a4d"
          />
        </svg>
      </div>
      <span className="text-[17px] font-bold tracking-tight text-ink">Nouri</span>
    </div>
  );
}

export function macroColor(kind: "protein" | "carbs" | "fat" | "calories") {
  switch (kind) {
    case "protein":
      return "text-protein";
    default:
      return "text-ink";
  }
}
