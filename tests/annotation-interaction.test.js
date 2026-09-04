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
    assert.match(app, /obj\.set\(\{selectable:canEdit,evented:canEdit,perPixelTargetFind:false\}\);\s*\/\/[\s\S]*?if\(canEdit&&typeof obj\.setCoords==='function'\)obj\.setCoords\(\);/,
        'Tool 1 must refresh every editable object hit area, including restored objects');
});

test('completed rectangles and ellipses rebuild zero-size previews for immediate hit testing', () => {
    const finalizeStart = app.indexOf('function handleShapeEnd()');
    const finalizeEnd = app.indexOf('function handleTextPlacement', finalizeStart);
    const finalize = app.slice(finalizeStart, finalizeEnd);
    assert.match(finalize, /case 'rect':\{[\s\S]*?new fabric\.Rect\(\{[\s\S]*?perPixelTargetFind:false[\s\S]*?shapeCanvas\.remove\(tempShape\);[\s\S]*?finishedRect\.setCoords\(\);[\s\S]*?shapeCanvas\.add\(finishedRect\);/);
    assert.match(finalize, /case 'circle':\{[\s\S]*?new fabric\.Ellipse\(\{[\s\S]*?perPixelTargetFind:false[\s\S]*?shapeCanvas\.remove\(tempShape\);[\s\S]*?finishedEllipse\.setCoords\(\);[\s\S]*?shapeCanvas\.add\(finishedEllipse\);/);
    assert.match(app, /finishedHL\.dirty=true;\s*finishedHL\.setCoords\(\)/,
        'highlight boxes and ellipses need the same post-drag coordinate refresh');
});

test('existing PDF text uses a separate reversible editing mode', () => {
    assert.match(app, /function handlePageTextPlacement\(canvas,eventInfo\)/);
    assert.match(app, /activeTool!=='pageText'/);
    assert.match(app, /new fabric\.Textbox\(originalText/);
    assert.match(app, /pageTextOriginal:originalText/);
    assert.match(app, /tool==='select'\|\|\(tool==='pageText'&&isPageTextReplacement\(obj\)\)/,
        'Tool 1 edits everything while the PDF-text tool isolates replacement text');
    assert.match(app, /delete this box to restore the original/);
});

test('paste and duplicate create new native annotation identities', () => {
    const prepareStart = app.indexOf('function prepareClipboardObject(obj)');
    const prepareEnd = app.indexOf('\nfunction keepObjectsInsideCanvas', prepareStart);
    const prepare = app.slice(prepareStart, prepareEnd);
    assert.match(prepare, /delete obj\.draftAnnotationId;\s*ensureDraftAnnotationId\(obj\)/);
    assert.match(prepare, /if\(isPageTextReplacement\(obj\)\)delete obj\.pageTextSourceId/);
});

test('highlight compositing includes the live canvas backing-store scale', () => {
    assert.match(app, /function getLiveCanvasRenderTransform\(canvas\)/);
    assert.match(app, /backingWidth\/logicalWidth/);
    assert.match(app, /transform:getLiveCanvasRenderTransform\(fc\)/);
});

test('interactive top-canvas renders cannot repaint and darken highlights', () => {
    assert.match(app, /fc\.on\('after:render',event=>\{/);
    assert.match(app, /if\(event&&event\.ctx&&event\.ctx!==fc\.contextContainer\)return;/);
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
