import { useEffect, useState } from "react";
import stylesShared from "../styles/shared.m.scss";
import styles from "./theError.scss";

// WARN: important to handle error before component is mounted
let showError = (msg: string) => console.error(msg);

window.onerror = (_e, _filename, _line, _col, err) => {
  showError(err?.message || "");
  // return true;
};
window.onunhandledrejection = (e) => {
  showError(e.reason.toString());
  return true; // prevent default error-report
};

export default function TheError(): JSX.Element | null {
  const [closed, setClosed] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    showError = setErr;
  }, []);

  if (!err) {
    return null;
  }

  function onCloseClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();

    setClosed(true);
  }

  return (
    <div className={cx(styles.theError, closed && styles.closing)} role="alert">
      {err}
      <button className={stylesShared.wupBtnIcon} type="button" aria-label="close error" onClick={onCloseClick} />
    </div>
  );
}
