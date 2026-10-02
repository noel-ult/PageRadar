import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { createHash } from "node:crypto";
import { FetchFailure } from "../security/url-validator";

export const EXTRACTION_VERSION = 2;
export interface NormalizedSection {
  id?: string;
  title: string;
  content: string;
}
export interface NormalizedPage {
  title: string;
  description: string;
  normalizedText: string;
  sections: NormalizedSection[];
  links: { text: string; url: string }[];
  contentHash: string;
  contentSize: number;
}
export interface ExtractionOptions {
  includeSelector?: string | null;
  excludeSelector?: string | null;
  baseUrl?: string;
}

@Injectable()
export class ContentNormalizer {
  normalize(html: string, options: ExtractionOptions = {}): NormalizedPage {
    const $ = cheerio.load(html);
    const clean = (text: string) => text.replace(/\s+/g, " ").trim();
    const title = clean(
      $("title").first().text() ||
        $('meta[property="og:title"]').attr("content") ||
        $("h1").first().text(),
    );
    const description = clean(
      $('meta[name="description"]').attr("content") || "",
    );
    const bodyText = clean($("body").text());
    if (
      /just a moment|access denied|verify you are human|checking your browser/i.test(
        title,
      ) ||
      /^(please )?(enable javascript|sign in to continue|log in to continue)/i.test(
        bodyText,
      )
    ) {
      throw new FetchFailure(
        "Page returned a login or browser challenge; baseline preserved.",
      );
    }
    $(
      'script,style,noscript,iframe,object,embed,svg,canvas,template,nav,footer,[role="navigation"],[role="contentinfo"],[aria-hidden="true"],.cookie-banner,.cookie-notice,.cookie-consent,.ad-container,.advertisement,.social-share,.share-buttons',
    ).remove();
    let root: cheerio.Cheerio<AnyNode> = $("body");
    try {
      if (options.excludeSelector) $(options.excludeSelector).remove();
      if (options.includeSelector) {
        root = $(options.includeSelector);
        if (!root.length)
          throw new FetchFailure(
            "Selected content was not found; baseline preserved.",
          );
        // Do not traverse nested selected roots twice.
        root = root.filter(
          (_, element) => !$(element).parents(options.includeSelector!).length,
        );
      }
    } catch (error) {
      if (error instanceof FetchFailure) throw error;
      throw new FetchFailure("Invalid content selector");
    }
    const sections: NormalizedSection[] = [];
    const links: NormalizedPage["links"] = [];
    const occurrences = new Map<string, number>();
    let current: NormalizedSection = {
      id: "main#1",
      title: "Main",
      content: "",
    };
    let line = "";
    const flush = () => {
      const text = clean(line)
        .replace(
          /(?:Page generated|Rendered in|Timestamp:?)\s*[\d.:-]+\s*(?:ms|s|UTC)?/gi,
          "",
        )
        .trim();
      if (text && !/^(?:copyright|©)\s*\d{4}(?:\s*[-–]\s*\d{4})?\b/i.test(text))
        current.content += `${current.content ? "\n" : ""}${text}`;
      line = "";
    };
    const finish = () => {
      flush();
      if (current.content || current.title !== "Main") sections.push(current);
    };
    const visit = (node: AnyNode) => {
      if (node.type === "text") {
        line += node.data;
        return;
      }
      if (!("tagName" in node)) return;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        finish();
        const heading = clean($(el).text());
        const key = heading.toLowerCase();
        const ordinal = (occurrences.get(key) ?? 0) + 1;
        occurrences.set(key, ordinal);
        current = { id: `${key}#${ordinal}`, title: heading, content: "" };
        return;
      }
      const block =
        /^(p|div|section|article|main|li|tr|td|th|header|aside|blockquote|pre|dl|dt|dd|br|hr)$/.test(
          tag,
        );
      if (block) flush();
      for (const child of el.children) visit(child);
      if (tag === "a") {
        const raw = $(el).attr("href");
        if (raw) {
          try {
            const url = new URL(
              raw,
              options.baseUrl || "https://relative.invalid",
            );
            if (["http:", "https:"].includes(url.protocol)) {
              for (const key of [...url.searchParams.keys()])
                if (
                  /^utm_|^(gclid|fbclid|msclkid|mc_cid|mc_eid|_ga)$/.test(key)
                )
                  url.searchParams.delete(key);
              const destination =
                !options.baseUrl && url.hostname === "relative.invalid"
                  ? url.pathname + url.search + url.hash
                  : url.toString();
              links.push({ text: clean($(el).text()), url: destination });
              line += ` [${destination}]`;
            }
          } catch {
            /* malformed and unsafe links are data, never followed */
          }
        }
      }
      if (block) flush();
    };
    root.each((_, el) => {
      visit(el);
      flush();
    });
    finish();
    const body = sections
      .map(
        (section) =>
          `${section.title === "Main" ? "" : `${section.title}\n`}${section.content}`,
      )
      .join("\n\n")
      .trim();
    if (!body)
      throw new FetchFailure(
        "No meaningful content extracted; baseline preserved.",
      );
    const normalizedText = [
      title ? `Title: ${title}` : "",
      description ? `Description: ${description}` : "",
      body,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (Buffer.byteLength(normalizedText) > 200000 || sections.length > 500)
      throw new FetchFailure(
        "Extracted content is too large; choose a specific page section.",
      );
    return {
      title,
      description,
      normalizedText,
      sections,
      links,
      contentHash: createHash("sha256").update(normalizedText).digest("hex"),
      contentSize: Buffer.byteLength(normalizedText),
    };
  }
}
