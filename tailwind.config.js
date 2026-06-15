/** @type {import('tailwindcss').Config} */
// Scans both the markup and app.js, because the app toggles utility classes
// (e.g. `hidden`, `flex`) and builds class strings inside innerHTML at runtime.
// Regenerate the stylesheet after changing classes:
//   npx tailwindcss@3 -c tailwind.config.js -i src/tailwind.input.css -o tailwind.css --minify
module.exports = {
    content: ['./pdf-annotator.html', './app.js'],
    theme: { extend: {} },
    plugins: [],
};
