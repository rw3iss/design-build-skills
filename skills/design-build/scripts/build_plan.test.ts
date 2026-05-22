import { describe, it, expect } from "vitest";
import { composePlan } from "./build_plan.ts";

describe("composePlan — exact mode (default)", () => {
  it("produces a plan with brief, build rules, and image references", () => {
    const md = composePlan({
      request: "login-glass",
      originalBrief: "a glassy login form",
      buildRules: "# Build rules\n- TypeScript + Preact",
      extraPrompt: "buttons should be rounder",
      imagePaths: ["/a/designs/login-glass/images/02.png", "/a/designs/login-glass/images/04.png"],
      mode: "exact",
    });
    expect(md).toContain("# Build prompt for login-glass");
    expect(md).toContain("a glassy login form");
    expect(md).toContain("buttons should be rounder");
    expect(md).toContain("02.png");
    expect(md).toContain("# Build rules");
  });

  it("works with no BUILD.md and no extra prompt", () => {
    const md = composePlan({
      request: "x",
      originalBrief: "y",
      buildRules: null,
      extraPrompt: null,
      imagePaths: [],
      mode: "exact",
    });
    expect(md).toContain("# Build prompt for x");
    expect(md).not.toContain("# Build rules");
  });

  it("includes the layout analysis protocol in exact mode", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "exact",
    });
    expect(md).toContain("Layout analysis");
    expect(md).toContain("Content slots");
    expect(md).toContain("Visual treatment");
    expect(md).toContain("One zone = one component file");
    expect(md).toContain("Lock proportions");
  });

  it("includes the exact execution directive in exact mode", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "exact",
    });
    expect(md).toContain("REPLICATE THE DESIGN, ZONE BY ZONE");
    expect(md).not.toContain("INSPIRED BY THE DESIGN");
  });

  it("includes the Typography mining protocol", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "exact",
    });
    expect(md).toContain("Typography mining");
    expect(md).toContain("_fonts.scss");
    expect(md).toMatch(/Google Fonts/);
    expect(md).toMatch(/@import url/);
  });

  it("labels mode in header", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "exact",
    });
    expect(md).toContain("Build mode: exact");
  });
});

describe("composePlan — creative mode", () => {
  it("includes creative analysis sections instead of exact layout protocol", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "creative",
    });
    expect(md).toContain("Design inspiration analysis");
    expect(md).toContain("Color story");
    expect(md).toContain("Typographic personality");
    expect(md).toContain("Signature design moves");
    expect(md).not.toContain("Lock proportions");
    expect(md).not.toContain("One zone = one component file");
  });

  it("includes the creative execution directive", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "creative",
    });
    expect(md).toContain("INSPIRED BY THE DESIGN, NOT BOUND BY IT");
    expect(md).not.toContain("REPLICATE THE DESIGN, ZONE BY ZONE");
  });

  it("still includes typography mining in creative mode", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "creative",
    });
    expect(md).toContain("Typography mining");
    expect(md).toContain("_fonts.scss");
  });

  it("labels mode in header", () => {
    const md = composePlan({
      request: "x", originalBrief: "y",
      buildRules: null, extraPrompt: null, imagePaths: [], mode: "creative",
    });
    expect(md).toContain("Build mode: creative");
  });
});
