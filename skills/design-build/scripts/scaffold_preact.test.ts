import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "./scaffold_preact.ts";

describe("scaffold", () => {
  it("writes the expected file tree into target dir", async () => {
    const out = mkdtempSync(join(tmpdir(), "scaf-"));
    try {
      await scaffold({ targetDir: out, appName: "my-demo" });
      expect(existsSync(join(out, "package.json"))).toBe(true);
      expect(existsSync(join(out, "vite.config.ts"))).toBe(true);
      expect(existsSync(join(out, "src/main.tsx"))).toBe(true);
      expect(existsSync(join(out, "src/services/api/ApiClient.ts"))).toBe(true);
      expect(existsSync(join(out, "src/mock/MockApiAdapter.ts"))).toBe(true);
      expect(existsSync(join(out, "styles/global.scss"))).toBe(true);
      expect(existsSync(join(out, "styles/_fonts.scss"))).toBe(true);

      const pkg = JSON.parse(readFileSync(join(out, "package.json"), "utf-8"));
      expect(pkg.name).toBe("my-demo");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("seeds the self-describing root docs and .gitignore", async () => {
    const out = mkdtempSync(join(tmpdir(), "scaf-"));
    try {
      await scaffold({ targetDir: out, appName: "my-demo" });
      expect(existsSync(join(out, "DESIGN.md"))).toBe(true);
      expect(existsSync(join(out, "BUILD.md"))).toBe(true);
      expect(existsSync(join(out, "COMPONENT_INDEX.md"))).toBe(true);
      expect(existsSync(join(out, ".gitignore"))).toBe(true);

      // __APP_NAME__ is interpolated into the doc stubs too.
      expect(readFileSync(join(out, "DESIGN.md"), "utf-8")).toContain("my-demo");
      // PLAN.md is ignored so per-build briefs don't get committed.
      expect(readFileSync(join(out, ".gitignore"), "utf-8")).toContain("PLAN.md");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("does not clobber an existing DESIGN.md / BUILD.md / COMPONENT_INDEX.md", async () => {
    const out = mkdtempSync(join(tmpdir(), "scaf-"));
    try {
      writeFileSync(join(out, "DESIGN.md"), "MY OWN DESIGN");
      await scaffold({ targetDir: out, appName: "my-demo" });
      expect(readFileSync(join(out, "DESIGN.md"), "utf-8")).toBe("MY OWN DESIGN");
      // but the ones that didn't exist are still seeded
      expect(existsSync(join(out, "BUILD.md"))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
