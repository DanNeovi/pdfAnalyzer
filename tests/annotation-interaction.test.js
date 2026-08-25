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

test('highlight compositing includes the live canvas backing-store scale', () => {
    assert.match(app, /function getLiveCanvasRenderTransform\(canvas\)/);
    assert.match(app, /backingWidth\/logicalWidth/);
    assert.match(app, /transform:getLiveCanvasRenderTransform\(fc\)/);
});

test('completed lines are rebuilt from their final endpoints before export', () => {
    assert.match(app, /const finishedLine=new fabric\.Line\(\[x1,y1,x2,y2\]/);
    assert.match(app, /finishedLine\.setCoords\(\)/);
});

test('weight number input commits on change instead of rewriting partial input', () => {
    assert.match(app, /sizeNumber\.addEventListener\('change',commitSizeNumberInput\)/);
    assert.doesNotMatch(app, /sizeNumber\.addEventListener\('input',\(\)=>handleSizeChange/);
    assert.match(app, /document\.activeElement!==sizeNumber/);
});

test('scroll work does not grow with every rendered canvas', () => {
    assert.doesNotMatch(app, /window\.addEventListener\('scroll',[\s\S]{0,300}fabricCanvases\.forEach\(fc=>fc\.calcOffset\(\)\)/);
    assert.match(app, /function releaseDistantPristinePages\(\)/);
    assert.match(app, /if\(canvas\._historySeeded\|\|canvas\.getObjects\(\)\.length\|\|canvas\.getActiveObject\(\)\)continue/);
});

test('initial and background rendering prioritize the visible PDF page', () => {
    assert.match(app, /const eager=Math\.min\(1,numPages\)/);
    assert.match(app, /function isForegroundRenderingBusy\(\)/);
    assert.match(app, /await waitForForegroundRendering\(runId,documentToAnalyze\)/);
    assert.match(app, /scheduleSpecialStudAnalysis\(pdfDoc\)/);
    assert.doesNotMatch(app, /buildAllTextLayersForSearch/);
});

test('unrendered pages use one lightweight native-find proxy each', () => {
    assert.match(app, /function attachSearchTextProxy\(pageNum,text\)/);
    assert.match(app, /proxy\.className='pdf-search-text-proxy'/);
    assert.match(app, /void renderPdfTextLayer\(pg,textViewport,cont,dw,dh\)/);
});
