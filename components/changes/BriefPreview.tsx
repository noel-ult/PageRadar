"use client";
import { useState } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { ImportanceBadge } from "./ImportanceBadge";
import { Icon } from "@/components/common/Icon";
export const SAMPLE_CHANGES = [
  {
    id: "deadline",
    site: "University scholarships",
    type: "Deadline extended",
    importance: 85,
    before: "Applications close 12 January 2027",
    after: "Applications close 19 January 2027",
    note: "The application deadline was extended by seven days.",
    category: "Deadline change",
  },
  {
    id: "price",
    site: "Pro plan pricing",
    type: "Price change",
    importance: 55,
    before: "$49 / month",
    after: "$39 / month",
    note: "The monthly subscription price decreased by $10.",
    category: "Price change",
  },
  {
    id: "eligibility",
    site: "Research grant calls",
    type: "Eligibility updated",
    importance: 80,
    before: "Open to final-year students only",
    after: "Open to all undergraduate students",
    note: "Eligibility now includes students in every undergraduate year.",
    category: "Eligibility change",
  },
];
export function BriefPreview({
  interactive = false,
}: {
  interactive?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const change = SAMPLE_CHANGES[selected];
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon name="signal" className="text-primary" />
          <span className="font-semibold text-sm">Your radar briefing</span>
        </div>
        <span className="badge">Sample data</span>
      </div>
      {interactive ? (
        <div className="grid sm:grid-cols-3 border-b border-line">
          {SAMPLE_CHANGES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={`p-4 text-left text-sm border-b sm:border-b-0 sm:border-r last:border-0 border-line ${selected === index ? "bg-accent-soft text-primary" : "hover:bg-subtle"}`}
            >
              <span className="block font-semibold">{item.type}</span>
              <span className="block text-xs text-muted mt-1">{item.site}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="text-sm text-muted flex gap-2 items-center">
            <Icon name="globe" />
            {change.site}
          </p>
          <ImportanceBadge importance={change.importance} />
        </div>
        <p className="eyebrow text-primary mb-2">{change.category}</p>
        <h2 className="text-xl sm:text-2xl font-bold">{change.type}</h2>
        <p className="text-muted mt-3 mb-5 text-sm sm:text-base">
          {change.note}
        </p>
        <BeforeAfter before={change.before} after={change.after} />
        <div className="flex items-center gap-3 mt-5 rounded-xl bg-accent-soft p-4">
          <Icon name="bell" className="text-primary" />
          <div>
            <p className="text-sm font-semibold">
              An important update, straight to your inbox.
            </p>
            <p className="text-xs text-muted mt-1">
              Example email alert · Verification and opt-in required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
