import { ChangeType } from "@prisma/client";
import { ChangeClassifier } from "./change-classifier";
import { SemanticAnalyzer } from "./semantic-analyzer";
import { DiffResult } from "../diff/diff-engine";

describe("ChangeClassifier", () => {
  let classifier: ChangeClassifier;
  let semanticAnalyzer: SemanticAnalyzer;

  beforeEach(() => {
    semanticAnalyzer = new SemanticAnalyzer();
    // In unit tests, semantic analyzer has no API key -> defaults to deterministic heuristics
    classifier = new ChangeClassifier(semanticAnalyzer);
  });

  function makeMockDiff(overrides: Partial<DiffResult>): DiffResult {
    return {
      hasChanged: true,
      changePercentage: 10,
      changedWordCount: 8,
      changedCharCount: 40,
      addedWords: [],
      removedWords: [],
      addedLines: [],
      removedLines: [],
      sectionDiffs: [],
      beforeSnippet: "",
      afterSnippet: "",
      diffSummary: "",
      ...overrides,
    };
  }

  it("should classify deadline/date changes as DEADLINE_CHANGED with high severity", async () => {
    const diff = makeMockDiff({
      addedLines: ["Final application deadline: November 30, 2026."],
      removedLines: ["Final application deadline: October 15, 2026."],
      addedWords: ["November", "30,"],
      removedWords: ["October", "15,"],
    });

    const result = await classifier.classify(diff, "Admissions Page");
    expect(result.category).toBe(ChangeType.DEADLINE_CHANGED);
    expect(result.importance).toBeGreaterThanOrEqual(75);
    expect(result.severity).toBe("CRITICAL");
    expect(result.isMeaningful).toBe(true);
  });

  it("should classify status/availability changes as STATUS_CHANGED", async () => {
    const diff = makeMockDiff({
      addedLines: ["Conference ticket registration is now open!"],
      removedLines: ["Conference ticket registration is closed."],
    });

    const result = await classifier.classify(diff, "Event Page");
    expect(result.category).toBe(ChangeType.STATUS_CHANGED);
    expect(result.importance).toBeGreaterThanOrEqual(70);
    expect(result.isMeaningful).toBe(true);
  });

  it("should classify pricing changes as PRICE_CHANGED", async () => {
    const diff = makeMockDiff({
      addedLines: ["Monthly subscription: $99 / mo"],
      removedLines: ["Monthly subscription: $49 / mo"],
    });

    const result = await classifier.classify(diff, "Pricing Page");
    expect(result.category).toBe(ChangeType.PRICE_CHANGED);
    expect(result.importance).toBeGreaterThanOrEqual(65);
    expect(result.isMeaningful).toBe(true);
  });

  it("should classify criteria changes as ELIGIBILITY_CHANGED", async () => {
    const diff = makeMockDiff({
      addedLines: [
        "Eligibility criteria: Applicants must have a minimum GPA of 3.8",
      ],
      removedLines: [
        "Eligibility criteria: Applicants must have a minimum GPA of 3.5",
      ],
    });

    const result = await classifier.classify(diff, "Scholarship");
    expect(result.category).toBe(ChangeType.ELIGIBILITY_CHANGED);
    expect(result.importance).toBeGreaterThanOrEqual(70);
  });

  it("should classify mandatory requirements as REQUIREMENT_CHANGED", async () => {
    const diff = makeMockDiff({
      addedLines: [
        "Submission requirement: Mandatory certified transcripts must be attached.",
      ],
      removedLines: ["Transcripts are optional."],
    });

    const result = await classifier.classify(diff, "Application Portal");
    expect(result.category).toBe(ChangeType.REQUIREMENT_CHANGED);
    expect(result.importance).toBeGreaterThanOrEqual(60);
  });

  it("should identify noise / non-meaningful trivial changes", async () => {
    const diff = makeMockDiff({
      changePercentage: 0.2,
      changedWordCount: 1,
      addedLines: ["Updated text."],
      removedLines: ["Updated text"],
    });

    const result = await classifier.classify(diff, "Blog");
    expect(result.category).toBe(ChangeType.CONTENT_CHANGED);
    expect(result.isMeaningful).toBe(false);
  });
  it("does not report a deadline change when only surrounding wording changes", async () => {
    const result = await classifier.classify(
      makeMockDiff({
        removedLines: [
          "Application deadline is October 15, 2026. Contact the helpdesk.",
        ],
        addedLines: [
          "Application deadline is October 15, 2026. Contact support.",
        ],
        addedWords: ["support"],
        removedWords: ["helpdesk"],
      }),
    );
    expect(result.category).toBe(ChangeType.CONTENT_CHANGED);
  });

  it("extracts separate deadline and eligibility events from one section", async () => {
    const before = [
      {
        id: "scholarship#1",
        title: "Scholarship",
        content: "Deadline: October 15, 2026\nEligibility GPA: 3.5",
      },
    ];
    const after = [
      {
        ...before[0],
        content: "Deadline: November 2, 2026\nEligibility GPA: 3.8",
      },
    ];
    const result = await classifier.classifyMany(
      before[0].content,
      after[0].content,
      before,
      after,
      "Scholarship",
    );
    expect(result.map((event) => event.result.category)).toEqual([
      ChangeType.DEADLINE_CHANGED,
      ChangeType.ELIGIBILITY_CHANGED,
    ]);
    expect(result[0].result.summary).toContain("18 days");
  });
});
