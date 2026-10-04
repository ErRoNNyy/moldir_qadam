import type { MealStatus } from "@/lib/types";
import Image from "next/image";

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
      <Image
        src="/design/logo/logo.png"
        alt=""
        width={8}
        height={8}
        aria-hidden="true"
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="text-[17px] font-bold tracking-tight text-ink">MQM</span>
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
