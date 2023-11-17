import "./styles";
import "./helpers/classNames";
import "ytech-js-extensions/lib/date"; // extend default Date type
import "ytech-js-extensions/lib/array"; // extend default Array type

import { Component, ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import TheHeader from "./components/theHeader";
import Login from "./components/account/login";
import TheError from "./components/theError";

interface Props {}
interface State {}

class AppContainer extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
    // test class-dead-code
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("got err", { error, errorInfo });
  }

  render() {
    return (
      <>
        <TheError errorMsg="This is test message" />
        <TheHeader />
        <Login />
      </>
    );
  }
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
