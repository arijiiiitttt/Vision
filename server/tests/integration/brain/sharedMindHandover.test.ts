import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import sharp from "sharp";
import { BrainOrchestrator } from "../../../src/brain/BrainOrchestrator";
import { resetMotionDetectorFor } from "../../../src/perception/motionDetection";
import { resetPresenceTrackingFor } from "../../../src/ultrasonic/PresenceDetector";
import { resetLowLightState } from "../../../src/perception/LowLightAssistance";
import { ultrasonicService } from "../../../src/ultrasonic/UltrasonicService";
import { sharedMind, mindEngine } from "../../../src/mind";

const ROBOT_ID = "vision-handover-test";
const darkJpeg = () => sharp({ create: { width: 320, height: 240, channels: 3, background: { r: 6, g: 6, b: 6 } } }).jpeg().toBuffer();

// The same real camera cycle as the low-light test, but with the shared brain (the simulator's) switched on.
describe("camera pipeline hands over to the shared brain", () => {
  beforeEach(() => {
    resetMotionDetectorFor(ROBOT_ID); resetPresenceTrackingFor(ROBOT_ID); resetLowLightState(); vi.restoreAllMocks();
    for (let i = 0; i < 5; i++) ultrasonicService.ingest(400);   // someone standing close, in the dark
  });
  afterEach(() => mindEngine.set("classic"));

  it("feeds the brain what the camera and sensors saw, and still speaks the low-light prompt", async () => {
    mindEngine.set("shared");
    vi.spyOn(sharedMind, "running", "get").mockReturnValue(true);
    const observe = vi.spyOn(sharedMind, "observe").mockImplementation(() => {});
    const result = await new BrainOrchestrator().observeAndReact(await darkJpeg(), ROBOT_ID);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe.mock.calls[0][0]).toMatchObject({ frameWidth: 320, personDetected: false });
    expect(observe.mock.calls[0][0].ultrasonicMm).toBeLessThan(600);
    expect(result.perception.lowLightPrompt).toMatch(/light|curtain/i);          // nothing old is switched off
    expect(result.commandResults.some((c) => c.type === "AUDIO_SPEAK")).toBe(true);
  });

  it("keeps the classic behaviour when the classic brain is chosen", async () => {
    mindEngine.set("classic");
    const observe = vi.spyOn(sharedMind, "observe");
    const result = await new BrainOrchestrator().observeAndReact(await darkJpeg(), ROBOT_ID);
    expect(observe).not.toHaveBeenCalled();
    expect(result.perception.lowLightPrompt).toMatch(/light|curtain/i);
  });

  it("falls back to the classic brain if the shared one cannot start", async () => {
    mindEngine.set("shared");
    vi.spyOn(sharedMind, "start").mockRejectedValue(new Error("brain files missing"));
    vi.spyOn(sharedMind, "running", "get").mockReturnValue(false);
    const result = await new BrainOrchestrator().observeAndReact(await darkJpeg(), ROBOT_ID);
    expect(result.perception.lowLightPrompt).toMatch(/light|curtain/i);          // nobody is left without a brain
  });
});
