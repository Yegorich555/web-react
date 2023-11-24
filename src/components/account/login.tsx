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
      <h2>Login</h2>
      <TextControl name={nameof<ILoginModel>("email")} vls={{ required: true, email: true }} />
      <PasswordControl name={nameof<ILoginModel>("password")} vls={{ required: true }} isStrict validationShowAll />
    </Form>
  );
}
