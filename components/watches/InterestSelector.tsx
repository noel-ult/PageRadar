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
      <legend className="text-xs font-medium text-zinc-300">
        What changes should we look for?
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {INTEREST_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition ${
              selected.includes(opt.value)
                ? "border-zinc-700 bg-zinc-800/80 text-white"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-zinc-700 accent-white"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
