import { describe, it, expect, vi, afterEach } from "vitest";

const observe = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("../../../src/brain/BrainOrchestrator", () => ({ brainOrchestrator: { observeAndReact: observe } }));
vi.mock("../../../src/camera/CameraService", () => ({ cameraService: { capture: vi.fn(async () => ({})) } }));
vi.mock("../../../src/robot/heartbeat", () => ({ ingestHeartbeat: vi.fn() }));

import { SimulatedRobot } from "../../../src/robot/SimulatedRobot";

afterEach(() => { vi.useRealTimers(); });

describe("virtual robot with no pictures to send", () => {
  it("still gives the brain a regular tick, so gestures, idle fidgets and wandering keep happening", async () => {
    vi.useFakeTimers();
    const sim = new SimulatedRobot(); sim.start("vision-001");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(observe.mock.calls.length).toBeGreaterThan(1);
    expect(observe.mock.calls[0][0]).toHaveLength(0);       // an empty picture = "nothing new in view"
    expect(observe.mock.calls[0][1]).toBe("vision-001");
    sim.stop();
  });
});
