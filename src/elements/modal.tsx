import { WUPModalElement } from "web-ui-pack";
import { createPortal } from "react-dom";
import BaseWUP from "./baseWUP";

WUPModalElement.$use(); // register control in the browser
WUPModalElement.$defaults.placement = "top";

interface Props extends React.PropsWithChildren<Partial<WUP.Modal.Options>> {
  className?: string;
  onClose: WUPModalElement["$onClose"];
}

export default class Modal extends BaseWUP<WUPModalElement, Props> {
  /* Apply React props for $options */
  updateOptions(nextProps: Props, isInit: boolean): void {
    super.updateOptions(nextProps, isInit);
    this.domEl.$onClose = nextProps.onClose;
  }

  goRender(props: Record<string, unknown>): React.JSX.Element {
    // https://react.dev/reference/react-dom/createPortal#reference
    return createPortal(<wup-modal {...props}>{this.props.children}</wup-modal>, document.body);
  }
}
