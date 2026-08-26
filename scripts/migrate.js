#!/usr/bin/env node
const { execSync } = require("node:child_process");
execSync("npm run db:migrate --prefix server", { stdio: "inherit" });
