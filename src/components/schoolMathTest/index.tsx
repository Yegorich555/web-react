import { useEffect, useMemo, useState } from "react";
import { useIsAdmin } from "@/helpers/myUser";
import { EXAMPLE_TASK, generateTask, MathTask, MAX_LEVEL } from "./equation";
import exportResults from "./exportResults";
import MathRow, { RowResult } from "./mathRow";
import { clearState, SavedState, saveState } from "./storage";
import { emptyResult, formatDuration, getSummary } from "./summary";
import * as styles from "./schoolMathTest.m.scss";

/** Count of generated rows (example row isn't included) */
const ROWS_COUNT = 20;
/** Count of first rows that are simple as example; other rows have growing complexity */
const SIMPLE_COUNT = 5;

/** Returns complexity for generateTask() by row index */
const getLevel = (i: number): number =>
  i < SIMPLE_COUNT ? 0 : Math.min(MAX_LEVEL, 1 + Math.floor(((i - SIMPLE_COUNT) * MAX_LEVEL) / (ROWS_COUNT - SIMPLE_COUNT)));

interface Test {
  /** Unique id to re-mount rows on refresh */
  id: number;
  tasks: MathTask[];
}

let lastId = 0;
function generateTest(): Test {
  const texts = new Set<string>(); // avoid duplicated tasks
  const tasks = Array.from({ length: ROWS_COUNT }, (_, i) => {
    let t: MathTask;
    do {
      t = generateTask(getLevel(i));
    } while (texts.has(t.text));
    texts.add(t.text);
    return t;
  });
  return { id: ++lastId, tasks };
}

interface Props {
  /** State restored from storage (after page reload) */
  saved?: SavedState | null;
}

export default function SchoolMathTest({ saved }: Props): React.JSX.Element {
  // ignore saved state if count of rows is changed
  const isSaved = saved?.tasks.length === ROWS_COUNT && saved.results.length === ROWS_COUNT;
  const [test, setTest] = useState<Test>(() => (isSaved ? { id: ++lastId, tasks: saved.tasks } : generateTest()));
  /** Current state of every row */
  const [results, setResults] = useState(() => (isSaved ? saved.results : test.tasks.map(emptyResult)));
  /** State to restore rows: it's changed only on refresh */
  const [initials, setInitials] = useState(results);
  const sum = getSummary(results);
  const isAdmin = useIsAdmin();
  // admin can refresh at any time; user only when all rows are completed (so everything is valid)
  const canRefresh = isAdmin || sum.done === ROWS_COUNT;

  /** Stable callbacks per row otherwise MathRow fires onChange on each render */
  const onRowChange = useMemo(
    () =>
      test.tasks.map((_, i) => (r: RowResult) => {
        setResults((prev) => prev.map((v, j) => (j === i ? r : v)));
      }),
    [test],
  );

  useEffect(() => {
    saveState({ tasks: test.tasks, results });
  }, [test, results]);

  const refresh = (): void => {
    if (sum.done > 0) {
      exportResults(results);
    }
    clearState(); // the new test is saved again by effect above
    const next = generateTest();
    const nextResults = next.tasks.map(emptyResult);
    setTest(next);
    setResults(nextResults);
    setInitials(nextResults);
  };

  return (
    <>
      <div className={styles.toolbar}>
        <h1>Раскрытие скобок</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={!canRefresh}
          w-tooltip={canRefresh ? undefined : "Доступно только если все правильно"}
        >
          Обновить
        </button>
      </div>
      <div className={styles.table} data-admin={isAdmin || undefined}>
        <div className={cx(styles.row, styles.header)}>
          <div>Уравнение</div>
          <div>Раскройте скобки</div>
          <div>Оставьте x в одной части</div>
          <div>Ответ</div>
          <div>Время и ошибки</div>
        </div>
        <MathRow task={EXAMPLE_TASK} isExample />
        {test.tasks.map((t, i) => (
          <MathRow
            key={`${test.id}_${t.text}`} // texts are unique per test
            task={t}
            initial={initials[i]}
            onChange={onRowChange[i]}
          />
        ))}
        <div className={cx(styles.row, styles.summary)} data-summary>
          <div>Итого</div>
          <div className={styles.spent}>Потрачено {formatDuration(sum.spentMs)}</div>
          <div>
            <span className={styles.valid} w-tooltip="Решено без ошибок">
              {sum.withoutMistakes}
            </span>
            {" / "}
            <span className={styles.invalid} w-tooltip="Строк с ошибками">
              {sum.withMistakes}
            </span>
            {" / "}
            <span className={styles.fixed} w-tooltip="Всего ошибок">
              {sum.mistakes}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
