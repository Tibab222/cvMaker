import AdmZip from "adm-zip";
import type { InterviewQuestion } from "../../../shared/interviewQuestions.types";

/**
 * Interview questions exported to files: an HTML prep sheet (printed to PDF by the caller), a Word document and an
 * Excel workbook. The Office files are written by hand (a few XML parts zipped together): no dependency needed.
 *
 * Electron-free on purpose, so it can be exercised from plain Node.
 */

export interface QuestionsDocument {
    title: string;
    /** "12 questions · 22 November 2026" */
    subtitle: string;
    questions: InterviewQuestion[];
}

const NO_ANSWER = "No answer prepared yet.";

const interviews = (question: InterviewQuestion) =>
    question.applications.map((application) => `${application.company_name} · ${application.job_title}`).join(", ");

/** "2026-11-22T10:00:00.000Z" -> "2026-11-22" (the stored date is ISO, or SQLite's "2026-11-22 10:00:00"). */
const day = (date: string) => date.slice(0, 10);

/** Characters XML 1.0 refuses (control characters pasted from elsewhere) would make Word and Excel reject the file. */
// eslint-disable-next-line no-control-regex
const xmlSafe = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
const escapeXml = (text: string) =>
    xmlSafe(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A file name from a title: no characters Windows refuses, not too long. */
export function exportFileName(title: string, extension: string): string {
    // eslint-disable-next-line no-control-regex
    const base = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim().slice(0, 120);
    return `${base || "Interview questions"}.${extension}`;
}

/* ------------------------------------------------------------------ */
/* PDF (HTML printed by Chromium)                                      */
/* ------------------------------------------------------------------ */

export function questionsHtml(doc: QuestionsDocument): string {
    const items = doc.questions.map((question, index) => `
        <section class="question">
            <h2><span class="number">${index + 1}.</span> ${escapeXml(question.question)}</h2>
            ${question.answer
                ? `<div class="answer">${escapeXml(question.answer)}</div>`
                : `<div class="answer empty">${NO_ANSWER}</div>`}
            ${question.applications.length ? `<p class="asked">Asked in: ${escapeXml(interviews(question))}</p>` : ""}
        </section>`).join("");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeXml(doc.title)}</title>
<style>
    @page { size: A4; margin: 18mm 17mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f2430; font-size: 10.5pt; line-height: 1.5; }
    header { border-bottom: 2px solid #6d5bd0; padding-bottom: 8px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 19pt; letter-spacing: -0.01em; }
    .subtitle { margin: 3px 0 0; color: #6b7280; font-size: 9.5pt; }
    .question { break-inside: avoid; page-break-inside: avoid; padding: 10px 0 12px; border-bottom: 1px solid #e5e7eb; }
    .question:last-child { border-bottom: 0; }
    h2 { margin: 0 0 5px; font-size: 11.5pt; line-height: 1.35; }
    .number { color: #6d5bd0; }
    .answer { white-space: pre-wrap; overflow-wrap: anywhere; }
    .answer.empty { color: #9ca3af; font-style: italic; }
    .asked { margin: 6px 0 0; color: #6b7280; font-size: 9pt; }
</style>
</head>
<body>
    <header>
        <h1>${escapeXml(doc.title)}</h1>
        <p class="subtitle">${escapeXml(doc.subtitle)}</p>
    </header>
    ${items}
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Word (.docx)                                                        */
/* ------------------------------------------------------------------ */

interface RunStyle {
    bold?: boolean;
    italic?: boolean;
    /** Half-points: 22 = 11pt. */
    size?: number;
    color?: string;
}

function run(text: string, style: RunStyle = {}): string {
    const props = [
        style.bold ? "<w:b/>" : "",
        style.italic ? "<w:i/>" : "",
        style.color ? `<w:color w:val="${style.color}"/>` : "",
        style.size ? `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` : "",
    ].join("");
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

/** spacingAfter in twentieths of a point; keepNext keeps a question on the page of its answer. */
function paragraph(runs: string, options: { after?: number; before?: number; keepNext?: boolean; border?: boolean } = {}): string {
    const props = [
        options.keepNext ? "<w:keepNext/>" : "",
        options.border ? `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="6D5BD0"/></w:pBdr>` : "",
        `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 80}"/>`,
    ].join("");
    return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`;
}

export function questionsDocx(doc: QuestionsDocument): Buffer {
    const body: string[] = [
        paragraph(run(doc.title, { bold: true, size: 36 }), { after: 40 }),
        paragraph(run(doc.subtitle, { size: 19, color: "6B7280" }), { after: 240, border: true }),
    ];
    doc.questions.forEach((question, index) => {
        body.push(paragraph(run(`${index + 1}. `, { bold: true, size: 23, color: "6D5BD0" }) + run(question.question, { bold: true, size: 23 }), {
            before: index === 0 ? 0 : 240,
            after: 80,
            keepNext: true,
        }));
        if (question.answer) {
            // one paragraph per line: Word ignores raw line breaks inside a text run
            for (const line of question.answer.split("\n")) body.push(paragraph(line ? run(line, { size: 21 }) : "", { after: 40 }));
        } else {
            body.push(paragraph(run(NO_ANSWER, { italic: true, size: 21, color: "9CA3AF" })));
        }
        if (question.applications.length) {
            body.push(paragraph(run(`Asked in: ${interviews(question)}`, { size: 18, color: "6B7280" }), { before: 60 }));
        }
    });

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;

    const zip = new AdmZip();
    zip.addFile("[Content_Types].xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`, "utf8"));
    zip.addFile("_rels/.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`, "utf8"));
    zip.addFile("word/_rels/document.xml.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`, "utf8"));
    zip.addFile("word/document.xml", Buffer.from(document, "utf8"));
    zip.addFile("word/styles.xml", Buffer.from(styles, "utf8"));
    return zip.toBuffer();
}

/* ------------------------------------------------------------------ */
/* Excel (.xlsx)                                                       */
/* ------------------------------------------------------------------ */

const COLUMNS = [
    { header: "#", width: 5 },
    { header: "Question", width: 50 },
    { header: "Prepared answer", width: 80 },
    { header: "Asked in", width: 36 },
    { header: "Last edited", width: 13 },
];

const columnLetter = (index: number) => String.fromCharCode(65 + index);

/** style 1: bold header, 2: wrapped text aligned on top */
function cell(column: number, row: number, value: string | number, style: number): string {
    const ref = `${columnLetter(column)}${row}`;
    if (typeof value === "number") return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export function questionsXlsx(doc: QuestionsDocument): Buffer {
    const rows = [
        `<row r="1">${COLUMNS.map((column, index) => cell(index, 1, column.header, 1)).join("")}</row>`,
        ...doc.questions.map((question, index) => {
            const row = index + 2;
            const values: (string | number)[] = [index + 1, question.question, question.answer, interviews(question), day(question.updated_at)];
            return `<row r="${row}">${values.map((value, column) => cell(column, row, value, 2)).join("")}</row>`;
        }),
    ];
    const last = `${columnLetter(COLUMNS.length - 1)}${doc.questions.length + 1}`;
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${COLUMNS.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<autoFilter ref="A1:${last}"/>
</worksheet>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6D5BD0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    // sheet names: 31 characters at most, none of []:*?/\
    const sheetName = escapeXml(doc.title.replace(/[[\]:*?/\\]/g, " ").slice(0, 31).trim() || "Interview questions");

    const zip = new AdmZip();
    zip.addFile("[Content_Types].xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`, "utf8"));
    zip.addFile("_rels/.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`, "utf8"));
    zip.addFile("xl/workbook.xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`, "utf8"));
    zip.addFile("xl/_rels/workbook.xml.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`, "utf8"));
    zip.addFile("xl/worksheets/sheet1.xml", Buffer.from(sheet, "utf8"));
    zip.addFile("xl/styles.xml", Buffer.from(styles, "utf8"));
    return zip.toBuffer();
}
