(function attachSpecialStudAnalyzer(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.SpecialStudAnalyzer = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSpecialStudAnalyzer() {
    'use strict';

    const SPECIAL_GAUGES = new Map([
        ['54', '16'],
        ['68', '14'],
        ['97', '12'],
    ]);

    function normalizeText(value) {
        return String(value || '')
            .replace(/[\u00a0\u2007\u202f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function itemBaseline(item) {
        const transform = Array.isArray(item && item.transform) ? item.transform : [];
        return Number.isFinite(transform[5]) ? transform[5] : 0;
    }

    function itemLeft(item) {
        const transform = Array.isArray(item && item.transform) ? item.transform : [];
        return Number.isFinite(transform[4]) ? transform[4] : 0;
    }

    function groupTextItemsIntoLines(items, baselineTolerance = 2) {
        const textItems = (Array.isArray(items) ? items : [])
            .filter(item => normalizeText(item && item.str))
            .map(item => ({item, y: itemBaseline(item), x: itemLeft(item)}))
            .sort((a, b) => (b.y - a.y) || (a.x - b.x));
        const lines = [];

        textItems.forEach(entry => {
            let line = lines.find(candidate => Math.abs(candidate.y - entry.y) <= baselineTolerance);
            if (!line) {
                line = {y: entry.y, entries: []};
                lines.push(line);
            }
            line.entries.push(entry);
            const total = line.entries.length;
            line.y = ((line.y * (total - 1)) + entry.y) / total;
        });

        return lines
            .sort((a, b) => b.y - a.y)
            .map(line => normalizeText(line.entries
                .sort((a, b) => a.x - b.x)
                .map(entry => entry.item.str)
                .join(' ')))
            .filter(Boolean);
    }

    function parseSpecialStudLine(line, pageNumber = 1) {
        const normalized = normalizeText(line);
        const match = normalized.match(
            /(\d{2,3})\s*mil\s*\(\s*(\d{2})\s*Ga\s*\)\s+(\d{3}[ST]\d{3}-\d{2}(?:\(\d+\))?)\s+(WL-?\d{4}[A-Z]?)\s+(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*lb/i
        );
        if (!match) return null;

        const thicknessMil = match[1];
        const gauge = match[2];
        if (SPECIAL_GAUGES.get(thicknessMil) !== gauge) return null;

        return {
            pageNumber,
            thicknessMil: Number(thicknessMil),
            gauge: Number(gauge),
            type: match[3].toUpperCase(),
            panel: match[4].toUpperCase().replace(/^WL-/, 'WL'),
            quantity: Number(match[5]),
            cutLength: normalizeText(match[6]),
            weightLb: Number(match[7]),
            sourceText: normalizeText(match[0]),
        };
    }

    function parseSpecialStudItems(items, pageNumber = 1) {
        const rows = groupTextItemsIntoLines(items)
            .map(line => parseSpecialStudLine(line, pageNumber))
            .filter(Boolean);
        const seen = new Set();
        return rows.filter(row => {
            const key = [row.pageNumber, row.thicknessMil, row.type, row.panel,
                row.quantity, row.cutLength, row.weightLb].join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async function analyzePdfDocument(pdfDocument, onProgress, getTextContentForPage) {
        if (!pdfDocument || !Number.isFinite(pdfDocument.numPages)) {
            throw new Error('A loaded PDF document is required.');
        }
        const rows = [];
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
            if (typeof onProgress === 'function') onProgress(pageNumber, pdfDocument.numPages);
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = typeof getTextContentForPage === 'function'
                ? await getTextContentForPage(pageNumber, page)
                : await page.getTextContent();
            rows.push(...parseSpecialStudItems(textContent.items, pageNumber));
        }
        return rows;
    }

    function summarizeRows(rows) {
        const safeRows = Array.isArray(rows) ? rows : [];
        const byGaugeMap = new Map();
        const byTypeMap = new Map();
        let quantity = 0;
        let weightLb = 0;

        safeRows.forEach(row => {
            quantity += row.quantity;
            weightLb += row.weightLb;

            const gaugeKey = `${row.gauge}|${row.thicknessMil}`;
            if (!byGaugeMap.has(gaugeKey)) {
                byGaugeMap.set(gaugeKey, {
                    gauge: row.gauge,
                    thicknessMil: row.thicknessMil,
                    rowCount: 0,
                    quantity: 0,
                    weightLb: 0,
                    types: new Set(),
                });
            }
            const gaugeSummary = byGaugeMap.get(gaugeKey);
            gaugeSummary.rowCount += 1;
            gaugeSummary.quantity += row.quantity;
            gaugeSummary.weightLb += row.weightLb;
            gaugeSummary.types.add(row.type);

            if (!byTypeMap.has(row.type)) {
                byTypeMap.set(row.type, {
                    type: row.type,
                    gauge: row.gauge,
                    thicknessMil: row.thicknessMil,
                    rowCount: 0,
                    quantity: 0,
                    weightLb: 0,
                });
            }
            const typeSummary = byTypeMap.get(row.type);
            typeSummary.rowCount += 1;
            typeSummary.quantity += row.quantity;
            typeSummary.weightLb += row.weightLb;
        });

        return {
            rowCount: safeRows.length,
            quantity,
            weightLb,
            typeCount: byTypeMap.size,
            byGauge: Array.from(byGaugeMap.values())
                .map(entry => ({
                    gauge: entry.gauge,
                    thicknessMil: entry.thicknessMil,
                    rowCount: entry.rowCount,
                    quantity: entry.quantity,
                    weightLb: entry.weightLb,
                    typeCount: entry.types.size,
                }))
                .sort((a, b) => b.gauge - a.gauge),
            byType: Array.from(byTypeMap.values()).sort((a, b) =>
                (b.gauge - a.gauge) || a.type.localeCompare(b.type)),
        };
    }

    function csvCell(value) {
        const text = String(value == null ? '' : value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function rowsToCsv(rows) {
        const headings = ['Page', 'Thickness (mil)', 'Gauge', 'Type', 'Panel', 'Quantity', 'Cut Length', 'Weight (lb)'];
        const body = (Array.isArray(rows) ? rows : []).map(row => [
            row.pageNumber,
            row.thicknessMil,
            row.gauge,
            row.type,
            row.panel,
            row.quantity,
            row.cutLength,
            row.weightLb.toFixed(1),
        ]);
        return [headings, ...body].map(values => values.map(csvCell).join(',')).join('\r\n');
    }

    function lengthToInches(cutLength) {
        const match = normalizeText(cutLength).match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?"$/);
        if (!match) return '';
        const whole = Number(match[1]);
        const fraction = match[2] && match[3] ? Number(match[2]) / Number(match[3]) : 0;
        return whole + fraction;
    }

    function combineRows(rows) {
        const groups = new Map();
        (Array.isArray(rows) ? rows : []).forEach(row => {
            const key = `${row.type}|${row.cutLength}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    material: row.type,
                    length: row.cutLength,
                    lengthInches: lengthToInches(row.cutLength),
                    totalQty: 0,
                    thicknessMil: row.thicknessMil,
                    gauge: `${row.gauge} GA`,
                    callout: `${row.thicknessMil} mil / ${row.gauge} GA`,
                    walls: [],
                    sourceLabels: [],
                });
            }
            const group = groups.get(key);
            group.totalQty += row.quantity;
            if (!group.walls.includes(row.panel)) group.walls.push(row.panel);
            group.sourceLabels.push(`${row.panel}:x${row.quantity}`);
        });
        return Array.from(groups.values()).sort((a, b) =>
            a.material.localeCompare(b.material) || a.lengthInches - b.lengthInches);
    }

    function rowsToReportCsv(rows) {
        const safeRows = Array.isArray(rows) ? rows : [];
        const separated = [
            ['Separated'],
            ['WL Number', 'Label', 'Qty', 'Material', 'Length', 'Weight'],
            ...safeRows.map(row => [
                row.panel,
                '',
                row.quantity,
                row.type,
                row.cutLength,
                row.weightLb.toFixed(2),
            ]),
        ];
        const combined = [
            ['Combined'],
            ['Material', 'Length', 'LengthInches', 'TotalQty', 'ThicknessMil', 'Gauge', 'Callout', 'Walls', 'SourceLabels'],
            ...combineRows(safeRows).map(row => [
                row.material,
                row.length,
                row.lengthInches,
                row.totalQty,
                row.thicknessMil,
                row.gauge,
                row.callout,
                row.walls.join('; '),
                row.sourceLabels.join('; '),
            ]),
        ];
        return [...separated, [], ...combined]
            .map(values => values.map(csvCell).join(','))
            .join('\r\n');
    }

    return {
        analyzePdfDocument,
        groupTextItemsIntoLines,
        normalizeText,
        parseSpecialStudItems,
        parseSpecialStudLine,
        rowsToCsv,
        rowsToReportCsv,
        combineRows,
        lengthToInches,
        summarizeRows,
    };
}));
