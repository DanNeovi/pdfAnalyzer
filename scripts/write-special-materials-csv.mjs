import fs from 'node:fs/promises';
import process from 'node:process';
import analyzer from '../material-analyzer.js';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: node scripts/write-special-materials-csv.mjs <output.csv>');

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;

const items = JSON.parse(input);
const rows = analyzer.parseSpecialStudItems(items, 1);
const csv = `\uFEFF${analyzer.rowsToReportCsv(rows)}\r\n`;
await fs.writeFile(outputPath, csv, 'utf8');

const summary = analyzer.summarizeRows(rows);
console.log(JSON.stringify({
    outputPath,
    separatedRows: summary.rowCount,
    combinedRows: analyzer.combineRows(rows).length,
    quantity: summary.quantity,
    weightLb: Number(summary.weightLb.toFixed(1)),
}));
