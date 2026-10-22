import exportToExcel, { ExcelFontStyles, IExcelColumnMap, IExcelStyle } from "web-ui-pack/helpers/files/exportToExcel";
import { Field, fieldTitles, getCorrectValues, RowResult } from "./mathRow";
import { LevelResult, nextFileIndex } from "./storage";
import { formatDuration, getSummary } from "./summary";
import * as styles from "./schoolMathTest.m.scss";

interface Item extends Record<Field, string> {
  /** Empty for summary row */
  num: number | "";
  task: string;
  isDone: string;
  mistakes: number;
  /** Seconds per input: `21;4;3` */
  times: string;
}

const mapping: IExcelColumnMap<Item>[] = [
  { propName: "num", headerText: "№" },
  { propName: "task", headerText: "Уравнение" },
  { propName: "unwrap", headerText: fieldTitles.unwrap },
  { propName: "isolate", headerText: fieldTitles.isolate },
  { propName: "answer", headerText: fieldTitles.answer },
  { propName: "isDone", headerText: "Решено" },
  { propName: "mistakes", headerText: "Грешки" },
  { propName: "times", headerText: "Време, сек" },
];

// WARN: the same objects for every cell otherwise exportToExcel re-resolves the style per cell
// colors are the same as in UI (see :export in scss)
const validStyle: IExcelStyle = { color: styles.colorValid };
const invalidStyle: IExcelStyle = { color: styles.colorInvalid };
const prefilledStyle: IExcelStyle = { color: styles.colorPrefilled };
const summaryStyle: IExcelStyle = { fontStyle: ExcelFontStyles.bold };
const summaryStyles: Partial<Record<keyof Item, IExcelStyle>> = {
  unwrap: { ...summaryStyle, ...validStyle },
  isolate: { ...summaryStyle, ...invalidStyle },
  mistakes: { ...summaryStyle, color: styles.colorFixed },
};

/** Returns rows of excel-sheet: every row of the test + summary row */
function toSheetData({ level, fields, results: rows }: LevelResult): Item[] {
  const value = (r: RowResult, f: Field, prefix = ""): string => {
    if (!fields.includes(f)) {
      return getCorrectValues(r.task)[f]; // prefilled since column is learned
    }
    const v = r.values[f];
    return v ? prefix + v : "";
  };
  const data = rows.map<Item>((r, i) => ({
    num: i + 1,
    task: r.task.text,
    unwrap: value(r, "unwrap"),
    isolate: value(r, "isolate"),
    answer: value(r, "answer", "x = "), // prefix `x = ` isn't part of input value
    isDone: r.times ? "да" : "не",
    mistakes: r.mistakes,
    times: r.times?.join(";") ?? "",
  }));

  // summary row at the end
  const sum = getSummary(rows);
  data.push({
    num: "",
    task: `Общо, ниво ${level}`,
    unwrap: `без грешки: ${sum.withoutMistakes}`,
    isolate: `с грешки: ${sum.withMistakes}`,
    answer: "",
    isDone: `${sum.done} от ${sum.total}`,
    mistakes: sum.mistakes,
    times: `Време: ${formatDuration(sum.spentMs)}`,
  });
  return data;
}

/** Save results of every level into excel-file `mathTest_{N}.xlsx`: 1 sheet per level */
export default async function exportResults(levels: LevelResult[]): Promise<Blob> {
  const sheets = levels.map((lvl) => ({ name: `Ниво ${lvl.level}`, data: toSheetData(lvl), mapping }));
  return exportToExcel(sheets, `mathTest_${await nextFileIndex()}.xlsx`, (_v, rowIndex, sheetIndex, m) => {
    const { fields, results: rows } = levels[sheetIndex];
    if (rowIndex === sheets[sheetIndex].data.length) {
      return { style: summaryStyles[m.propName] ?? summaryStyle };
    }
    if (rowIndex && m.propName in fieldTitles && !fields.includes(m.propName as Field)) {
      return { style: prefilledStyle };
    }
    const state = rowIndex ? rows[rowIndex - 1].states[m.propName as Field] : undefined; // rowIndex 0 is header
    if (state == null) {
      return undefined;
    }
    return { style: state ? validStyle : invalidStyle };
  });
}
