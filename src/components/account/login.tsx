import Form from "@/elements/form";
import PasswordControl from "@/elements/controls/password";
import TextControl from "@/elements/controls/text";
import CheckControl from "@/elements/controls/check";
import { useState } from "react";
import { apiLogin } from "./api.request";
import { ILoginModel } from "./api.types";
//
import styles from "./account.scss";

// todo animated-swap-carousel here so user can see content changes
export default function Login() {
  const [isForgot, setShowForgot] = useState(false);

  if (isForgot) {
    return (
      <Form onSubmit={(e) => apiLogin(e.detail.model as ILoginModel)} className={styles.authForm} autoComplete autoStore={false}>
        <h2>Forgot password</h2>
        <p>We will send a verification code then you can reset your password</p>
        <TextControl name={nameof<ILoginModel>("email")} label="Your email address" vls={{ required: true, email: true }} />
        <div className={styles.inlineGroup}>
          <button type="button">Back To Login</button>
          <button type="submit">Send Email</button>
        </div>

        {/* todo */}
      </Form>
    );
  }

  return (
    <Form onSubmit={(e) => apiLogin(e.detail.model as ILoginModel)} className={styles.authForm} autoComplete autoStore={false}>
      <h2>Login</h2>
      <TextControl name={nameof<ILoginModel>("email")} vls={{ required: true, email: true }} />
      <PasswordControl name={nameof<ILoginModel>("password")} vls={{ required: true }} />
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
