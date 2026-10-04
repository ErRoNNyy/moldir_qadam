"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  addDays,
  agendaDayLabel,
  dayNum,
  fromKey,
  isSameMonth,
  longDayLabel,
  monthGrid,
  monthYearLabel,
  todayKey,
  weekDays,
  weekdayShort,
} from "@/lib/date";
import type { MealPlanItem } from "@/lib/types";
import { MealModal } from "@/components/meal-modal";
import { MealDetailModal } from "@/components/meal-detail";
import { ChevronLeft, ChevronRight, PlusIcon } from "@/components/icons";

type View = "day" | "week" | "month" | "agenda";
const VIEWS: View[] = ["day", "week", "month", "agenda"];

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_H = 56;

function timeToTop(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - START_HOUR) * 60 + m) * (HOUR_H / 60);
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(todayKey());
  const [selected, setSelected] = useState<MealPlanItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState(todayKey());

  const today = todayKey();

  function step(dir: number) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, dir * 7));
    else if (view === "month") {
      const d = fromKey(anchor);
      setAnchor(
        `${d.getFullYear()}-${String(d.getMonth() + 1 + dir).padStart(2, "0")}-01`
      );
    } else setAnchor(addDays(anchor, dir * 7));
  }

  function openAdd(dateKey?: string) {
    setAddDate(dateKey ?? anchor);
    setAddOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-line bg-surface px-6 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => step(-1)}
            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-surface-muted"
            aria-label="Previous"
          >
            <ChevronLeft />
          </button>
          <h1 className="min-w-[150px] text-center text-lg font-bold text-ink">
            {monthYearLabel(anchor)}
          </h1>
          <button
            onClick={() => step(1)}
            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-surface-muted"
            aria-label="Next"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(today)}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-line-strong p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openAdd()}
            className="flex items-center justify-center rounded-lg bg-brand p-2 text-white transition-colors hover:bg-brand-dark"
            aria-label="Add meal"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "day" && (
          <DayView anchor={anchor} today={today} onSelect={setSelected} />
        )}
        {view === "week" && (
          <WeekView
            anchor={anchor}
            today={today}
            onSelect={setSelected}
            onAdd={openAdd}
          />
        )}
        {view === "month" && (
          <MonthView
            anchor={anchor}
            today={today}
            onSelect={setSelected}
            onAdd={openAdd}
          />
        )}
        {view === "agenda" && (
          <AgendaView anchor={anchor} today={today} onSelect={setSelected} />
        )}
      </div>

      <MealDetailModal item={selected} onClose={() => setSelected(null)} />
      <MealModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={addDate}
      />
    </div>
  );
}

/* ------------------------------- Day view ------------------------------- */

function DayView({
  anchor,
  today,
  onSelect,
}: {
  anchor: string;
  today: string;
  onSelect: (m: MealPlanItem) => void;
}) {
  const { mealsForDate } = useApp();
  const meals = mealsForDate(anchor);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-ink">{longDayLabel(anchor)}</h2>
        <p className="text-sm text-muted">
          {anchor === today ? "Today" : ""}
        </p>
      </div>
      <div className="relative px-6 pb-10">
        <div className="relative" style={{ height: hours.length * HOUR_H }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: i * HOUR_H, height: HOUR_H }}
            >
              <span className="w-12 -translate-y-2 text-xs text-muted">
                {formatHour(h)}
              </span>
              <div className="ml-2 flex-1 border-t border-line" />
            </div>
          ))}
          <div className="absolute inset-y-0 left-14 right-0">
            {meals.map((m) => (
              <GridEvent key={m.id} item={m} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Week view ------------------------------ */

function WeekView({
  anchor,
  today,
  onSelect,
  onAdd,
}: {
  anchor: string;
  today: string;
  onSelect: (m: MealPlanItem) => void;
  onAdd: (dateKey: string) => void;
}) {
  const { mealsForDate, weekSummary } = useApp();
  const days = weekDays(anchor);
  const summary = weekSummary(anchor);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-3 border-b border-line bg-surface sm:grid-cols-6">
        <WeekSummaryStat label="Planned kcal" value={summary.plannedCalories.toLocaleString()} />
        <WeekSummaryStat label="Planned protein" value={summary.plannedProtein + "g"} />
        <WeekSummaryStat label="Meals planned" value={String(summary.mealsPlanned)} />
        <WeekSummaryStat label="Consumed kcal" value={summary.consumedCalories.toLocaleString()} />
        <WeekSummaryStat label="Consumed protein" value={summary.consumedProtein + "g"} />
        <WeekSummaryStat label="Meals eaten" value={String(summary.mealsEaten)} />
      </div>
      {/* Day headers */}
      <div className="grid shrink-0 grid-cols-[56px_repeat(7,1fr)] border-b border-line bg-surface">
        <div />
        {days.map((d) => {
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => onAdd(d)}
              className="border-l border-line py-2.5 text-center transition-colors hover:bg-surface-muted"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {weekdayShort(d)}
              </div>
              <div
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-brand text-white" : "text-ink"
                }`}
              >
                {dayNum(d)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)]"
          style={{ height: hours.length * HOUR_H }}
        >
          {/* hour labels */}
          <div className="relative">
            {hours.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 text-xs text-muted"
                style={{ top: i * HOUR_H - 6 }}
              >
                {formatHour(h)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const meals = mealsForDate(d);
            const isToday = d === today;
            return (
              <div
                key={d}
                className={`relative border-l border-line ${
                  isToday ? "bg-brand-softer/60" : ""
                }`}
              >
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-line"
                    style={{ top: i * HOUR_H }}
                  />
                ))}
                {meals.map((m) => (
                  <GridEvent key={m.id} item={m} onSelect={onSelect} compact />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-line px-2 py-2 text-center last:border-r-0 sm:px-3">
      <div className="text-sm font-bold text-ink">{value}</div>
      <div className="text-[10px] leading-tight text-muted sm:text-[11px]">{label}</div>
    </div>
  );
}

/* ----------------------------- Month view ----------------------------- */

function MonthView({
  anchor,
  today,
  onSelect,
  onAdd,
}: {
  anchor: string;
  today: string;
  onSelect: (m: MealPlanItem) => void;
  onAdd: (dateKey: string) => void;
}) {
  const { mealsForDate, getRecipe } = useApp();
  const grid = monthGrid(anchor);
  const weekdayHeads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-line bg-surface">
        {weekdayHeads.map((w) => (
          <div
            key={w}
            className="border-l border-line py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted first:border-l-0"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {grid.map((d) => {
          const inMonth = isSameMonth(d, anchor);
          const isToday = d === today;
          const meals = mealsForDate(d);
          return (
            <button
              key={d}
              onClick={() => onAdd(d)}
              className={`group flex min-h-[96px] flex-col border-b border-l border-line p-1.5 text-left transition-colors hover:bg-surface-muted ${
                inMonth ? "" : "bg-surface-muted/50"
              }`}
            >
              <span
                className={`mb-1 flex h-6 w-6 items-center justify-center self-start rounded-full text-sm font-semibold ${
                  isToday
                    ? "bg-brand text-white"
                    : inMonth
                      ? "text-ink"
                      : "text-muted"
                }`}
              >
                {dayNum(d)}
              </span>
              <div className="flex flex-col gap-1">
                {meals.slice(0, 3).map((m) => {
                  const r = getRecipe(m.recipeId);
                  if (!r) return null;
                  const eaten = m.status === "eaten";
                  return (
                    <span
                      key={m.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(m);
                      }}
                      className={`truncate rounded border-l-2 px-1.5 py-0.5 text-[11px] font-medium ${
                        eaten
                          ? "border-eaten bg-eaten-bg text-eaten"
                          : "border-planned bg-planned-bg text-planned"
                      }`}
                    >
                      {r.title}
                    </span>
                  );
                })}
                {meals.length > 3 && (
                  <span className="px-1 text-[11px] text-muted">
                    +{meals.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- Agenda view ---------------------------- */

function AgendaView({
  anchor,
  today,
  onSelect,
}: {
  anchor: string;
  today: string;
  onSelect: (m: MealPlanItem) => void;
}) {
  const { mealPlan, getRecipe, mealNutrition } = useApp();
  const days = weekDays(anchor);

  const grouped = useMemo(
    () =>
      days.map((d) => ({
        date: d,
        meals: mealPlan
          .filter((m) => m.date === d)
          .sort((a, b) => a.time.localeCompare(b.time)),
      })),
    [days, mealPlan]
  );

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-3xl">
        {grouped.map((group) => (
          <div key={group.date} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {agendaDayLabel(group.date)}
              </h3>
              {group.date === today && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  Today
                </span>
              )}
            </div>
            {group.meals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                Nothing planned.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {group.meals.map((m) => {
                  const r = getRecipe(m.recipeId);
                  if (!r) return null;
                  const n = mealNutrition(m);
                  return (
                    <button
                      key={m.id}
                      onClick={() => onSelect(m)}
                      className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-surface-muted"
                    >
                      <span className="w-12 shrink-0 text-sm font-medium text-muted">
                        {m.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-ink">
                          {r.title}
                        </div>
                        <div className="text-sm capitalize text-ink-soft">
                          {m.mealType} · {n.calories} kcal ·{" "}
                          <span className="text-protein">{n.protein}g protein</span>
                        </div>
                      </div>
                      <StatusPill status={m.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Shared bits --------------------------- */

function GridEvent({
  item,
  onSelect,
  compact,
}: {
  item: MealPlanItem;
  onSelect: (m: MealPlanItem) => void;
  compact?: boolean;
}) {
  const { getRecipe } = useApp();
  const r = getRecipe(item.recipeId);
  if (!r) return null;
  const eaten = item.status === "eaten";
  const top = timeToTop(item.time);
  const height = Math.max(compact ? 34 : 44, HOUR_H * 0.8);

  return (
    <button
      onClick={() => onSelect(item)}
      className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left transition-shadow hover:shadow-md ${
        eaten
          ? "border-eaten bg-eaten-bg"
          : "border-planned bg-planned-bg"
      }`}
      style={{ top, height }}
    >
      <div
        className={`truncate text-[12px] font-semibold ${
          eaten ? "text-eaten" : "text-planned"
        }`}
      >
        {r.title}
      </div>
      {!compact && (
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] ${eaten ? "text-eaten/80" : "text-planned/80"}`}
          >
            {item.time} – {addMinutes(item.time, 45)}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              eaten ? "text-eaten" : "text-planned"
            }`}
          >
            {eaten ? "Eaten" : "Planned"}
          </span>
        </div>
      )}
    </button>
  );
}

function StatusPill({ status }: { status: MealPlanItem["status"] }) {
  if (status === "eaten") {
    return (
      <span className="shrink-0 rounded-full bg-eaten-bg px-2.5 py-1 text-xs font-semibold text-eaten">
        Eaten
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-planned-bg px-2.5 py-1 text-xs font-semibold text-planned">
      Planned
    </span>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}
