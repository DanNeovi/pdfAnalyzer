const assert = require('node:assert/strict');
const utils = require('../editor-utils.js');

assert.equal(utils.isWinAnsiCompatibleText('ASCII and café — €'), true);
assert.equal(utils.isWinAnsiCompatibleText('Greek Ω'), false);
assert.equal(utils.isWinAnsiCompatibleText('Emoji 😀'), false);
assert.equal(utils.isWinAnsiCompatibleText('中文'), false);

assert.deepEqual(utils.getContainTransform(100, 100, 200, 300), {
    scale: 2,
    offsetX: 0,
    offsetY: 50,
});
assert.deepEqual(utils.getContainTransform(200, 100, 100, 100), {
    scale: 0.5,
    offsetX: 0,
    offsetY: 25,
});

const rect = {x: 10, y: 20, width: 30, height: 40};
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 0), rect);
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 90), {x: 20, y: 60, width: 40, height: 30});
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 180), {x: 60, y: 140, width: 30, height: 40});
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 270), {x: 140, y: 10, width: 40, height: 30});

console.log('editor-utils tests passed');
