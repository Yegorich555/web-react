import { WUPFormElement } from "web-ui-pack";
// import styles from "./form.scss";

WUPFormElement.$use(); // register control in the browser
// set defaults
WUPFormElement.$defaults.autoStore = true;

interface Props extends React.PropsWithChildren<Partial<WUP.Form.Options>> {
  className?: string;
  initModel?: WUPFormElement["$initModel"];
  model?: WUPFormElement["$model"];
  /* eslint-disable-next-line react/no-unused-prop-types  */
  onSubmit?: WUPFormElement["$onSubmit"]; // somehow linter is wrong here
}

export default class Form extends React.Component<Props> {
  domEl = {} as WUPFormElement;

  /* Called every time when DOM element is appended to document */
  componentDidMount(): void {
    this.updateOptions(this.props, true);
  }

  /* Called every time when properties are changed */
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    const isChanged = this.props !== nextProps;
    isChanged && this.updateOptions(nextProps, false);
    // update render only if className is changed otherwise apply props directly for options
    return this.props.className !== nextProps.className;
  }

  /* Apply React props for $options */
  updateOptions(nextProps: Props, isInit: boolean): void {
    Object.assign(this.domEl.$options, nextProps, { children: null });
    this.domEl.$onSubmit = nextProps.onSubmit;
    if (isInit || nextProps.model !== this.props.model) {
      this.domEl.$model = nextProps.model || {}; // update only if value changed
    }
    if (isInit || nextProps.initModel !== this.props.initModel) {
      this.domEl.$initModel = nextProps.initModel; // update only if value changed
    }
  }

  /* Called on init and every time when shouldComponentUpdate returns `true`*/
  render(): React.ReactNode {
    return (
      <wup-form
        // class={`${styles.form} ${this.props.className ?? ""}`.trimEnd()}
        class={this.props.className} // extend defaults in mains.css
        ref={(el) => {
          this.domEl = el || this.domEl || ({} as unknown);
        }}
      >
        {this.props.children}
        <button type="submit">Submit</button>
      </wup-form>
    );
  }
}
