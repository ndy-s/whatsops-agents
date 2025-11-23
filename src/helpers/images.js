import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";

function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const testLine = line ? line + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function getColumnWidths(ctx, rows, columns, minWidth = 120, maxWidth = 260) {
    const widths = {};

    columns.forEach(col => {
        let widest = ctx.measureText(col).width + 20;

        for (const row of rows) {
            const text = row[col] !== null ? String(row[col]) : "";
            widest = Math.max(widest, ctx.measureText(text).width + 20);
        }

        widths[col] = Math.min(Math.max(widest, minWidth), maxWidth);
    });

    return widths;
}

export async function generateTableImage(rows) {
    if (!rows || rows.length === 0) throw new Error("No data to generate table.");

    const columns = Object.keys(rows[0]);
    const padding = 20;
    const rowBaseHeight = 28;

    // temp canvas for measuring
    const temp = createCanvas(10, 10);
    const ctx = temp.getContext("2d");
    ctx.font = "16px Sans";

    // calculate column widths
    const colWidths = getColumnWidths(ctx, rows, columns);

    // calculate total width
    const canvasWidth =
        padding * 2 +
        columns.reduce((sum, col) => sum + colWidths[col], 0);

    // calculate row heights
    const rowHeights = [];
    let totalHeight = padding * 2 + rowBaseHeight; // header

    for (const row of rows) {
        let maxH = rowBaseHeight;
        for (const col of columns) {
            const wrapped = wrapText(ctx, row[col], colWidths[col] - 10);
            maxH = Math.max(maxH, wrapped.length * 20);
        }
        rowHeights.push(maxH);
        totalHeight += maxH;
    }

    // final canvas
    const canvas = createCanvas(canvasWidth, totalHeight);
    const final = canvas.getContext("2d");

    // background
    final.fillStyle = "#ffffff";
    final.fillRect(0, 0, canvasWidth, totalHeight);

    final.font = "16px Sans";
    final.textBaseline = "top";

    // draw header
    let x = padding;
    columns.forEach(col => {
        final.fillStyle = "#f7f7f7"; // subtle gray background
        final.fillRect(x, padding, colWidths[col], rowBaseHeight);

        final.strokeStyle = "#cfcfcf";
        final.strokeRect(x, padding, colWidths[col], rowBaseHeight);

        final.fillStyle = "#222";
        final.fillText(col, x + 6, padding + 6);

        x += colWidths[col];
    });

    // draw rows
    let y = padding + rowBaseHeight;
    rows.forEach((row, rIndex) => {
        let x2 = padding;
        const rh = rowHeights[rIndex];

        columns.forEach(col => {
            final.strokeStyle = "#e0e0e0";
            final.strokeRect(x2, y, colWidths[col], rh);

            const text = row[col] !== null ? String(row[col]) : "";
            const lines = wrapText(final, text, colWidths[col] - 10);

            lines.forEach((line, i) => {
                final.fillStyle = "#333";
                final.fillText(line, x2 + 6, y + 6 + i * 20);
            });

            x2 += colWidths[col];
        });

        y += rh;
    });

    // ensure directory exists
    const tmpDir = path.join(process.cwd(), "data", "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const filename = path.join(tmpDir, `table_${Date.now()}.png`);

    const buffer = canvas.toBuffer("image/png");
    if (!buffer || buffer.length < 200) {
        throw new Error("Generated PNG buffer is invalid or empty");
    }

    fs.writeFileSync(filename, buffer);
    return filename;
}


