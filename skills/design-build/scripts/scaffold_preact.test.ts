import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
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
});
