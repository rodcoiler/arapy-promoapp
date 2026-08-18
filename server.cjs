// server.cjs - CommonJS entrypoint for PM2
// Since package.json has "type": "module", this .cjs extension forces CJS loading.
// Sets process.argv[2] to build path, then requires remix-serve CLI.
process.env.PORT = process.env.PORT || "3000";
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.argv[2] = "build/server/index.js";

require("./node_modules/@remix-run/serve/dist/cli.js");
