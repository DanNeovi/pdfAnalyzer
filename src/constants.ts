// @ts-nocheck — staged port. Constants extracted from the original
// monolithic app.js. Plain values; no behavior, no DOM, no side effects.
// Imported by main.ts and (eventually) the per-feature modules.

export const CLIPBOARD_OBJECT_PROPS = ['annotationType', '_hlBaseColor'];
export const KEYBOARD_PASTE_OFFSET = 15;
export const DEFAULT_MAX_STROKE_SIZE = 50;
export const DEFAULT_MAX_TEXT_SIZE = 300;

export const PAGE_SCALE_ADJUST = 0.98;
export const ARROW_MODE_OPTIONS = ['single', 'double', 'note'];
export const HIGHLIGHT_MODE_OPTIONS = ['pen', 'box', 'ellipse'];

// localStorage key namespace. Don't rename — already-saved user prefs use these.
export const PREF_KEY_ARROW_MODE = 'draftannotator.arrow.mode';
export const PREF_KEY_HIGHLIGHT_MODE = 'draftannotator.highlight.mode';
export const PREF_KEY_RECENT_COLORS = 'draftannotator.recentColors';
export const PREF_KEY_SHORTCUTS = 'draftannotator.shortcuts';
export const PREF_KEY_EDITOR_SETTINGS = 'draftannotator.editorSettings';
export const PREF_KEY_TOOLBAR_STATE = 'draftannotator.toolbarState';

export const TOOL_NAMES = {
  select: 'Select', draw: 'Pencil', line: 'Line', arrow: 'Arrow',
  rect: 'Rectangle', circle: 'Circle', text: 'Text',
  highlight: 'Highlight', cloud: 'Rev Cloud',
};
export const SHAPE_TOOLS = ['line', 'arrow', 'rect', 'circle', 'cloud'];

export const SHORTCUT_SCHEMA_VERSION = 2;
export const SHORTCUT_MODIFIER_CODES = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
]);

export const SHORTCUT_TOOL_FIELDS = [
  { id: 'select', label: 'Select tool', description: 'Switch to select mode.', defaults: ['Digit1', 'KeyS'] },
  { id: 'draw', label: 'Pencil tool', description: 'Switch to freehand drawing.', defaults: ['Digit2', 'KeyD'] },
  { id: 'text', label: 'Text tool', description: 'Place a text annotation.', defaults: ['Digit3', 'KeyT'] },
  { id: 'line', label: 'Line tool', description: 'Draw a straight line.', defaults: ['Digit4', 'KeyL'] },
  { id: 'arrow', label: 'Arrow tool', description: 'Draw an arrow annotation.', defaults: ['Digit5', 'KeyA'] },
  { id: 'rect', label: 'Rectangle tool', description: 'Draw a rectangle.', defaults: ['Digit6', 'KeyR'] },
  { id: 'circle', label: 'Circle tool', description: 'Draw a circle/ellipse.', defaults: ['Digit7', 'KeyC'] },
  { id: 'highlight', label: 'Highlight tool', description: 'Use the current highlight mode.', defaults: ['Digit8', 'KeyH'] },
  { id: 'cloud', label: 'Revision cloud tool', description: 'Draw a revision cloud.', defaults: ['Digit9', 'KeyV'] },
];

export const SHORTCUT_ACTION_FIELDS = [
  { id: 'copy', label: 'Copy selection', description: 'Copy the current selected annotation(s).', defaults: ['Mod+KeyC'] },
  { id: 'cut', label: 'Cut selection', description: 'Copy and remove the current selection.', defaults: ['Mod+KeyX'] },
  { id: 'paste', label: 'Paste', description: 'Paste the internal annotation clipboard onto the current page.', defaults: ['Mod+KeyV'] },
  { id: 'selectAll', label: 'Select all', description: 'Select every annotation on the current page.', defaults: ['Mod+KeyA'] },
  { id: 'duplicate', label: 'Duplicate selection', description: 'Duplicate the current selected annotation(s).', defaults: ['Mod+KeyD'] },
  { id: 'save', label: 'Save PDF', description: 'Save even when focus is inside a field.', defaults: ['Mod+KeyS'] },
  { id: 'undo', label: 'Undo', description: 'Undo the last change.', defaults: ['Mod+KeyZ'] },
  { id: 'redo', label: 'Redo', description: 'Redo the next change.', defaults: ['Mod+KeyY', 'Mod+Shift+KeyZ'] },
  { id: 'deleteSelection', label: 'Delete selection', description: 'Delete the active selected annotation(s).', defaults: ['Delete', 'Backspace'] },
  { id: 'deselect', label: 'Deselect / exit text edit', description: 'Clear selection or exit active text editing.', defaults: ['Escape'] },
  { id: 'zoomIn', label: 'Zoom in', description: 'Increase zoom level.', defaults: ['Mod+Equal', 'Mod+Shift+Equal', 'Mod+NumpadAdd'] },
  { id: 'zoomOut', label: 'Zoom out', description: 'Decrease zoom level.', defaults: ['Mod+Minus', 'Mod+NumpadSubtract'] },
  { id: 'zoomFit', label: 'Zoom fit', description: 'Return to fit-to-width zoom.', defaults: ['Mod+Digit0', 'Mod+Numpad0'] },
  { id: 'nudgeLeft', label: 'Nudge left', description: 'Move selection left by 1 pixel.', defaults: ['ArrowLeft'] },
  { id: 'nudgeRight', label: 'Nudge right', description: 'Move selection right by 1 pixel.', defaults: ['ArrowRight'] },
  { id: 'nudgeUp', label: 'Nudge up', description: 'Move selection up by 1 pixel.', defaults: ['ArrowUp'] },
  { id: 'nudgeDown', label: 'Nudge down', description: 'Move selection down by 1 pixel.', defaults: ['ArrowDown'] },
  { id: 'nudgeLeftFast', label: 'Nudge left x10', description: 'Move selection left by 10 pixels.', defaults: ['Shift+ArrowLeft'] },
  { id: 'nudgeRightFast', label: 'Nudge right x10', description: 'Move selection right by 10 pixels.', defaults: ['Shift+ArrowRight'] },
  { id: 'nudgeUpFast', label: 'Nudge up x10', description: 'Move selection up by 10 pixels.', defaults: ['Shift+ArrowUp'] },
  { id: 'nudgeDownFast', label: 'Nudge down x10', description: 'Move selection down by 10 pixels.', defaults: ['Shift+ArrowDown'] },
];

export const SHORTCUT_REFERENCE_ACTION_IDS = [
  'undo', 'redo', 'save', 'copy', 'cut', 'paste', 'selectAll', 'duplicate',
  'deleteSelection', 'deselect', 'zoomIn', 'zoomOut', 'zoomFit',
  'nudgeLeft', 'nudgeRight', 'nudgeUp', 'nudgeDown',
];

export const SHORTCUT_TOOL_FIELD_MAP = new Map(SHORTCUT_TOOL_FIELDS.map((def) => [def.id, def]));
export const SHORTCUT_ACTION_FIELD_MAP = new Map(SHORTCUT_ACTION_FIELDS.map((def) => [def.id, def]));

export const EDITOR_SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
export const TOOLBAR_STATE_SCHEMA_VERSION = 1;

export const FONT_FAMILY_OPTIONS = ['sans-serif', 'serif', 'monospace'];

export const EDITOR_SETTINGS_LIMITS = {
  maxStrokeSize: { min: 6, max: 200, default: DEFAULT_MAX_STROKE_SIZE },
  maxTextSize: { min: 72, max: 1000, default: DEFAULT_MAX_TEXT_SIZE },
};

// Render / zoom / history thresholds — referenced from the runtime body.
export const MAX_HISTORY = 200;
export const HIGHLIGHT_LAYER_ALPHA = 0.35;
export const PDF_REFRESH_MARGIN_PX = 900;
export const SAVE_OVERLAY_SCALE = 2.5;
export const ZOOM_STEP = 0.15;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3.0;
