import { Component } from "react";

interface Props extends React.PropsWithChildren {}
interface State {
  err?: string;
}
/** https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { err: true };
  }

  componentDidCatch(err: Error): void {
    // console.error("got err", { error: err, errorInfo: info });
    console.error(err);
  }

  render() {
    if (this.state.err) {
      return <h2 style={{ textAlign: "center" }}>Something went wrong</h2>;
    }

    return this.props.children;
  }
}
