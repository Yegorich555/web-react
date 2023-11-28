import Form from "@/elements/form";
import PasswordControl from "@/elements/controls/password";
import TextControl from "@/elements/controls/text";
import { apiLogin } from "./api.request";
import { ILoginModel } from "./api.types";
//
import styles from "./account.scss";

export default function Login() {
  return (
    <Form onSubmit={(e) => apiLogin(e.detail.model as ILoginModel)} className={styles.hideReqMark} autoComplete>
      <h2>Login</h2>
      <TextControl name={nameof<ILoginModel>("email")} vls={{ required: true, email: true }} />
      <PasswordControl name={nameof<ILoginModel>("password")} vls={{ required: true }} />
    </Form>
  );
}
