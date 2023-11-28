import { WUPCheckControl } from "web-ui-pack";
import BaseControl, { BaseControlProps } from "./baseControl";
import styles from "./check.scss";

WUPCheckControl.$use(); // register control in the browser
WUPCheckControl.$defaults.reverse = true;

interface Props extends BaseControlProps<boolean, WUPCheckControl, WUP.Check.Options> {}

export default class CheckControl extends BaseControl<WUPCheckControl, Props> {
  goRender(props: Record<string, unknown>): JSX.Element {
    return <wup-check {...props} class={cx(styles.check, props.className as string)} />;
  }
}
