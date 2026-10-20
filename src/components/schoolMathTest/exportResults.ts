import exportToExcel, { ExcelFontStyles, IExcelColumnMap, IExcelStyle } from "web-ui-pack/helpers/files/exportToExcel";
import { Field, fields, RowResult } from "./mathRow";
import { formatDuration, getSummary } from "./summary";

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
  { propName: "unwrap", headerText: "Раскройте скобки" },
  { propName: "isolate", headerText: "Оставьте x в одной части" },
  { propName: "answer", headerText: "Ответ" },
  { propName: "isDone", headerText: "Решено" },
  { propName: "mistakes", headerText: "Ошибки" },
  { propName: "times", headerText: "Время, сек" },
];

// WARN: the same objects for every cell otherwise exportToExcel re-resolves the style per cell
const validStyle: IExcelStyle = { color: "#1e9e4a" };
const invalidStyle: IExcelStyle = { color: "#e02424" };
const summaryStyle: IExcelStyle = { fontStyle: ExcelFontStyles.bold };
const summaryStyles: Partial<Record<keyof Item, IExcelStyle>> = {
  unwrap: { ...summaryStyle, ...validStyle },
  isolate: { ...summaryStyle, ...invalidStyle },
  mistakes: { ...summaryStyle, color: "#f08c00" },
};

const storageKey = "mathTest.fileIndex";
let fileIndex = 0;
/** Returns next index for file name: it's stored in localStorage to avoid the same names after reloading the page */
function nextFileIndex(): number {
  try {
    fileIndex = Math.max(fileIndex, Number(localStorage.getItem(storageKey)) || 0);
  } catch {
    // storage can be blocked: use index in memory
  }
  ++fileIndex;
  try {
    localStorage.setItem(storageKey, String(fileIndex));
  } catch {
    // storage can be blocked: use index in memory
  }
  return fileIndex;
}

/** Save results of every row into excel-file `mathTest_{N}.xlsx` */
export default function exportResults(rows: RowResult[]): Promise<Blob> {
  const data = rows.map<Item>((r, i) => ({
    num: i + 1,
    task: r.task.text,
    unwrap: r.values.unwrap ?? "",
    isolate: r.values.isolate ?? "",
    answer: r.values.answer ?? "",
    isDone: r.times ? "да" : "нет",
    mistakes: r.mistakes,
    times: r.times?.join(";") ?? "",
  }));

  // summary row at the end
  const sum = getSummary(rows);
  data.push({
    num: "",
    task: "Итого",
    unwrap: `без ошибок: ${sum.withoutMistakes}`,
    isolate: `с ошибками: ${sum.withMistakes}`,
    answer: "",
    isDone: `${sum.done} из ${sum.total}`,
    mistakes: sum.mistakes,
    times: `Потрачено ${formatDuration(sum.spentMs)}`,
  });

  return exportToExcel(
    [{ name: "Раскрытие скобок", data, mapping }],
    `mathTest_${nextFileIndex()}.xlsx`,
    (_v, rowIndex, _sheetIndex, m) => {
      if (rowIndex === data.length) {
        return { style: summaryStyles[m.propName] ?? summaryStyle };
      }
      const state = rowIndex ? rows[rowIndex - 1].states[m.propName as Field] : undefined; // rowIndex 0 is header
      if (state == null || !fields.includes(m.propName as Field)) {
        return undefined;
      }
      return { style: state ? validStyle : invalidStyle };
    },
  );
}
