import Form, { FormProps } from "@/elements/form";
import PasswordControl from "@/elements/controls/password";
import TextControl from "@/elements/controls/text";
import CheckControl from "@/elements/controls/check";
import { useState } from "react";
import { apiLogin } from "./api.request";
import { ILoginModel } from "./api.types";
import ForgotPassword from "./forgot";
//
import * as styles from "./account.scss";

// todo animated-swap-carousel here so user can see content changes
export default function Login() {
  const [isForgot, setShowForgot] = useState(false);
  const [myEmail, setMyEmail] = useState<string>();
  const shared: FormProps = {
    className: styles.authForm,
    autoStore: false,
    // autoFocus: true,
  };

  if (isForgot) {
    return <ForgotPassword shared={shared} onBack={() => setShowForgot(false)} email={myEmail} />;
  }

  return (
    <Form {...shared} onSubmit={apiLogin}>
      <h2>Login</h2>
      <TextControl
        name={nameof<ILoginModel>("email")}
        vls={{ required: true, email: true }}
        autoComplete="username"
        onChange={(_, c) => setMyEmail(c.$value)}
      />
      <PasswordControl name={nameof<ILoginModel>("password")} vls={{ required: true }} autoComplete="current-password" />

      {/*  todo add 2FA here */}
      <div className={styles.inlineGroup}>
        <CheckControl name={nameof<ILoginModel>("rememberMe")} />
        <button type="button" className={styles.btnForgot} onClick={() => setShowForgot(true)}>
          Forgot password?
        </button>
      </div>
      <button type="submit">Submit</button>
    </Form>
  );
}
