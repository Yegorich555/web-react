import { WUPTextControl } from "web-ui-pack";
import BaseControl, { BaseControlProps } from "./baseControl";
// import styles from "./text.scss";

WUPTextControl.$use(); // register control in the browser
// WUPTextControl.$defaults.clearButton = false;

interface Props extends Partial<Omit<WUP.Text.Options, "validationRules">>, BaseControlProps {
  initValue?: string;
  value?: string;
  onChange?: WUPTextControl["$onChange"];
}

export default class TextControl extends BaseControl<WUPTextControl, Props> {
  goRender(props: Record<string, unknown>): JSX.Element {
    return <wup-text {...props} />;
  }
}
