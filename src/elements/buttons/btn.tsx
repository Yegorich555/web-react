import Spinner from "../spinner";

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  isSubmit?: boolean;
}

/** Primary button */
export default function Button(props: BtnProps): JSX.Element {
  const p: BtnProps = {
    ...props,
    type: props.isSubmit ? "submit" : (props.type as "button") || "button",
  };
  delete p.isSubmit; // otherwise React complaints here
  delete p.isPending;
  return (
    // eslint-disable-next-line react/button-has-type
    <button {...p}>
      {props.children}
      {p.isPending ? <Spinner fit inline={false} overflowFade /> : null}
    </button>
  );
}
