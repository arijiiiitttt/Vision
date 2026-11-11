import { apiClient } from "./client";
export const robotsApi = {
  health: () => apiClient.get("/system/health"),
  capabilities: () => apiClient.get("/system/capabilities"),
  /** Mode, transport, heartbeat age and body state — see server/src/robot/linkStatus.ts */
  link: () => apiClient.get("/system/robot-link"),
  /** What the server itself thinks of you: { role, email, build }. 404 = the server is an older version. */
  whoami: () => apiClient.get("/system/whoami"),
  /** Switch between the virtual robot and the real one (admin). Going to "hardware" must say confirmHardware: true. */
  mind: () => apiClient.get("/system/mind"),
  /** Live view of the real robot: mind (mood, hormones, drives, events) and its newest camera reading. The picture itself is GET /system/mind/frame. */
  live: () => apiClient.get("/system/mind/live"),
  setMindEngine: (engine) => apiClient.post("/system/mind-engine", { engine }),
  setMode: (mode, confirmHardware = false) => apiClient.post("/system/robot-mode", { mode, confirmHardware }),
};
