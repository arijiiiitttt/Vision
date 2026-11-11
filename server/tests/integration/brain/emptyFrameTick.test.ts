import { describe, it, expect } from "vitest";
import { BrainOrchestrator } from "../../../src/brain/BrainOrchestrator";

// The virtual robot (simulation mode) ticks the real brain with an empty picture when it has no camera images.
describe("brain tick without a picture", () => {
  it("runs the whole pipeline many times in a row without failing", async () => {
    const brain = new BrainOrchestrator();
    for (let i = 0; i < 6; i++) {
      const r = await brain.observeAndReact(Buffer.alloc(0), "vision-empty-tick");
      expect(r.perception.personDetected).toBe(false);
      expect(r.decision).toBeTruthy();
    }
  });
});
