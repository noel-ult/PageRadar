import { DiffEngine } from "./diff-engine";

describe("DiffEngine", () => {
  let diffEngine: DiffEngine;

  beforeEach(() => {
    diffEngine = new DiffEngine();
  });

  it("should return hasChanged: false for identical content", () => {
    const text = "Welcome to PageRadar monitoring.\nEverything is up to date.";
    const result = diffEngine.computeDiff(text, text);

    expect(result.hasChanged).toBe(false);
    expect(result.changePercentage).toBe(0);
    expect(result.changedWordCount).toBe(0);
    expect(result.addedWords).toHaveLength(0);
    expect(result.removedWords).toHaveLength(0);
  });

  it("should accurately calculate word additions and removals", () => {
    const before = "Application deadline is October 15, 2026.";
    const after = "Application deadline is November 20, 2026.";

    const result = diffEngine.computeDiff(before, after);

    expect(result.hasChanged).toBe(true);
    expect(result.addedWords).toContain("November");
    expect(result.addedWords).toContain("20");
    expect(result.removedWords).toContain("October");
    expect(result.removedWords).toContain("15");
    expect(result.changedWordCount).toBeGreaterThan(0);
    expect(result.changePercentage).toBeGreaterThan(0);
  });

  it("should detect section modifications", () => {
    const prevSections = [
      { title: "Admissions", content: "Applications open in August." },
      { title: "Tuition", content: "Annual tuition is $10,000." },
    ];
    const currSections = [
      { title: "Admissions", content: "Applications open in August." },
      { title: "Tuition", content: "Annual tuition is $12,500." },
      { title: "Housing", content: "Dormitories are available." },
    ];

    const result = diffEngine.computeDiff(
      "Admissions\nTuition is $10,000",
      "Admissions\nTuition is $12,500\nHousing is available",
      prevSections,
      currSections,
    );

    expect(result.hasChanged).toBe(true);
    const tuitionDiff = result.sectionDiffs.find(
      (s) => s.section === "Tuition",
    );
    expect(tuitionDiff).toBeDefined();
    expect(tuitionDiff?.type).toBe("MODIFIED");

    const housingDiff = result.sectionDiffs.find(
      (s) => s.section === "Housing",
    );
    expect(housingDiff).toBeDefined();
    expect(housingDiff?.type).toBe("ADDED");
  });

  it("should produce structured snippets and summary", () => {
    const before = "Product price: $49/mo.\nFeatures: Basic";
    const after = "Product price: $79/mo.\nFeatures: Pro and Unlimited";

    const result = diffEngine.computeDiff(before, after);
    expect(result.diffSummary).toContain("Detected");
    expect(result.beforeSnippet).toBeDefined();
    expect(result.afterSnippet).toBeDefined();
  });
});
