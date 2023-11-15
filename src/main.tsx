import "./styles/main.scss";

import { Component, ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import TheHeader from "./components/theHeader";
import Login from "./components/account/login";

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
        <TheHeader />
        <Login />
      </>
    );
  }
}

ReactDOM.createRoot(document.getElementById("app")!).render(<AppContainer />);
// React + TS: https://github.com/typescript-cheatsheets/react#reacttypescript-cheatsheets
