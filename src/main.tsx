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
    // todo trigger here every time on user change because routes depends on it
    apiGetCurrentUser().then((user) => {
      this.setState({ user });
    });
  }

  render() {
    // todo add routing + logic trigger
    return (
      <ErrorBoundary>
        <TheHeader />
        {!this.state.user ? <Login /> : <Dashboard />}
      </ErrorBoundary>
    );
  }
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
