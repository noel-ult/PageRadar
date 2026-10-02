import { ContentNormalizer } from "./content-normalizer";

describe("ContentNormalizer", () => {
  let normalizer: ContentNormalizer;

  beforeEach(() => {
    normalizer = new ContentNormalizer();
  });

  it("should strip scripts, styles, noscript, and iframe elements", () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <style>body { color: red; }</style>
          <script>console.log("tracking script");</script>
        </head>
        <body>
          <noscript>Please enable JS</noscript>
          <iframe src="https://ads.example.com"></iframe>
          <h1>Main Content Heading</h1>
          <p>Meaningful article content goes here.</p>
        </body>
      </html>
    `;

    const result = normalizer.normalize(html);
    expect(result.normalizedText).toContain("Main Content Heading");
    expect(result.normalizedText).toContain(
      "Meaningful article content goes here.",
    );
    expect(result.normalizedText).not.toContain("tracking script");
    expect(result.normalizedText).not.toContain("color: red");
    expect(result.normalizedText).not.toContain("Please enable JS");
  });

  it("should strip navigation boilerplate, footers, and ad containers", () => {
    const html = `
      <html>
        <body>
          <header><nav><a href="/home">Home</a><a href="/about">About</a></nav></header>
          <div class="ad-container">Buy our product now!</div>
          <div class="cookie-banner">We use cookies. Click agree.</div>
          <h2>Actual Announcement</h2>
          <p>PageRadar v1.0 is released.</p>
          <footer>Copyright 2026 PageRadar Inc.</footer>
        </body>
      </html>
    `;

    const result = normalizer.normalize(html);
    expect(result.normalizedText).toContain("Actual Announcement");
    expect(result.normalizedText).toContain("PageRadar v1.0 is released.");
    expect(result.normalizedText).not.toContain("Buy our product now!");
    expect(result.normalizedText).not.toContain("We use cookies");
    expect(result.normalizedText).not.toContain(
      "Copyright 2026 PageRadar Inc.",
    );
  });

  it("should clean tracking parameters from hyperlinks", () => {
    const html = `
      <html>
        <body>
          <p>Check our link <a href="https://example.com/apply?utm_source=twitter&utm_medium=cpc&gclid=12345&id=99">Apply</a></p>
        </body>
      </html>
    `;

    const result = normalizer.normalize(html);
    expect(result.normalizedText).toContain("Check our link Apply");
  });

  it("should extract structured sections with headings", () => {
    const html = `
      <html>
        <head><title>Scholarship Guide</title></head>
        <body>
          <h2>Eligibility Criteria</h2>
          <p>Students must maintain a 3.5 GPA.</p>
          <h2>Application Deadline</h2>
          <p>Applications close on November 15, 2026.</p>
        </body>
      </html>
    `;

    const result = normalizer.normalize(html);
    expect(result.title).toBe("Scholarship Guide");
    expect(result.sections.length).toBeGreaterThanOrEqual(2);

    const eligibilitySection = result.sections.find((s) =>
      s.title.includes("Eligibility"),
    );
    expect(eligibilitySection).toBeDefined();
    expect(eligibilitySection?.content).toContain("3.5 GPA");

    const deadlineSection = result.sections.find((s) =>
      s.title.includes("Deadline"),
    );
    expect(deadlineSection).toBeDefined();
    expect(deadlineSection?.content).toContain("November 15, 2026");
  });

  it("should be deterministic in contentHash generation", () => {
    const htmlA =
      "<html><body><h1>Title</h1><p>  Some text   with   extra spaces.  </p></body></html>";
    const htmlB =
      "<html><body><h1>Title</h1><p>Some text with extra spaces.</p></body></html>";

    const resultA = normalizer.normalize(htmlA);
    const resultB = normalizer.normalize(htmlB);

    expect(resultA.contentHash).toBe(resultB.contentHash);
  });
  it("preserves selected standalone links and ignores only tracking parameters", () => {
    const result = normalizer.normalize(
      '<a class="document" href="/guide.pdf?id=2&utm_source=ad">Guide</a><p>Outside</p>',
      { includeSelector: ".document", baseUrl: "https://example.com" },
    );
    expect(result.normalizedText).toContain(
      "https://example.com/guide.pdf?id=2",
    );
    expect(result.normalizedText).not.toContain("utm_source");
    expect(result.normalizedText).not.toContain("Outside");
  });

  it("keeps announcements in ordinary div/span containers", () => {
    const result = normalizer.normalize(
      "<div><span>Scholarship</span> <span>deadline November 2</span></div>",
    );
    expect(result.normalizedText).toContain("Scholarship deadline November 2");
  });

  it("distinguishes repeated headings without losing either section", () => {
    const result = normalizer.normalize(
      "<h2>Updates</h2><p>First</p><h2>Updates</h2><p>Second</p>",
    );
    expect(result.sections.map((section) => section.id)).toEqual([
      "updates#1",
      "updates#2",
    ]);
  });

  it("rejects missing selected content so it cannot replace a baseline", () => {
    expect(() =>
      normalizer.normalize("<p>Nothing selected</p>", {
        includeSelector: ".deadline",
      }),
    ).toThrow("Selected content was not found");
  });
});
