import stylesShared from "../styles/shared.m.scss";
import * as styles from "./theError.scss";

// WARN: important to handle error before component is mounted

let el: HTMLElement | undefined;
const showError = (msg: string) => {
  el?.remove();
  el = document.createElement("div");
  el.className = styles.theError;
  el.setAttribute("role", "alert");
  el.append(msg);
  const btn = el.appendChild(document.createElement("button"));
  btn.className = stylesShared.btnIcon;
  btn.type = "button";
  btn.setAttribute("aria-label", "close error");
  btn.onclick = () => {
    if (el) {
      el.classList.add(styles.closing);
      setTimeout(() => el?.remove(), 400);
    }
  };
  document.body.appendChild(el);
};

window.onerror = (_e, _filename, _line, _col, err) => {
  showError(err?.message || "");
  // return true;
};
window.onunhandledrejection = (e) => {
  showError(e.reason.toString());
  return true; // prevent default error-report
};

// WARN: The Component isn't rendered in React if something wrong with another render
// export default function TheError(): React.JSX.Element | null {
//   const [closed, setClosed] = useState(false);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     showError = setErr;
//   }, []);

//   if (!err) {
//     return null;
//   }
//   function onCloseClick(e: React.MouseEvent<HTMLButtonElement>) {
//     e.stopPropagation();
//     setClosed(true);
//   }

//   return (
//     <div className={cx(styles.theError, closed && styles.closing)} role="alert">
//       {err}
//       <button className={stylesShared.btnIcon} type="button" aria-label="close error" onClick={onCloseClick} />
//     </div>
//   );
// }
