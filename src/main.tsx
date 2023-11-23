import "./styles";
import "./helpers/classNames";
import "./helpers/nameof";
import "ytech-js-extensions/lib/date"; // extend default Date type
import "ytech-js-extensions/lib/array"; // extend default Array type

import { Component } from "react";
import ReactDOM from "react-dom/client";
import TheHeader from "./components/theHeader";
import Login from "./components/account/login";
import TheError from "./components/theError";
import ErrorBoundary from "./elements/errorBoundary";

interface Props {}
interface State {}

class AppContainer extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <ErrorBoundary>
        <TheError />
        <TheHeader />
        <Login />
      </ErrorBoundary>
    );
  }
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
