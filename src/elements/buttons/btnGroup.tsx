import * as styles from "./btnGroup.scss";

/** DIV with inline style for buttons */
export default function BtnGroup(p: React.PropsWithChildren): React.JSX.Element {
  return <div className={styles.btnGroup}>{p.children}</div>;
}
