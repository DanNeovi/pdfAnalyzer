const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

assert.match(html, /fabric@7\.4\.0\/dist\/index\.min\.js/);
assert.match(html, /fabric@7\.4\.0[^>]+integrity="sha512-[^"]+"/);
assert.match(html, /pdf\.js\/3\.11\.174\/pdf\.min\.js[^>]+integrity="sha512-[^"]+"/);
assert.match(html, /Content-Security-Policy/);
assert.match(app, /isEvalSupported:false/);
assert.match(app, /pdf\.worker\.min\.js/);
assert.match(html, /editor-utils\.js\?v=[^"']+/);
assert.match(html, /material-analyzer\.js\?v=[^"']+/);
assert.match(html, /app\.js\?v=[^"']+/);

console.log('dependency configuration tests passed');
