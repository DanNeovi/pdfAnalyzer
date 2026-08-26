const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');
const saveFlow = app.slice(app.indexOf('async function saveAllPagesAsPDF()'), app.indexOf('\nfunction showMsg', app.indexOf('async function saveAllPagesAsPDF()')));

assert.match(app, /SERIALIZED_ANNOTATION_PROPS=\['annotationType','selectable','evented','_hlBaseColor','draftAnnotationId'\]/);
assert.match(app, /NativeAnnotationUtils\.replaceDraftNativeAnnotations\(/);
assert.match(app, /EmbeddedAnnotationUtils\.embedNativeStateIntoPdf\(baseDoc,editableAnnotationPackage\)/);
assert.match(app, /NativeAnnotationUtils\.stripDraftNativeAnnotations\(/);
assert.doesNotMatch(saveFlow, /\.drawImage\(|\.drawText\(/, 'save must not flatten annotations into page content');
assert.match(app, /pdfProxy\.getAttachments\(\)/);
assert.match(app, /await hydrateEmbeddedAnnotations\(embeddedState\.payload,nativeDescriptors\)/);
assert.match(app, /await restoreEmbeddedPageAnnotations\(fc,pendingEmbeddedPage\)/);
assert.match(html, /native-annotation-utils\.js\?v=/);

for (const tool of ['draw','text','line','arrow','rect','circle','highlight','cloud']) {
    assert.match(app, new RegExp(`${tool}:'`), `${tool} should remain an annotation tool`);
}
assert.match(app, /annotationType:'insertedImage'/);
assert.doesNotMatch(html, /Export Layer|Import Layer|\.draftanno/);

console.log('editable PDF flow tests passed');
