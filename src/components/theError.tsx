import { useState } from "react";
import stylesShared from "../styles/shared.m.scss";
import styles from "./theError.scss";

interface ITheErrorProps {
  errorMsg?: string;
  onClosed?: () => void;
}

export default function TheError(props: ITheErrorProps): JSX.Element {
  const [closed, setClosed] = useState(false);

  function onCloseClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();

    setClosed(true);
    setTimeout(() => {
      props.onClosed?.call(props);
    }, 500);
  }

  return (
    <div className={cx(styles.theError, closed && styles.closing)} role="alert">
      {props.errorMsg}
      <button className={stylesShared.wupBtnIcon} type="button" aria-label="close error" onClick={onCloseClick} />
    </div>
  );
}
