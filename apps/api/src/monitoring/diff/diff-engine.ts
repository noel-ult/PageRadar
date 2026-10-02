import { Injectable } from "@nestjs/common";
import { diffWords, diffLines, Change as DiffPart } from "diff";
import { NormalizedSection } from "../normalization/content-normalizer";

export interface SectionDiff {
  id?: string;
  section: string;
  type: "ADDED" | "REMOVED" | "MODIFIED";
  beforeSnippet?: string;
  afterSnippet?: string;
}

export interface DiffResult {
  hasChanged: boolean;
  changePercentage: number;
  changedWordCount: number;
  changedCharCount: number;
  addedWords: string[];
  removedWords: string[];
  addedLines: string[];
  removedLines: string[];
  sectionDiffs: SectionDiff[];
  beforeSnippet: string;
  afterSnippet: string;
  diffSummary: string;
}

@Injectable()
export class DiffEngine {
  computeDiff(
    previousText: string,
    currentText: string,
    previousSections: NormalizedSection[] = [],
    currentSections: NormalizedSection[] = [],
  ): DiffResult {
    if (previousText === currentText) {
      return {
        hasChanged: false,
        changePercentage: 0,
        changedWordCount: 0,
        changedCharCount: 0,
        addedWords: [],
        removedWords: [],
        addedLines: [],
        removedLines: [],
        sectionDiffs: [],
        beforeSnippet: "",
        afterSnippet: "",
        diffSummary: "No changes detected.",
      };
    }

    // 1. Line-level diff for lines & snippets
    const lineParts: DiffPart[] = diffLines(previousText, currentText);
    const addedLines: string[] = [];
    const removedLines: string[] = [];

    for (const part of lineParts) {
      const lines = part.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (part.added) {
        addedLines.push(...lines);
      } else if (part.removed) {
        removedLines.push(...lines);
      }
    }

    // 2. Word-level diff for detailed metrics
    const wordParts: DiffPart[] = diffWords(previousText, currentText);
    const addedWords: string[] = [];
    const removedWords: string[] = [];
    let addedChars = 0;
    let removedChars = 0;

    for (const part of wordParts) {
      const words = part.value.trim().split(/\s+/).filter(Boolean);
      if (part.added) {
        addedWords.push(...words);
        addedChars += part.value.length;
      } else if (part.removed) {
        removedWords.push(...words);
        removedChars += part.value.length;
      }
    }

    const changedWordCount = addedWords.length + removedWords.length;
    const changedCharCount = addedChars + removedChars;
    const totalBaseline = Math.max(
      1,
      (previousText.length + currentText.length) / 2,
    );
    const rawPercentage = (changedCharCount / (totalBaseline * 2)) * 100;
    const changePercentage = Math.min(100, Math.round(rawPercentage * 10) / 10);

    // 3. Section-level diff
    const sectionDiffs = this.diffSections(previousSections, currentSections);

    // 4. Before & After snippets for UI display
    const beforeSnippet = this.generateSnippet(removedLines, previousText);
    const afterSnippet = this.generateSnippet(addedLines, currentText);

    // 5. Build summary
    const summaryLines: string[] = [];
    summaryLines.push(
      `Detected ${changePercentage}% change (${changedWordCount} words modified).`,
    );

    if (sectionDiffs.length > 0) {
      const sectionNames = sectionDiffs
        .slice(0, 3)
        .map((s) => `"${s.section}" (${s.type.toLowerCase()})`);
      summaryLines.push(`Sections affected: ${sectionNames.join(", ")}.`);
    }

    if (addedLines.length > 0) {
      summaryLines.push(
        `Added highlights:\n${addedLines
          .slice(0, 3)
          .map((l) => `+ ${l}`)
          .join("\n")}`,
      );
    }

    if (removedLines.length > 0) {
      summaryLines.push(
        `Removed highlights:\n${removedLines
          .slice(0, 3)
          .map((l) => `- ${l}`)
          .join("\n")}`,
      );
    }

    return {
      hasChanged: true,
      changePercentage,
      changedWordCount,
      changedCharCount,
      addedWords,
      removedWords,
      addedLines,
      removedLines,
      sectionDiffs,
      beforeSnippet,
      afterSnippet,
      diffSummary: summaryLines.join("\n\n"),
    };
  }

  private diffSections(
    previousSections: NormalizedSection[],
    currentSections: NormalizedSection[],
  ): SectionDiff[] {
    const diffs: SectionDiff[] = [];
    const prevMap = new Map(
      previousSections.map((s, i) => [
        s.id ?? `${s.title.toLowerCase()}#${i}`,
        s.content,
      ]),
    );
    const currMap = new Map(
      currentSections.map((s, i) => [
        s.id ?? `${s.title.toLowerCase()}#${i}`,
        s.content,
      ]),
    );

    // Check added and modified sections
    for (const [titleLower, content] of currMap.entries()) {
      const originalTitle =
        currentSections.find(
          (s, i) => (s.id ?? `${s.title.toLowerCase()}#${i}`) === titleLower,
        )?.title ?? titleLower;
      const prevContent = prevMap.get(titleLower);

      if (prevContent === undefined) {
        diffs.push({
          id: titleLower,
          section: originalTitle,
          type: "ADDED",
          afterSnippet: content.slice(0, 300),
        });
      } else if (prevContent !== content) {
        diffs.push({
          id: titleLower,
          section: originalTitle,
          type: "MODIFIED",
          beforeSnippet: prevContent.slice(0, 300),
          afterSnippet: content.slice(0, 300),
        });
      }
    }

    // Check removed sections
    for (const [titleLower, prevContent] of prevMap.entries()) {
      if (!currMap.has(titleLower)) {
        const originalTitle =
          previousSections.find(
            (s, i) => (s.id ?? `${s.title.toLowerCase()}#${i}`) === titleLower,
          )?.title ?? titleLower;
        diffs.push({
          id: titleLower,
          section: originalTitle,
          type: "REMOVED",
          beforeSnippet: prevContent.slice(0, 300),
        });
      }
    }

    return diffs;
  }

  private generateSnippet(
    highlightLines: string[],
    fallbackText: string,
  ): string {
    if (highlightLines.length > 0) {
      return highlightLines.slice(0, 4).join("\n").slice(0, 500);
    }
    return fallbackText.slice(0, 300);
  }
}
