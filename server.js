// server.js - Production entrypoint for PM2
// Invoke remix-serve exactly as the CLI does: sets argv[2] to build path, then runs.
process.env.PORT = process.env.PORT || "3000";
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.argv[2] = "build/server/index.js";

// Load the remix-serve CLI (CommonJS module) which calls run() automatically
require("./node_modules/@remix-run/serve/dist/cli.js");
