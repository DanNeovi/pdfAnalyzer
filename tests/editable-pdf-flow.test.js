const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');

assert.match(app, /canvas\.toJSON\(\['annotationType','selectable','evented','_hlBaseColor'\]\)/);
assert.match(app, /EmbeddedAnnotationUtils\.embedStateIntoPdf\(\s*baseDoc,originalPdfBytes,editableAnnotationPackage\)/);
assert.match(app, /pdfProxy\.getAttachments\(\)/);
assert.match(app, /await hydrateEmbeddedAnnotations\(embeddedState\.payload\)/);
assert.match(app, /await restoreEmbeddedPageAnnotations\(fc,pendingEmbeddedPage\)/);

for (const tool of ['draw','text','line','arrow','rect','circle','highlight','cloud']) {
    assert.match(app, new RegExp(`${tool}:'`), `${tool} should remain an annotation tool`);
}
assert.match(app, /annotationType:'insertedImage'/);
assert.doesNotMatch(html, /Export Layer|Import Layer|\.draftanno/);

console.log('editable PDF flow tests passed');
