import "./styles";
import "./helpers/classNames";
import "./helpers/nameof";
import "./helpers/lang";
import "ytech-js-extensions/lib/date"; // extend default Date type
import "ytech-js-extensions/lib/array"; // extend default Array type

import { Component } from "react";
import ReactDOM from "react-dom/client";
import TheHeader from "./components/theHeader";
import Login from "./components/account/login";
import "./components/theError";
import ErrorBoundary from "./elements/errorBoundary";
import { apiGetCurrentUser } from "./components/account/api.request";
import { IBaseUser } from "./components/account/api.types";
import Dashboard from "./components/dashboard";
import setupAccess from "./setupAccess";

interface Props {}
interface State {
  user?: IBaseUser | null;
}

class AppContainer extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  componentDidMount(): void {
    apiGetCurrentUser();
    setupAccess.onChange = (user) => this.setState({ user });
  }

  render() {
    // todo add logout NOW !!!!
    return (
      <ErrorBoundary>
        <TheHeader />
        {!this.state.user ? <Login /> : <Dashboard />}
      </ErrorBoundary>
    );
    // todo add routing + logic trigger
  }
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
