#!/usr/bin/env node
const { execSync } = require("node:child_process");
execSync("npm test --prefix server", { stdio: "inherit" });
