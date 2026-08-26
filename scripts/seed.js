#!/usr/bin/env node
// Runs the server's db:seed script with cwd=server so seed.ts's transitive
// imports (database/client.ts -> drizzle-orm, pg) resolve against
// server/node_modules, same as any other server-side script.
const { execSync } = require("node:child_process");
execSync("npm run db:seed --prefix server", { stdio: "inherit" });
