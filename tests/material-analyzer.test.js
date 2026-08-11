const assert = require('node:assert/strict');
const analyzer = require('../material-analyzer.js');

function itemsForLine(text, y, chunks = null) {
    const values = chunks || [text];
    return values.map((value, index) => ({
        str: value,
        transform: [1, 0, 0, 1, 20 + (index * 100), y],
    }));
}

const items = [
    ...itemsForLine('54 mil (16 Ga) 600S162-54(50) WL1011 4 244 11/16" 154.1 lb', 700, [
        '54 mil (16 Ga)', '600S162-54(50)', 'WL1011', '4', '244 11/16"', '154.1 lb',
    ]),
    ...itemsForLine('54 mil (16 Ga) 600T125-54(50) WL1011 2 141" 38.3 lb', 680),
    ...itemsForLine('68 mil (14 Ga) 362S162-68(50) WL1104 4 113 15/16" 67.6 lb', 660),
    ...itemsForLine('97 mil (12 Ga) 600S162-97(50) WL1007 3 44 1/2" 36.6 lb', 640),
    ...itemsForLine('54 mil (16 Ga) 750FS-54 WL1012 4 150 1/4" 75.6 lb', 620),
];

const rows = analyzer.parseSpecialStudItems(items, 1);
assert.equal(rows.length, 4, 'only S/T-type 16/14/12 gauge rows should be returned');
assert.deepEqual(rows[0], {
    pageNumber: 1,
    thicknessMil: 54,
    gauge: 16,
    type: '600S162-54(50)',
    panel: 'WL1011',
    quantity: 4,
    cutLength: '244 11/16"',
    weightLb: 154.1,
    sourceText: '54 mil (16 Ga) 600S162-54(50) WL1011 4 244 11/16" 154.1 lb',
});

const summary = analyzer.summarizeRows(rows);
assert.equal(summary.rowCount, 4);
assert.equal(summary.quantity, 13);
assert.equal(summary.typeCount, 4);
assert.equal(summary.weightLb, 296.6);
assert.deepEqual(summary.byGauge.map(item => [item.gauge, item.quantity]), [[16, 6], [14, 4], [12, 3]]);

const csv = analyzer.rowsToCsv(rows);
assert.match(csv, /^Page,Thickness \(mil\),Gauge,Type,Panel,Quantity,Cut Length,Weight \(lb\)/);
assert.match(csv, /600S162-97\(50\),WL1007,3,"44 1\/2""",36\.6/);

assert.equal(analyzer.parseSpecialStudLine('43 mil (18 Ga) 600S162-43(50) WL1001 1 96" 10.0 lb'), null);
assert.equal(analyzer.parseSpecialStudLine('54 mil (16 Ga) 750FS-54 WL1001 1 96" 10.0 lb'), null);
assert.equal(
    analyzer.parseSpecialStudLine('MODEL LABEL 68 mil (14 Ga) 600S200-68(50) WL2005 4 113 15/16" 98.7 lb WL2101 156.12 lb').type,
    '600S200-68(50)',
    'unrelated drawing text on the same baseline should not hide a material row'
);

assert.equal(analyzer.lengthToInches('113 15/16"'), 113.9375);
const reportCsv = analyzer.rowsToReportCsv(rows);
assert.match(reportCsv, /^Separated\r\nWL Number,Label,Qty,Material,Length,Weight/);
assert.match(reportCsv, /\r\n\r\nCombined\r\nMaterial,Length,LengthInches,TotalQty/);
assert.match(reportCsv, /600T125-54\(50\),"141""",141,2,54,16 GA/);

(async()=>{
    let providerCalls=0;
    const fakeDocument={
        numPages:1,
        async getPage(){
            return {async getTextContent(){throw new Error('provider should supply cached text');}};
        },
    };
    const analyzed=await analyzer.analyzePdfDocument(fakeDocument,null,async()=>{
        providerCalls+=1;
        return {items};
    });
    assert.equal(providerCalls,1);
    assert.equal(analyzed.length,4);
    console.log('material-analyzer tests passed');
})().catch(error=>{
    console.error(error);
    process.exitCode=1;
});
