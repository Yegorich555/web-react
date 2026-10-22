import "./styles";
import "./helpers/classNames";
import "./helpers/nameof";
import "./helpers/lang";
import "./helpers/myUser"; // defines window.myUser
import "./components/theError"; // shows runtime errors & unhandled rejections; WARN: import it before rendering

import ReactDOM from "react-dom/client";
import { WUPPopupElement } from "web-ui-pack";
import ErrorBoundary from "./elements/errorBoundary";
import SchoolMathTest from "./components/schoolMathTest";
import { loadState } from "./components/schoolMathTest/storage";
import * as styles from "./components/schoolMathTest/schoolMathTest.m.scss";

// UI_VERSION is injected by webpack.DefinePlugin (index.html isn't template anymore)
(window as unknown as { app_uiVersion?: string }).app_uiVersion = process.env.UI_VERSION;
console.log("UI version", process.env.UI_VERSION);

WUPPopupElement.$useTooltip(); // show tooltip for every element with attr [w-tooltip]

// restore previous state so user can continue after page reload
loadState().then((saved) =>
  ReactDOM.createRoot(document.getElementById("app")!).render(
    <ErrorBoundary>
      <main className={styles.page}>
        <SchoolMathTest saved={saved} />
      </main>
    </ErrorBoundary>,
  ),
);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
