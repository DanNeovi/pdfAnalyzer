const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const context = vm.createContext({
    pdfViewer: {clientWidth: 1000},
    window: {innerWidth: 1280},
    document: {getElementById: () => null},
    PAGE_SCALE_ADJUST: 0.98
});
const fitStart = app.indexOf('function getTargetPageWidth(');
vm.runInContext(app.slice(fitStart, app.indexOf('\nfunction updateVisiblePage(', fitStart)), context);
const zoomStart = app.indexOf('const zoomLevelEl=');
vm.runInContext(app.slice(zoomStart, app.indexOf('\nfunction getScrollContainer(', zoomStart)), context);

// Fit must be independent of the sheet's physical size, including sheets
// that previously remained wider than the screen at the lowest zoom setting.
for (const pageWidth of [612, 2592, 14400, 75000]) {
    const scale = context.getTargetPageWidth(pageWidth);
    assert.ok(scale > 0);
    assert.ok(Math.abs(pageWidth * scale - 988 * 0.98) < 1e-8);
}

// A narrow viewport must not inherit the old 320px minimum width.
context.pdfViewer.clientWidth = 280;
assert.ok(context.getTargetPageWidth(14400) * 14400 < 280);

// A hidden viewer uses the fallback; tiny measured widths remain positive.
context.pdfViewer.clientWidth = 0;
assert.ok(Math.abs(context.getTargetPageWidth(14400) * 14400 - 988 * 0.98) < 1e-8);
context.pdfViewer.clientWidth = 5;
assert.ok(context.getTargetPageWidth(14400) > 0);

assert.equal(context.clampZoom(0.1), 0.1);
assert.equal(context.clampZoom(0), 0.05);
assert.equal(context.clampZoom(-1), 0.05);
assert.equal(context.clampZoom(1), 1);
assert.equal(context.clampZoom(10), 3);
console.log('Zoom tests passed');
