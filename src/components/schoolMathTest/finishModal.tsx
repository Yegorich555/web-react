import Modal from "@/elements/modal";
import { formatDuration, Summary } from "./summary";
import { MAX_LEVEL } from "./testPlan";
import * as styles from "./schoolMathTest.m.scss";

interface Props {
  /** Summary of all levels of the round */
  sum: Summary;
  /** The last level of the round: less than MAX_LEVEL if it's solved without mistakes */
  level: number;
  onClose: () => void;
}

/** Returns grade used for colors (green/orange): score is % of rows solved without mistakes */
const getGrade = (score: number): string => (score >= 75 ? "good" : "low");

/** Congratulations when the round is finished: the last level is finished or every row is solved without mistakes */
export default function FinishModal({ sum, level, onClose }: Props): React.JSX.Element {
  const score = sum.total ? Math.round((sum.withoutMistakes * 100) / sum.total) : 0;
  return (
    <Modal onClose={onClose} placement="center" confirmUnsaved={false}>
      <div className={styles.finish} data-finish data-grade={getGrade(score)}>
        <div className={styles.finishIcon} aria-hidden>
          🏆
        </div>
        <h2>Поздравления!</h2>
        <p>{level < MAX_LEVEL ? `Решихте ниво ${level} без нито една грешка` : "Справихте се с всички нива"}</p>
        <dl className={styles.finishStats}>
          <div>
            <dt>Общо време</dt>
            <dd data-spent>{formatDuration(sum.spentMs)}</dd>
          </div>
          <div>
            <dt>Вашият резултат</dt>
            <dd data-score>{score} / 100</dd>
          </div>
        </dl>
        <div className={styles.finishBar} w-tooltip="Решени без грешки">
          <div style={{ width: `${score}%` }} />
        </div>
        <button type="button" onClick={onClose}>
          Добре
        </button>
      </div>
    </Modal>
  );
}
