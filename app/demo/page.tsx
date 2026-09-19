"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Priority = "High" | "Medium" | "Low";

const watches = [
  { name: "University admissions", url: "admissions.university.edu", interval: "Every 6 hours", state: "Active", changes: 2 },
  { name: "SaaS pro pricing", url: "cloudtool.com/pricing", interval: "Every 12 hours", state: "Active", changes: 1 },
  { name: "Research grant calls", url: "grants.foundation.org", interval: "Daily", state: "Paused", changes: 0 },
];

const changes = [
  {
    id: "deadline",
    site: "University admissions",
    type: "Deadline extended",
    priority: "High" as Priority,
    before: "Applications close 12 January 2027",
    after: "Applications close 19 January 2027",
    time: "8 mins ago",
    note: "The application deadline was extended by seven days.",
  },
  {
    id: "price",
    site: "SaaS pro pricing",
    type: "Price change",
    priority: "Medium" as Priority,
    before: "$49 / month",
    after: "$39 / month",
    time: "2 hours ago",
    note: "Promotional monthly subscription pricing reduced by $10.",
  },
  {
    id: "eligibility",
    site: "Research grant calls",
    type: "Eligibility updated",
    priority: "High" as Priority,
    before: "Open to final-year students only",
    after: "Open to all undergraduate students",
    time: "Yesterday",
    note: "Grant eligibility was widened to include first through third-year students.",
  },
];

const priorityBadge: Record<Priority, string> = {
  High: "bg-red-950/40 text-red-300 border border-red-800/40",
  Medium: "bg-amber-950/40 text-amber-300 border border-amber-800/40",
  Low: "bg-zinc-800 text-zinc-300 border border-zinc-700",
};

export default function DemoPage() {
  const [filter, setFilter] = useState<"All" | Priority>("All");
  const [selected, setSelected] = useState(changes[0].id);
  const visibleChanges = useMemo(
    () => (filter === "All" ? changes : changes.filter((c) => c.priority === filter)),
    [filter]
  );
  const focused = changes.find((c) => c.id === selected) ?? changes[0];

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="grid h-6 w-6 place-items-center rounded bg-zinc-800 text-xs font-bold text-white">
              P
            </span>
            PageRadar
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-normal">
              Demo
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-zinc-400 hover:text-white transition">
              Overview
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-zinc-200 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Monitored Pages</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Interactive preview of detected webpage updates.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            + Add webpage
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[
            { val: "3", label: "Active watches", note: "Checked on schedule" },
            { val: "3", label: "Changes found", note: "In the last 24 hours" },
            { val: "2", label: "Needs attention", note: "High importance updates" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <p className="text-xs font-medium text-zinc-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stat.val}</p>
              <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>
            </div>
          ))}
        </div>

        {/* Content Layout */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Changes Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Detected Changes</h2>
              <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs">
                {(["All", "High", "Medium", "Low"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`rounded px-2.5 py-1 transition ${
                      filter === option
                        ? "bg-zinc-800 text-white font-medium shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {visibleChanges.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected === c.id
                      ? "border-zinc-700 bg-zinc-900/70"
                      : "border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{c.type}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {c.site} · {c.time}
                      </p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadge[c.priority]}`}>
                      {c.priority}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Change Details */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 h-fit">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">{focused.type}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{focused.site}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadge[focused.priority]}`}>
                {focused.priority}
              </span>
            </div>

            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{focused.note}</p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-xl border border-red-950/40 bg-red-950/20 p-3.5">
                <p className="text-xs font-medium text-red-400 mb-1">Before</p>
                <p className="text-red-200 line-through text-xs leading-relaxed">{focused.before}</p>
              </div>
              <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/20 p-3.5">
                <p className="text-xs font-medium text-emerald-400 mb-1">After</p>
                <p className="text-emerald-200 text-xs leading-relaxed">{focused.after}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


