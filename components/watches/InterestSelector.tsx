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
      <legend className="text-sm font-medium text-slate-800">
        What information should PageRadar monitor?
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {INTEREST_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
