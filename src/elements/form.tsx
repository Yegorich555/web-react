import { WUPFormElement } from "web-ui-pack";
import BaseWUP from "./baseWUP";

WUPFormElement.$use(); // register control in the browser
WUPFormElement.$defaults.autoStore = true;
// WUPFormElement.$defaults.autoFocus = true;

export interface FormProps extends React.PropsWithChildren<Partial<WUP.Form.Options>> {
  className?: string;
  initModel?: WUPFormElement["$initModel"];
  model?: WUPFormElement["$model"];
  onSubmit?: WUPFormElement["$onSubmit"];
}

export default class Form extends BaseWUP<WUPFormElement, FormProps> {
  /* Apply React props for $options */
  updateOptions(nextProps: FormProps, isInit: boolean): void {
    super.updateOptions(nextProps, isInit);

    this.domEl.$onSubmit = (e) => nextProps.onSubmit?.call(this.domEl, e);
    if (isInit || nextProps.model !== this.props.model) {
      this.domEl.$model = nextProps.model!; // update only if value changed
    }
    if (isInit || nextProps.initModel !== this.props.initModel) {
      this.domEl.$initModel = nextProps.initModel; // update only if value changed
    }
  }

  goRender(props: Record<string, unknown>): JSX.Element {
    return (
      <wup-form {...props}>
        {this.props.children}
        {/* <button type="submit">Submit</button> */}
      </wup-form>
    );
  }
}
