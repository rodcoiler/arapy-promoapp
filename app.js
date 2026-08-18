// app.js
process.env.PORT = process.env.PORT || 3000;
process.argv = [process.argv[0], process.argv[1], 'build/server/index.js'];
import('./node_modules/@remix-run/serve/dist/cli.js');
