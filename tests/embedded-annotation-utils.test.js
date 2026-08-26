const assert = require('node:assert/strict');
const utils = require('../embedded-annotation-utils.js');

const sourcePdfBytes = new TextEncoder().encode('%PDF-1.7\n% test source');
const payload = {
    format: 'draftannotator.annotations',
    version: 1,
    source: {fileName: 'drawing.pdf', pageCount: 1},
    pages: [{pageNumber: 1, width: 800, height: 1000, fabric: {objects: [{type: 'rect'}]}}]
};
const annotationBytes = new TextEncoder().encode(JSON.stringify(payload));
const attachments = {
    source: {filename: utils.SOURCE_PDF_NAME, content: sourcePdfBytes},
    annotations: {filename: utils.ANNOTATIONS_NAME, content: annotationBytes}
};

const restored = utils.readStateFromAttachments(attachments);
assert.equal(restored.mode, 'legacy');
assert.deepEqual(restored.payload, payload);
assert.deepEqual(restored.sourcePdfBytes, sourcePdfBytes);
assert.notEqual(restored.sourcePdfBytes, sourcePdfBytes, 'source bytes should be copied');
assert.equal(utils.readStateFromAttachments(null), null);
assert.equal(utils.hasPdfHeader(new TextEncoder().encode('\n %PDF-2.0\n')), true);
assert.equal(utils.hasPdfHeader(new TextEncoder().encode('not a pdf')), false);

assert.throws(
    () => utils.readStateFromAttachments({source: attachments.source}),
    /incomplete/
);
assert.throws(
    () => utils.readStateFromAttachments({
        source: {filename: utils.SOURCE_PDF_NAME, content: new TextEncoder().encode('not a pdf')},
        annotations: attachments.annotations
    }),
    /not a PDF/
);
assert.throws(
    () => utils.readStateFromAttachments({
        source: attachments.source,
        annotations: {filename: utils.ANNOTATIONS_NAME, content: new TextEncoder().encode('{bad')}
    }),
    /invalid JSON/
);

(async()=>{
    const calls=[];
    const fakePdfDocument={
        attach:async(...args)=>{calls.push(args);}
    };
    const embeddedSize=await utils.embedStateIntoPdf(fakePdfDocument,sourcePdfBytes,payload);
    assert.equal(calls.length,2);
    assert.equal(calls[0][1],utils.SOURCE_PDF_NAME);
    assert.equal(calls[0][2].mimeType,'application/pdf');
    assert.equal(calls[1][1],utils.ANNOTATIONS_NAME);
    assert.equal(calls[1][2].mimeType,'application/json');
    assert.equal(embeddedSize,calls[1][0].length);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(calls[1][0])),payload);

    const roundTripAttachments={
        source:{filename:calls[0][1],content:calls[0][0]},
        annotations:{filename:calls[1][1],content:calls[1][0]}
    };
    const roundTrip=utils.readStateFromAttachments(roundTripAttachments);
    assert.deepEqual(roundTrip.payload,payload);
    assert.deepEqual(roundTrip.sourcePdfBytes,sourcePdfBytes);

    calls.length=0;
    const nativeSize=await utils.embedNativeStateIntoPdf(fakePdfDocument,payload);
    assert.equal(calls.length,1);
    assert.equal(calls[0][1],utils.NATIVE_ANNOTATIONS_NAME);
    assert.equal(nativeSize,calls[0][0].length);
    const nativeRoundTrip=utils.readStateFromAttachments({
        native:{filename:calls[0][1],content:calls[0][0]}
    });
    assert.equal(nativeRoundTrip.mode,'native');
    assert.equal(nativeRoundTrip.sourcePdfBytes,null);
    assert.deepEqual(nativeRoundTrip.payload,payload);
    console.log('embedded annotation utility tests passed');
})().catch(error=>{
    console.error(error);
    process.exitCode=1;
});
