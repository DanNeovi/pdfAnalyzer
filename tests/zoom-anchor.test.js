const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
function section(start, end) { return app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start))); }

function viewer(initialZoom, pageNumber, scrollTop) {
    let c, top = scrollTop, left = 0;
    const pages = [1, 2, 3].map(n => ({
        dataset: {pageNum: String(n)}, style: {width: `${800 * initialZoom}px`, height: `${1000 * initialZoom}px`},
        closest: () => pages[n - 1],
        querySelector: () => ({style: {}}),
        getBoundingClientRect() {
            const width = parseFloat(this.style.width), height = parseFloat(this.style.height);
            const x = 600 - width / 2 + c.panOffsetX - left;
            const y = 120 + pages.slice(0, n - 1).reduce((sum, page) => sum + parseFloat(page.style.height) + 24, 0) + c.panOffsetY - top;
            return {left: x, top: y, width, height, right: x + width, bottom: y + height};
        }
    }));
    const scroll = {
        get scrollTop() { return top; },
        set scrollTop(value) { top = Math.max(0, Math.min(this.scrollHeight - 800, value)); },
        get scrollLeft() { return left; },
        set scrollLeft(value) { left = Math.max(0, Math.min(this.scrollWidth - 1000, value)); },
        get scrollHeight() { return 120 + pages.reduce((sum, p) => sum + parseFloat(p.style.height) + 24, 0) + Math.max(0, c.panOffsetY); },
        get scrollWidth() { return Math.max(1000, 600 + parseFloat(pages[0].style.width) / 2 + c.panOffsetX); },
        clientWidth: 1000, clientHeight: 800
    };
    const canvases = new Map(pages.map((p, i) => [i + 1, {
        _renderFitScale: 1, setViewportTransform(v) { this.viewportTransform = v; }, calcOffset() {}, requestRenderAll() {}
    }]));
    c = vm.createContext({
        zoomFactor: initialZoom, baseScale: initialZoom, scale: initialZoom,
        panOffsetX: 0, panOffsetY: 0, lastZoomPointer: null,
        currentVisiblePage: pageNumber, numPages: 3, queuedZoomFactor: null, pendingResizeFocus: null,
        window: {innerWidth: 1000, innerHeight: 800},
        pdfViewer: {style: {}, getBoundingClientRect: () => ({left: 200, width: 800})},
        document: {
            querySelector: selector => selector === 'header' ? {getBoundingClientRect: () => ({bottom: 100})} : pages[Number(selector.match(/"(\d+)"/)[1]) - 1],
            elementFromPoint: (x, y) => pages.find(page => {
                const r = page.getBoundingClientRect();
                return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            })
        },
        getScrollContainer: () => scroll, clampNumber: (n, min, max) => Math.max(min, Math.min(max, n)),
        clampZoom: n => n, updateZoomDisplay() {}, getTargetPageWidth: () => 1,
        captureEditingTextStates: () => [], restoreEditingTextStates() {},
        pdfDoc: {getPage: async () => ({getViewport: () => ({width: 800, height: 1000})})},
        pageViewportCache: new Map(pages.map((_, i) => [i + 1, {width: 800, height: 1000}])),
        fabricCanvases: canvases, setFabricCanvasDimensions() {}, refreshCanvasTextRendering() {},
        scaleExistingPdfTextLayer() {}, updateVisiblePage() {}, requestAnimationFrame: fn => fn(),
        isContainerNearViewport: () => false
    });
    vm.runInContext(section('function captureZoomAnchor(', "document.addEventListener('pointermove'") +
        section('async function applyZoom(', 'let _zoomRetries=0;'), c);
    return {c, pages, scroll};
}

for (const scenario of [
    {name: 'top-left sheet point, requiring pan at the left scroll boundary', from: 1, to: 3, page: 1, scroll: 0, x: 250, y: 180},
    {name: 'right sheet edge', from: 1, to: 2, page: 1, scroll: 0, x: 950, y: 300},
    {name: 'later page with preceding pages changing height', from: 1, to: 3, page: 2, scroll: 1100, x: 700, y: 400},
    {name: 'zooming back out on a later page', from: 3, to: 0.5, page: 2, scroll: 3300, x: 500, y: 400}
]) {
    test(`zoom preserves the mouse point: ${scenario.name}`, async () => {
        const {c, pages} = viewer(scenario.from, scenario.page, scenario.scroll);
        const anchor = c.captureZoomAnchor({clientX: scenario.x, clientY: scenario.y});
        assert.equal(anchor.pageNum, scenario.page);
        await c.applyZoom(scenario.to, anchor);
        const rect = pages[scenario.page - 1].getBoundingClientRect();
        assert.ok(Math.abs(rect.left + anchor.x * rect.width - scenario.x) < 0.001);
        assert.ok(Math.abs(rect.top + anchor.y * rect.height - scenario.y) < 0.001);
    });
}

test('toolbar/keyboard zoom uses the last pointer over the sheet and otherwise the visible page center', () => {
    const {c} = viewer(1, 1, 0);
    c.lastZoomPointer = {clientX: 700, clientY: 300};
    assert.equal(c.captureZoomAnchor().clientX, 700);
    c.lastZoomPointer = null;
    const anchor = c.captureZoomAnchor();
    assert.equal(anchor.clientX, 600);
    assert.equal(anchor.clientY, 460);
});

test('wheel zoom passes actual pointer coordinates into the zoom queue', () => {
    let listener, prevented = false, received;
    const c = vm.createContext({
        document: {addEventListener: (name, fn) => { listener = fn; }},
        ZOOM_STEP: 0.15, getPendingZoomBase: () => 1,
        queueZoom: (factor, pointer) => { received = {factor, ...pointer}; }
    });
    vm.runInContext(section("document.addEventListener('wheel'", '// ─── INIT'), c);
    listener({ctrlKey: true, deltaY: -1, clientX: 456, clientY: 321, preventDefault() { prevented = true; }});
    assert.equal(prevented, true);
    assert.deepEqual(received, {factor: 1.15, clientX: 456, clientY: 321});
});
