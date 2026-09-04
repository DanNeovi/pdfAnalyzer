const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');
const toolbarTools = Array.from(html.matchAll(/<button[^>]+data-tool="([^"]+)"/g), match => match[1]);
const expectedTools = ['select', 'draw', 'text', 'pageText', 'line', 'arrow', 'rect', 'circle', 'highlight', 'cloud'];

test('every visible editor tool is registered and shortcut-addressable', () => {
    assert.deepEqual(toolbarTools, expectedTools);
    for (const tool of expectedTools) {
        assert.match(app, new RegExp(`${tool}:'`), `${tool} must be registered in TOOL_NAMES`);
        assert.match(app, new RegExp(`id:'${tool}'`), `${tool} must have a configurable shortcut`);
    }
});

test('every creation path produces a saved editable object', () => {
    const requiredCreationSignals = [
        /fc\.on\('path:created'/,                 // pencil and highlight pen
        /new fabric\.IText\('',\{/,              // text and arrow note
        /new fabric\.Textbox\(originalText/,      // existing PDF text replacement
        /new fabric\.Line\(\[x1,y1,x2,y2\]/,     // finalized line
        /createArrowGroup\(x1,y1,x2,y2/,          // arrow and double arrow
        /finishedRect\.setCoords\(\)/,
        /finishedEllipse\.setCoords\(\)/,
        /createRevisionCloud\(l,t,w,h\)/,
        /finishedHL\.setCoords\(\)/,              // box and ellipse highlights
        /annotationType:'insertedImage'/
    ];
    requiredCreationSignals.forEach(pattern => assert.match(app, pattern));
    assert.match(app, /saveCanvasState\(shapeCanvas\)/);
    assert.match(app, /saveCanvasState\(fc\)/);
    assert.match(app, /saveCanvasState\(canvas\)/);
});

test('Tool 1 is the common edit mode and PDF-text mode is isolated', () => {
    assert.match(app, /tool==='select'\|\|\(tool==='pageText'&&isPageTextReplacement\(obj\)\)/);
    assert.match(app, /c\.selection=isSelect/);
    assert.match(app, /applyObjectInteractivity\(o,t\)/);
    assert.match(app, /fc\.perPixelTargetFind=false/);
});
