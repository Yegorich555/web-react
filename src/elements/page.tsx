interface Props {
  title: string;
}
export default function Page(props: React.PropsWithChildren<Props>): React.JSX.Element {
  return (
    <>
      <h2>{props.title}</h2>
      {props.children}
    </>
  );
}
