import { useEffect, useMemo, useState } from "react";
import { useIsAdmin } from "@/helpers/myUser";
import { EXAMPLE_TASK } from "./equation";
import exportResults from "./exportResults";
import MathRow, { allFields, fieldTitles, RowResult, withFocusedSpent } from "./mathRow";
import { clearState, LevelResult, SavedState, saveState } from "./storage";
import { emptyResult, formatDuration, getSummary } from "./summary";
import simulateResults from "./simulate";
import {
  generateTest,
  levelPlan,
  MAX_LEVEL,
  planNextTest,
  remountTest,
  restoreTest,
  ROWS_COUNT,
  samePlan,
  Test,
  TestPlan,
} from "./testPlan";
import * as styles from "./schoolMathTest.m.scss";

/** Returns text for tooltip of button 'Нов тест' */
function describePlan(test: Test, plan: TestPlan): string {
  const level = plan.level > test.level ? `Преминаване към ниво ${plan.level}` : `Нов кръг от ниво ${plan.level}`;
  return plan.fields.length < allFields.length ? `${level}, упражнение: ${plan.fields.map((f) => fieldTitles[f]).join(", ")}` : level;
}

interface Props {
  /** State restored from storage (after page reload) */
  saved?: SavedState | null;
}

export default function SchoolMathTest({ saved }: Props): React.JSX.Element {
  // ignore saved state if count of rows is changed
  const isSaved = saved?.tasks.length === ROWS_COUNT && saved.results.length === ROWS_COUNT;
  const [test, setTest] = useState<Test>(() => (isSaved ? restoreTest(saved) : generateTest(levelPlan(1))));
  /** Current state of every row */
  const [results, setResults] = useState(() => (isSaved ? saved.results : test.tasks.map(emptyResult)));
  /** State to restore rows: it's changed only on refresh */
  const [initials, setInitials] = useState(results);
  /** Restored state is already stored: don't save it again */
  const [restored] = useState(isSaved ? results : null);
  /** Results of previous levels of the current round */
  const [history, setHistory] = useState<LevelResult[]>(() => (isSaved ? saved.history : []));
  /** All levels of the current round are exported (it happens when the last level is finished) */
  const [isExported, setIsExported] = useState(isSaved && saved.isExported);
  const [isExporting, setIsExporting] = useState(false);
  const sum = getSummary(results);
  const isAdmin = useIsAdmin();
  const isEnded = sum.done === ROWS_COUNT;
  // admin can start the next test at any time; user only when all rows are completed (so everything is valid)
  const canNext = (isAdmin || isEnded) && !isExporting;
  const nextPlan = isAdmin || isEnded ? planNextTest(test, results) : null;

  /** Stable callbacks per row otherwise MathRow fires onChange on each render */
  const onRowChange = useMemo(
    () =>
      test.tasks.map((_, i) => (r: RowResult) => {
        setResults((prev) => prev.map((v, j) => (j === i ? r : v)));
      }),
    [test],
  );

  useEffect(() => {
    const toSaved = (rows: RowResult[]): SavedState => ({
      level: test.level,
      fields: test.fields,
      tasks: test.tasks,
      results: rows,
      history,
      isExported,
    });
    results !== restored && saveState(toSaved(results));
    // save at once if user closes/reloads page: including time of focused input that is counted only on blur
    const onHide = (): void => saveState(toSaved(withFocusedSpent(results)), true);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [test, results, restored, history, isExported]);

  /** Save results into excel; WARN: it throws if export fails (error is shown by theError) */
  const save = async (levels: LevelResult[]): Promise<void> => {
    setIsExporting(true);
    try {
      await exportResults(levels);
    } finally {
      setIsExporting(false);
    }
  };

  // the last level is finished: save all levels of the round at once
  useEffect(() => {
    if (isEnded && test.level === MAX_LEVEL && !isExported) {
      setIsExported(true); // before export otherwise it's repeated on each render if export fails
      setIsExporting(true);
      exportResults([...history, { level: test.level, fields: test.fields, results }]).finally(() => setIsExporting(false));
    }
  }, [isEnded, isExported, test, history, results]);

  const start = (plan: TestPlan, nextHistory: LevelResult[]): void => {
    clearState(); // the new test is saved again by effect above
    const next = generateTest(plan);
    const nextResults = next.tasks.map(emptyResult);
    setTest(next);
    setResults(nextResults);
    setInitials(nextResults);
    setHistory(nextHistory);
    setIsExported(false);
  };

  /** Admin-only: new tasks of the same level; results of the current test are saved at once */
  const refresh = async (): Promise<void> => {
    sum.done > 0 && (await save([{ level: test.level, fields: test.fields, results }])); // WARN: results are kept if export fails
    start(samePlan(test), history);
  };

  /** Next level: results are kept until the last level is finished; the last level => new round */
  const goNext = async (plan: TestPlan): Promise<void> => {
    const current: LevelResult = { level: test.level, fields: test.fields, results };
    if (test.level < MAX_LEVEL) {
      start(plan, [...history, current]);
      return;
    }
    !isExported && sum.done > 0 && (await save([...history, current])); // admin can skip the last level before it's finished
    start(plan, []);
  };

  /** Admin-only: fill all inputs with simulated mistakes to test the app without typing; every click overrides previous results */
  const fill = (): void => {
    const filled = simulateResults(test.tasks, test.fields);
    setTest(remountTest(test));
    setResults(filled);
    setInitials(filled);
  };

  return (
    <>
      <div className={styles.toolbar}>
        <h1>Разкриване на скоби</h1>
        <span className={styles.level} w-tooltip="С всяко ниво задачите стават по-трудни">
          Ниво {test.level} от {MAX_LEVEL}
        </span>
        {isAdmin ? (
          <>
            <button type="button" onClick={fill} w-tooltip="Fill all inputs with simulated mistakes">
              Test
            </button>
            <button type="button" className={styles.buttonRefresh} onClick={refresh} disabled={isExporting}>
              Refresh
            </button>
          </>
        ) : null}
      </div>
      <div className={styles.table} data-admin={isAdmin || undefined}>
        <div className={cx(styles.row, styles.header)}>
          <div>Уравнение</div>
          {allFields.map((f) => (
            <div key={f}>{fieldTitles[f]}</div>
          ))}
          <div>Време и грешки</div>
        </div>
        <MathRow task={EXAMPLE_TASK} fields={test.fields} isExample />
        {test.tasks.map((t, i) => (
          <MathRow
            key={`${test.id}_${t.text}`} // texts are unique per test
            task={t}
            fields={test.fields}
            initial={initials[i]}
            onChange={onRowChange[i]}
            isAdmin={isAdmin}
          />
        ))}
        <div className={cx(styles.row, styles.summary)} data-summary>
          <div>Общо</div>
          <div>Време: {formatDuration(sum.spentMs)}</div>
          <div>
            <span className={styles.valid} w-tooltip="Решени без грешки">
              {sum.withoutMistakes}
            </span>
            {" / "}
            <span className={styles.invalid} w-tooltip="Редове с грешки">
              {sum.withMistakes}
            </span>
            {" / "}
            <span className={styles.fixed} w-tooltip="Общо грешки">
              {sum.mistakes}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.buttonNextLevel}
          onClick={() => nextPlan && goNext(nextPlan)}
          disabled={!canNext}
          w-tooltip={nextPlan ? describePlan(test, nextPlan) : "Достъпно само когато всичко е вярно"}
        >
          Нов тест
        </button>
      </div>
    </>
  );
}
