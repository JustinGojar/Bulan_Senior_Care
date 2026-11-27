// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { tablesToExcel, tablesToWord } from "@/lib/export-file";

describe("untrusted export values", () => {
  it("escapes HTML in Word exports", async () => {
    const payload = '<img src=x onerror="alert(1)">';
    const blob = tablesToWord({
      title: payload,
      details: [payload],
      tables: [{ columns: [{ label: payload }], rows: [[payload]] }],
    });
    const html = await blob.text();
    expect(html).not.toContain(payload);
    expect(html).toContain("&lt;img");
  });

  it("keeps formula-like spreadsheet values as text after a write/read round trip", async () => {
    const payload = '=HYPERLINK("https://attacker.example","click")';
    const blob = await tablesToExcel({
      title: "Test",
      tables: [{ columns: [{ label: "Value" }], rows: [[payload]] }],
    });
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    const cell = Object.values(sheet).find((value) => value?.v === payload);
    expect(cell).toMatchObject({ t: "s", v: payload });
    expect(cell?.f).toBeUndefined();
  });
});
