import { describe, it, expect } from "vitest";
import express from "express";
import { brainViewStatic } from "../../../src/routes/simulation.routes";

function serve() {
  const app = express(); app.use("/brain-view", brainViewStatic);
  return new Promise<{ url: string; close: () => void }>((r) => { const s = app.listen(0, () => r({ url: `http://127.0.0.1:${(s.address() as any).port}/brain-view`, close: () => s.close() })); });
}

describe("the live brain picture for the dashboard", () => {
  it("is served with the simulator's own brain code, and may be shown inside the dashboard", async () => {
    const s = await serve();
    try {
      const page = await fetch(s.url + "/");
      expect(page.status).toBe(200);
      expect(await page.text()).toContain('id="brainCanvas"');
      expect(page.headers.get("content-security-policy")).toContain("frame-ancestors");
      expect(page.headers.get("x-frame-options")).toBeNull();
      for (const f of ["/main.js", "/lib/limbic.js", "/lib/brainview.js", "/lib/brainpanel.js", "/lib/brainsim/geometry.js", "/css/style.css", "/auth.js"]) {
        expect((await fetch(s.url + f)).status, f).toBe(200);
      }
    } finally { s.close(); }
  });
});
