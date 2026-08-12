const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('annotation canvases use bounding-box targeting so selected objects can be dragged', () => {
    assert.match(app, /fc\.targetFindTolerance\s*=\s*15\s*;/);
    assert.match(app, /fc\.perPixelTargetFind\s*=\s*false\s*;/);
    assert.doesNotMatch(app, /fc\.perPixelTargetFind\s*=\s*true\s*;/);
});
