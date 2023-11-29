import WUPSpinElement /* , { spinUseRoller } */ from "web-ui-pack/spinElement";
import BaseWUP from "./baseWUP";

WUPSpinElement.$use();
// spinUseTwinDualRing(WUPSpinElement);

interface Props extends Partial<WUP.Spin.Options> {}

/** Details here: https://yegorich555.github.io/web-ui-pack/spin */
export default class Spinner extends BaseWUP<WUPSpinElement, Props> {
  goRender(props: Record<string, unknown>): JSX.Element {
    return <wup-spin {...props} />;
  }
}
