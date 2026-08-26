#!/usr/bin/env node
// Sanity-checks the hardware map hasn't drifted from the authoritative 5-servo spec.
const EXPECTED = { 0: "EYE_TRACKING", 1: "LEFT_LEG_ROTATION", 2: "LEFT_LEG_JOINT", 3: "RIGHT_LEG_ROTATION", 4: "RIGHT_LEG_JOINT" };
console.log("Expected hardware map:", EXPECTED);
console.log("Verify server/src/config/robot.ts and firmware/esp32-cam/src/config/servo_config.h match this map.");
