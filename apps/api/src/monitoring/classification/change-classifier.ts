import { Injectable, Logger } from "@nestjs/common";
import { ChangeType } from "@prisma/client";
import { DiffResult } from "../diff/diff-engine";
import { SemanticAnalyzer } from "./semantic-analyzer";
import { FetchFailure } from "../security/url-validator";
import { diffLines } from "diff";
import { DiffEngine } from "../diff/diff-engine";
import { NormalizedSection } from "../normalization/content-normalizer";

export interface ClassificationResult {
  isMeaningful: boolean;
  category: ChangeType;
  importance: number; // 0 - 100
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  summary: string;
  section: string;
  oldValue: string;
  newValue: string;
}

@Injectable()
export class ChangeClassifier {
  private readonly logger = new Logger(ChangeClassifier.name);

  constructor(private readonly semanticAnalyzer: SemanticAnalyzer) {}

  async classifyMany(
    previous: string,
    current: string,
    before: NormalizedSection[],
    after: NormalizedSection[],
    title: string,
  ) {
    const engine = new DiffEngine();
    const overall = engine.computeDiff(previous, current, before, after);
    if (overall.addedLines.length + overall.removedLines.length > 100)
      throw new FetchFailure(
        "Too many changes to analyze safely; choose a specific page section.",
      );
    const events: {
      result: ClassificationResult;
      percentage: number;
      eventKey: string;
    }[] = [];
    for (const [index, section] of overall.sectionDiffs.entries()) {
      const oldSection = before.find(
        (s, i) => (s.id ?? `${s.title.toLowerCase()}#${i}`) === section.id,
      );
      const newSection = after.find(
        (s, i) => (s.id ?? `${s.title.toLowerCase()}#${i}`) === section.id,
      );
      const parts = diffLines(
        oldSection?.content ?? "",
        newSection?.content ?? "",
      );
      let oldLines: string[] = [];
      let newLines: string[] = [];
      let eventIndex = 0;
      const flush = async () => {
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
          const diff = engine.computeDiff(oldLines[i] ?? "", newLines[i] ?? "");
          diff.sectionDiffs = [section];
          const result = await this.classify(diff, title);
          result.section = section.section;
          events.push({
            result,
            percentage: overall.changePercentage,
            eventKey: `section-${index}-${eventIndex++}`,
          });
        }
        oldLines = [];
        newLines = [];
      };
      for (const part of parts) {
        if (part.removed)
          oldLines.push(...part.value.split("\n").filter(Boolean));
        else if (part.added)
          newLines.push(...part.value.split("\n").filter(Boolean));
        else await flush();
      }
      await flush();
      if (!parts.some((p) => p.added || p.removed)) {
        const diff = engine.computeDiff(
          oldSection ? section.section : "",
          newSection ? section.section : "",
        );
        diff.sectionDiffs = [section];
        events.push({
          result: await this.classify(diff, title),
          percentage: overall.changePercentage,
          eventKey: `section-${index}-heading`,
        });
      }
    }
    if (!events.length && overall.hasChanged)
      events.push({
        result: await this.classify(overall, title),
        percentage: overall.changePercentage,
        eventKey: "content",
      });
    return events;
  }

  async classify(
    diff: DiffResult,
    pageTitle = "Page",
  ): Promise<ClassificationResult> {
    if (!diff.hasChanged) {
      return {
        isMeaningful: false,
        category: ChangeType.CONTENT_CHANGED,
        importance: 0,
        severity: "LOW",
        confidence: 1.0,
        summary: "No changes detected.",
        section: "General",
        oldValue: "",
        newValue: "",
      };
    }

    // 1. Layer 1: Deterministic Heuristic Classification
    const heuristic = this.runHeuristics(diff);

    // 2. Layer 2: Optional Semantic / LLM refinement
    let finalCategory = heuristic.category;
    let finalImportance = heuristic.importance;
    let finalSeverity = heuristic.severity;
    let finalSummary = heuristic.summary;
    let finalConfidence = heuristic.confidence;
    let isMeaningful = heuristic.isMeaningful;

    if (
      heuristic.isMeaningful &&
      heuristic.confidence < 0.8 &&
      this.semanticAnalyzer.isAvailable()
    ) {
      const semanticResult = await this.semanticAnalyzer.analyze(
        diff,
        pageTitle,
      );
      if (semanticResult) {
        finalCategory = semanticResult.category;
        finalImportance = semanticResult.importance;
        finalSeverity = semanticResult.severity;
        finalSummary = semanticResult.summary;
        finalConfidence = semanticResult.confidence;
        isMeaningful = semanticResult.isMeaningful;
      }
    }

    // 3. Primary section affected
    const primarySection =
      diff.sectionDiffs.length > 0
        ? diff.sectionDiffs[0].section
        : "Page content";

    return {
      isMeaningful,
      category: finalCategory,
      importance: finalImportance,
      severity: finalSeverity,
      confidence: Math.round(finalConfidence * 100) / 100,
      summary: finalSummary,
      section: primarySection,
      oldValue: diff.beforeSnippet || "Previous content",
      newValue: diff.afterSnippet || "Updated content",
    };
  }

  private explicitDate(text: string): number | null {
    const matches = text.match(
      /\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}\b/gi,
    );
    if (matches?.length !== 1) return null;
    const value = Date.parse(`${matches[0]} UTC`);
    return Number.isFinite(value) ? value : null;
  }

  private runHeuristics(diff: DiffResult): {
    category: ChangeType;
    importance: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence: number;
    isMeaningful: boolean;
    summary: string;
  } {
    const combinedAdded = diff.addedLines.join(" ");
    const combinedRemoved = diff.removedLines.join(" ");
    const changeText = `${combinedAdded} ${combinedRemoved}`.toLowerCase();

    // Check pattern rules in priority order
    let category: ChangeType = ChangeType.CONTENT_CHANGED;
    let baseScore = 40;
    let matchedReason = "Content was updated.";
    let confidence = 0.65;

    // A. DEADLINE
    const deadlinePattern =
      /\b(deadline|due date|closing date|apply by|last date|cutoff|expires? on|expiry)\b/i;

    const dateValues = (text: string) =>
      text
        .toLowerCase()
        .match(
          /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:,?\s+\d{4})?|\b(?:today|tomorrow|tbd)\b/g,
        ) ?? [];
    const datesChanged =
      JSON.stringify(dateValues(combinedAdded)) !==
      JSON.stringify(dateValues(combinedRemoved));
    const scheduleTermsChanged =
      /extended|postponed|cancelled|rescheduled|removed|indefinite/i.test(
        [...diff.addedWords, ...diff.removedWords].join(" "),
      );
    if (
      (datesChanged || scheduleTermsChanged) &&
      deadlinePattern.test(
        `${changeText} ${diff.sectionDiffs.map((s) => s.section).join(" ")}`,
      )
    ) {
      category = ChangeType.DEADLINE_CHANGED;
      baseScore = 85;
      confidence = 0.92;
      matchedReason = "Deadline, date, or schedule information was updated.";
    }
    // B. STATUS
    else if (
      /\b(status|open|closed|sold out|in stock|out of stock|available|unavailable|postponed|cancelled|rescheduled|active|inactive)\b/i.test(
        changeText,
      ) &&
      /\b(registration|admission|ticket|event|applications?|store|item)\b/i.test(
        changeText,
      )
    ) {
      category = ChangeType.STATUS_CHANGED;
      baseScore = 80;
      confidence = 0.9;
      matchedReason =
        "Availability, operational, or registration status changed.";
    }
    // C. ELIGIBILITY
    else if (
      /\b(eligibility|criteria|who can apply|prerequisite|qualif(?:y|ication)|minimum age|gpa requirements?)\b/i.test(
        changeText,
      )
    ) {
      category = ChangeType.ELIGIBILITY_CHANGED;
      baseScore = 80;
      confidence = 0.88;
      matchedReason =
        "Eligibility criteria or qualification rules were modified.";
    }
    // D. PRICE
    else if (
      /(\$|€|£|₹|usd|eur|gbp|inr)\s*\d+(\.\d{2})?|\b(price|pricing|cost|fee|discount|rate|subscription)\b/i.test(
        changeText,
      )
    ) {
      category = ChangeType.PRICE_CHANGED;
      baseScore = 75;
      confidence = 0.88;
      matchedReason = "Pricing, rates, or financial terms were altered.";
    }
    // E. REQUIREMENT
    else if (
      /\b(mandatory|must provide|submission requirement|required documents?|specifications?)\b/i.test(
        changeText,
      )
    ) {
      category = ChangeType.REQUIREMENT_CHANGED;
      baseScore = 70;
      confidence = 0.85;
      matchedReason =
        "Mandatory requirements or submission instructions changed.";
    } else if (
      diff.addedLines.some((line) =>
        /\.(pdf|docx?|xlsx?)(?:[?#\]\s]|$)/i.test(line),
      )
    ) {
      category = ChangeType.DOCUMENT_ADDED;
      baseScore = 60;
      confidence = 0.85;
      matchedReason = "A document link was added or changed.";
    } else if (
      !diff.removedLines.length &&
      diff.addedLines.length &&
      /announcement|notification|notice|scholarship|internship|vacancy/i.test(
        changeText,
      )
    ) {
      category = ChangeType.ANNOUNCEMENT_ADDED;
      baseScore = 65;
      confidence = 0.85;
      matchedReason = "A new announcement was added.";
    }
    // F. LINK
    else if (
      diff.addedWords.some((w) => w.startsWith("http")) ||
      diff.removedWords.some((w) => w.startsWith("http"))
    ) {
      category = ChangeType.LINK_CHANGED;
      baseScore = 50;
      confidence = 0.85;
      matchedReason = "Links or resource destinations were updated.";
    }
    // G. SECTION
    else if (
      diff.sectionDiffs.some((s) => s.type === "ADDED" || s.type === "REMOVED")
    ) {
      category = ChangeType.SECTION_CHANGED;
      baseScore = 60;
      confidence = 0.82;
      matchedReason =
        "Page structure changed: entire sections were added or removed.";
    }

    // Magnitude adjustment
    let adjustedScore = baseScore;
    if (diff.changePercentage >= 35) adjustedScore += 15;
    else if (diff.changePercentage >= 15) adjustedScore += 8;
    else if (
      diff.changePercentage < 3 &&
      category === ChangeType.CONTENT_CHANGED
    )
      adjustedScore -= 15;

    const importance = Math.max(10, Math.min(100, Math.round(adjustedScore)));

    // Map importance to severity
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (importance >= 80) severity = "CRITICAL";
    else if (importance >= 65) severity = "HIGH";
    else if (importance >= 40) severity = "MEDIUM";

    // Meaningfulness: noise filtering
    const noiseOnly =
      /^(?:copyright|©|page generated|rendered in|timestamp)/i.test(
        combinedAdded,
      ) &&
      /^(?:copyright|©|page generated|rendered in|timestamp)/i.test(
        combinedRemoved,
      );
    const isMeaningful =
      !noiseOnly &&
      !(
        category === ChangeType.CONTENT_CHANGED &&
        diff.changePercentage < 1.0 &&
        diff.changedWordCount < 5
      );

    // Build human-readable summary
    const summaryParts: string[] = [matchedReason];
    if (category === ChangeType.DEADLINE_CHANGED) {
      const oldDate = this.explicitDate(combinedRemoved);
      const newDate = this.explicitDate(combinedAdded);
      if (oldDate !== null && newDate !== null && oldDate !== newDate) {
        const days = Math.round((newDate - oldDate) / 86400000);
        summaryParts[0] = `The application deadline was ${days > 0 ? "extended" : "brought forward"} by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}.`;
      }
    }
    if (diff.addedLines.length > 0) {
      summaryParts.push(`Added: "${diff.addedLines[0].slice(0, 100)}"`);
    }
    if (diff.removedLines.length > 0) {
      summaryParts.push(`Removed: "${diff.removedLines[0].slice(0, 100)}"`);
    }

    return {
      category,
      importance,
      severity,
      confidence,
      isMeaningful,
      summary: summaryParts.join(" "),
    };
  }
}
