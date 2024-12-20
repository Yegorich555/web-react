import Btn, { BtnProps } from "./btn";
import * as styles from "./btn2.scss";

/** Secondary button */
export default function Btn2(props: BtnProps): React.JSX.Element {
  return <Btn {...props} className={cx(styles.btn2, props.className)} />;
}
