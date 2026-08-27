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

assert.deepEqual(utils.getContainedImagePlacement(2000, 1000, 1000, 800, 990, 10), {
    scale: 0.4,
    width: 800,
    height: 400,
    x: 600,
    y: 200,
});
assert.deepEqual(utils.getContainedImagePlacement(200, 100, 1000, 800, undefined, undefined), {
    scale: 1,
    width: 200,
    height: 100,
    x: 500,
    y: 400,
});

assert.deepEqual(
    utils.getBoundsTranslationInsideContainer({x: 920,y:-30,width:100,height:80},1000,800,8),
    {dx:-28,dy:38}
);
assert.deepEqual(
    utils.getBoundsTranslationInsideContainer({x:-100,y:20,width:1200,height:100},1000,800,8),
    {dx:0,dy:0}
);

assert.deepEqual(
    utils.getClipboardObjectPlacement(
        {left:100,top:200,scaleX:2,scaleY:1.5},1000,1000,500,800,15
    ),
    {left:65,top:265,scaleX:1,scaleY:0.75}
);

assert.deepEqual(utils.getPageTextReplacementPlacement({
    layerWidth:1800,
    layerHeight:2400,
    sceneWidth:900,
    sceneHeight:1200,
    offsetLeft:200,
    offsetTop:300,
    offsetWidth:400,
    transformScaleX:1.2,
    fontSize:24,
    angle:90
}), {
    left:100,
    top:150,
    width:240,
    fontSize:12,
    angle:90
});

const screenshotBlob={type:'image/png',size:1234};
assert.equal(utils.getClipboardImageBlob({
    items:[{kind:'file',type:'image/png',getAsFile:()=>screenshotBlob}],
    files:[],
}),screenshotBlob);
assert.equal(utils.getClipboardImageBlob({
    items:[{kind:'string',type:'text/plain',getAsFile:()=>null}],
    files:[],
}),null);

const rect = {x: 10, y: 20, width: 30, height: 40};
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 0), rect);
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 90), {x: 20, y: 60, width: 40, height: 30});
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 180), {x: 60, y: 140, width: 30, height: 40});
assert.deepEqual(utils.rotatePixelRect(rect, 100, 200, 270), {x: 140, y: 10, width: 40, height: 30});

console.log('editor-utils tests passed');
