const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');
const saveFlow = app.slice(app.indexOf('async function saveAllPagesAsPDF()'), app.indexOf('\nfunction showMsg', app.indexOf('async function saveAllPagesAsPDF()')));

assert.match(app, /SERIALIZED_ANNOTATION_PROPS=\['annotationType','selectable','evented','_hlBaseColor','draftAnnotationId','pageTextSourceId','pageTextOriginal'\]/);
assert.match(app, /function getCanvasJsonWithAnnotationMetadata\(canvas\)/);
assert.match(app, /EmbeddedAnnotationUtils\.copyObjectMetadata\(/);
assert.match(app, /repairMissingObjectMetadata\(payload\)/);
assert.match(app, /NativeAnnotationUtils\.replaceDraftNativeAnnotations\(/);
assert.match(app, /id:ensureUniqueDraftAnnotationId\(object,usedAnnotationIds\)/,
    'save must repair duplicate IDs before writing native annotations and embedded state');
assert.match(app, /EmbeddedAnnotationUtils\.embedNativeStateIntoPdf\(baseDoc,editableAnnotationPackage\)/);
assert.match(app, /NativeAnnotationUtils\.stripDraftNativeAnnotations\(/);
assert.doesNotMatch(saveFlow, /\.drawImage\(|\.drawText\(/, 'save must not flatten annotations into page content');
assert.match(app, /pdfProxy\.getAttachments\(\)/);
assert.match(app, /await hydrateEmbeddedAnnotations\(embeddedState\.payload,nativeDescriptors\)/);
assert.match(app, /await restoreEmbeddedPageAnnotations\(fc,pendingEmbeddedPage\)/);
assert.match(html, /native-annotation-utils\.js\?v=/);

for (const tool of ['draw','text','pageText','line','arrow','rect','circle','highlight','cloud']) {
    assert.match(app, new RegExp(`${tool}:'`), `${tool} should remain an annotation tool`);
}
assert.match(app, /annotationType:'insertedImage'/);
assert.match(app, /annotationType:'pageTextReplacement'/);
assert.match(app, /backgroundColor:'#ffffff'/);
assert.match(app, /isPageTextReplacement\(object\)[\s\S]{0,120}parseCssColor\(object\.backgroundColor/,
    'replacement text background must be retained in the standard FreeText annotation');
assert.match(html, /data-tool="pageText"/);
assert.doesNotMatch(html, /Export Layer|Import Layer|\.draftanno/);

console.log('editable PDF flow tests passed');
