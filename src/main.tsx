import "./styles";
import "./helpers/classNames";
import "./helpers/nameof";
import "./helpers/lang";
import "ytech-js-extensions/lib/date"; // extend default Date type
import "ytech-js-extensions/lib/array"; // extend default Array type

import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TheHeader from "./components/theHeader";
import "./components/theError";
import ErrorBoundary from "./elements/errorBoundary";
import { apiGetCurrentUser } from "./components/account/api.request";
import { IBaseUser } from "./components/account/api.types";
import setupAccess from "./setupAccess";
import routes from "./setupRoutes";
import Page from "./elements/page";
import Login from "./components/account/login";

function AppContainer(): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_user, setUser] = useState<IBaseUser | null>(null);

  useEffect(() => {
    setupAccess.onChange = setUser;
    apiGetCurrentUser();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TheHeader />
        <Login />
        <main>
          <Routes>
            {Object.keys(routes).map((k) => {
              const r = routes[k as keyof typeof routes];
              return (
                <Route
                  key={k}
                  path={r.path}
                  element={
                    <Page title={r.title}>
                      <r.component />
                    </Page>
                  }
                  ErrorBoundary={ErrorBoundary}
                />
              );
            })}
            <Route path="*" element={<Navigate to={routes.home.path} />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
