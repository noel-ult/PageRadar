"use client";

import { INTEREST_OPTIONS } from "@/lib/types";

export function InterestSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-muted">
        What changes should we look for?
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {INTEREST_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-3 text-sm transition ${
              selected.includes(opt.value)
                ? "border-line bg-accent-soft text-primary border-primary"
                : "border-line bg-canvas text-muted hover:border-primary"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-line accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
