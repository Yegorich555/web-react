import { WUPNumberControl } from "web-ui-pack";
import BaseControl, { BaseControlProps } from "./baseControl";
// import styles from "./text.scss";

WUPNumberControl.$use(); // register control in the browser
// WUPNumControl.$defaults.clearButton = false;

interface Props extends BaseControlProps<number, WUPNumberControl, WUP.Number.Options> {}

export default class NumControl extends BaseControl<WUPNumberControl, Props> {
  goRender(props: Record<string, unknown>): JSX.Element {
    return <wup-num {...props} />;
  }
}
