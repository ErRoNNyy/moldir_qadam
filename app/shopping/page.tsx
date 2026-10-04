"use client";

import { useMemo, useState } from "react";
import { useApp, CATEGORY_ORDER } from "@/lib/store";
import { addDays, offsetKey, startOfWeek, todayKey } from "@/lib/date";
import type { IngredientCategory, ShoppingItem } from "@/lib/types";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";

type RangeKey = "week" | "next7" | "next3";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "next3", label: "Next 3 days" },
  { key: "next7", label: "Next 7 days" },
];

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  "Meat & Fish": "🥩",
  Carbs: "🍞",
  Vegetables: "🥦",
  Dairy: "🧀",
  Fruit: "🍎",
  Pantry: "🫙",
  Other: "🛒",
};

export default function ShoppingPage() {
  const {
    shoppingForRange,
    toggleShoppingItem,
    addManualShoppingItem,
    removeManualShoppingItem,
    hydrated,
  } = useApp();
  const [range, setRange] = useState<RangeKey>("week");
  const [newName, setNewName] = useState("");

  const [start, end] = useMemo(() => {
    const t = todayKey();
    if (range === "week") return [startOfWeek(t), addDays(startOfWeek(t), 6)];
    if (range === "next3") return [t, offsetKey(2)];
    return [t, offsetKey(6)];
  }, [range]);

  const grouped = shoppingForRange(start, end);

  const { total, checked } = useMemo(() => {
    let total = 0;
    let checked = 0;
    for (const cat of CATEGORY_ORDER) {
      for (const item of grouped[cat]) {
        total++;
        if (item.checked) checked++;
      }
    }
    return { total, checked };
  }, [grouped]);

  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);

  function addItem() {
    const name = newName.trim();
    if (!name) return;
    addManualShoppingItem({ name, quantity: 1, unit: "", category: "Other" });
    setNewName("");
  }

  const nonEmpty = CATEGORY_ORDER.filter((c) => grouped[c].length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-ink">Shopping</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            Auto-built from your planned meals. Combined and ready to shop.
          </p>
        </div>
      </header>

      {/* Range + progress */}
      <div className="mb-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-lg border border-line-strong p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r.key
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-ink-soft">
            {checked} of {total} items
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Add item */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 focus-within:border-brand">
        <PlusIcon className="text-muted" />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add an item..."
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <button
          onClick={addItem}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Add
        </button>
      </div>

      {/* Groups */}
      {!hydrated ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="text-lg font-semibold text-ink">Nothing to buy yet</p>
          <p className="mt-1 text-sm text-muted">
            Plan some meals on the calendar and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {nonEmpty.map((cat) => (
            <section key={cat}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <span aria-hidden>{CATEGORY_EMOJI[cat]}</span>
                {cat}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {grouped[cat].map((item, i) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    last={i === grouped[cat].length - 1}
                    onToggle={() => toggleShoppingItem(item)}
                    onRemove={
                      item.manual
                        ? () => removeManualShoppingItem(item.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  last,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  last: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          item.checked
            ? "border-brand bg-brand text-white"
            : "border-line-strong text-transparent hover:border-brand"
        }`}
        aria-label={item.checked ? "Uncheck" : "Check"}
      >
        <CheckIcon width={13} height={13} />
      </button>
      <span
        className={`flex-1 text-[15px] ${
          item.checked ? "text-muted line-through" : "text-ink"
        }`}
      >
        {item.name}
        {item.manual && (
          <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
            added
          </span>
        )}
      </span>
      {(item.quantity > 0 || item.unit) && (
        <span
          className={`text-sm font-medium ${
            item.checked ? "text-muted" : "text-ink-soft"
          }`}
        >
          {formatQty(item.quantity)} {item.unit}
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-md p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label="Remove"
        >
          <TrashIcon width={15} height={15} />
        </button>
      )}
    </div>
  );
}

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}
