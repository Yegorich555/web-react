/* eslint-disable @typescript-eslint/no-explicit-any */
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import BaseWUP from "../baseWUP";

export interface BaseControlProps /* extends Pick<Partial<WUP.BaseControl.Options>, "name" | "label"> */ {
  className?: string;
  initValue?: any;
  value?: any;
  onChange?: WUPBaseControl["$onChange"];
}

export default abstract class BaseControl<
  T extends WUPBaseControl = WUPBaseControl,
  P extends BaseControlProps = BaseControlProps,
> extends BaseWUP<T, P> {
  override updateOptions(nextProps: P, isInit: boolean): void {
    super.updateOptions(nextProps, isInit);

    this.domEl.$onChange = nextProps.onChange;
    if (isInit || nextProps.value !== this.props.value) {
      this.domEl.$value = nextProps.value; // update only if value changed
    }
    if (isInit || nextProps.initValue !== this.props.initValue) {
      this.domEl.$initValue = nextProps.initValue; // update only if value changed
    }
  }
}
