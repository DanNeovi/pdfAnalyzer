const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
function section(start, end) { return app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start))); }
const budgetCode = section('const MAX_CANVAS_PIXELS=', '\nfunction loadFabricCanvasFromJson(');

test('live bitmap budgets handle high DPI, large sheets and extreme aspect ratios', () => {
    const c = vm.createContext({window: {devicePixelRatio: 3}});
    vm.runInContext(budgetCode, c);
    assert.equal(c.getCanvasPixelRatio(600, 800), 3);
    for (const [w, h] of [[6000, 9000], [75000, 1000], [1000, 75000]]) {
        const r = c.getCanvasPixelRatio(w, h);
        assert.ok(r > 0);
        assert.ok(w * h * r * r <= 8 * 1024 * 1024 + 1e-6);
        assert.ok(Math.max(w, h) * r <= 8192);
    }
    // Fabric 7 ignores sub-1 retina ratios in its DOM manager. The adapter
    // must supply physical sizes and transform BOTH annotation contexts.
    const transforms = [];
    const canvas = {
        enableRetinaScaling: true,
        elements: {
            lower: {ctx: {scale: (...args) => transforms.push(args)}},
            upper: {ctx: {scale: (...args) => transforms.push(args)}},
            setDimensions(size, ratio) { this.bitmap = {width: size.width * ratio, height: size.height * ratio}; }
        },
        setDimensions(size) { this.elements.setDimensions(size, this.getRetinaScaling()); this.width = size.width; this.height = size.height; }
    };
    c.configureCanvasPixelBudget(canvas);
    c.setFabricCanvasDimensions(canvas, 6000, 9000);
    assert.equal(canvas.width, 6000);
    assert.equal(canvas.height, 9000);
    assert.ok(canvas.elements.bitmap.width * canvas.elements.bitmap.height <= 8 * 1024 * 1024);
    assert.deepEqual(transforms, Array(2).fill([canvas.getRetinaScaling(), canvas.getRetinaScaling()]));
    c.setFabricCanvasDimensions(canvas, 600, 800);
    assert.equal(canvas.getRetinaScaling(), 3);
});

function refreshHarness() {
    let finish;
    const old = {width: 100, height: 200, style: {}, replaceWith(next) { container.current = next; next.parentElement = container; }};
    const container = {style: {}, dataset: {}, current: old, querySelector(selector) { return selector === '.pdf-viewer-canvas' ? this.current : {}; }};
    const c = vm.createContext({
        window: {devicePixelRatio: 3}, zoomFactor: 3, scale: 3, queuedZoomFactor: null,
        pdfDoc: {getPage: async () => ({getViewport: ({scale}) => ({width: 2000 * scale, height: 3000 * scale})})},
        document: {createElement: () => ({style: {}, parentElement: null})},
        pendingPdfRefreshPages: new Set(), getZoomKey: String,
        renderPdfCanvasLayer: async (n, page, canvas) => { c.staging = canvas; return new Promise(resolve => { finish = resolve; }); },
        scaleExistingPdfTextLayer() {}, renderPdfTextLayer() { throw Error('Existing text layer should be reused'); }
    });
    vm.runInContext(budgetCode + section('async function ensurePagePdfLayerAtCurrentZoom(', '\nfunction getCachedPageTextContent('), c);
    return {c, old, container, finish: value => finish(value)};
}

test('zoom keeps the old page visible until a bounded replacement finishes', async () => {
    const h = refreshHarness();
    const pending = h.c.ensurePagePdfLayerAtCurrentZoom(1, h.container);
    await new Promise(setImmediate);
    assert.equal(h.container.current, h.old);
    assert.equal(h.old.width, 100);
    assert.ok(h.c.staging.width * h.c.staging.height <= 8 * 1024 * 1024);
    h.finish(true);
    assert.equal(await pending, true);
    assert.equal(h.container.current, h.c.staging);
    assert.equal(h.old.width, 0);
    assert.equal(h.container.dataset.pdfZoom, '3');
});

test('cancelled, obsolete and failed redraws preserve the last visible page', async () => {
    for (const mode of ['cancelled', 'newZoom', 'resized', 'newDocument', 'failed']) {
        const h = refreshHarness();
        if (mode === 'failed') h.c.renderPdfCanvasLayer = async () => { throw Error('Render failed'); };
        const pending = h.c.ensurePagePdfLayerAtCurrentZoom(1, h.container);
        if (mode === 'failed') await assert.rejects(pending, /Render failed/);
        else {
            await new Promise(setImmediate);
            if (mode === 'newZoom') h.c.queuedZoomFactor = 2;
            if (mode === 'resized') h.c.scale = 2;
            if (mode === 'newDocument') h.c.pdfDoc = {};
            h.finish(mode !== 'cancelled');
            assert.equal(await pending, false);
            assert.equal(h.c.staging.width, 0);
        }
        assert.equal(h.container.current, h.old);
        assert.equal(h.old.width, 100);
        assert.equal(h.c.pendingPdfRefreshPages.size, 0);
        assert.equal(h.container.dataset.pdfZoom, undefined);
    }
});

test('rapid zoom requests coalesce and repeated requests at the limit do not cancel work', async () => {
    const timers = [], applied = [], cancelled = [];
    const c = vm.createContext({
        zoomFactor: 1, queuedZoomFactor: null, zoomWorkerActive: false,
        pendingPdfRefreshPages: new Set([1]), cancelPageRenderTask: n => cancelled.push(n),
        clampZoom: n => Math.max(0.05, Math.min(3, n)),
        setTimeout: resolve => timers.push(resolve),
        applyZoom: async n => { applied.push(n); c.zoomFactor = n; },
        isRenderCancelledError: () => false, console
    });
    vm.runInContext(section('function getPendingZoomBase(', '\nasync function applyZoom(') +
        section('let _zoomRetries=0;', '\nfunction zoomIn('), c);
    const work = c.queueZoom(1.15);
    await c.queueZoom(2);
    await c.queueZoom(3);
    const count = cancelled.length;
    await c.queueZoom(3);
    assert.equal(cancelled.length, count);
    timers.shift()();
    await work;
    assert.deepEqual(applied, [3]);
    assert.equal(c.zoomWorkerActive, false);
});
