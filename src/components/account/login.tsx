import { useEffect } from "react";
import Form from "@/elements/form";
import PasswordControl from "@/elements/controls/password";
import TextControl from "@/elements/controls/text";
import { apiGetCurrentUser, apiLogin } from "./api.request";
import { ILoginModel } from "./api.types";

export default function Login() {
  useEffect(() => {
    apiGetCurrentUser().then((c) => console.warn(c));
  }, []);

  return (
    <Form onSubmit={(e) => apiLogin(e.detail.model as ILoginModel)}>
      {/* todo wupLn reuse for multi-lang */}
      <h2>Login</h2>
      <TextControl name={nameof<ILoginModel>("email")} validations={{ required: true, email: true }} />
      <PasswordControl name={nameof<ILoginModel>("password")} isStrict validations={{ required: true }} validationShowAll />
    </Form>
  );
}
