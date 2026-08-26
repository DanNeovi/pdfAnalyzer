const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pdf-annotator.html'), 'utf8');
const sidebarStart = html.indexOf('<aside id="sidebar"');
const sidebarEnd = html.indexOf('</aside>', sidebarStart);
const settingsStart = html.indexOf('<div id="shortcutSettingsModal"');
const settingsEnd = html.indexOf('<input id="settingsImportInput"', settingsStart);

assert.ok(sidebarStart >= 0 && sidebarEnd > sidebarStart, 'sidebar markup should exist');
assert.ok(settingsStart >= 0 && settingsEnd > settingsStart, 'settings modal markup should exist');

const sidebar = html.slice(sidebarStart, sidebarEnd);
const settings = html.slice(settingsStart, settingsEnd);

assert.doesNotMatch(sidebar, /Annotation Layers|enableEditableLayers|Editable Annotation File/);
assert.doesNotMatch(settings, /enableEditableLayers|Editable Annotation File|\.draftanno/);
assert.match(settings, /Saved markup uses standard PDF annotations/);
assert.match(settings, /Acrobat, Bluebeam, and Foxit/);
assert.match(settings, /No separate layer file is required/);

console.log('settings layout tests passed');
