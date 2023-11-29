import Form, { FormProps } from "@/elements/form";
import TextControl from "@/elements/controls/text";
import { useState } from "react";
import Btn from "@/elements/buttons/btn";
import Btn2 from "@/elements/buttons/btn2";
import BtnGroup from "@/elements/buttons/btnGroup";
import { apiChangePwd, apiForgot } from "./api.request";
import { ILoginModel } from "./api.types";
//
import styles from "./account.scss";
import NewPassword from "./newPassword";

interface Props {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const shared: FormProps = {
    className: styles.authForm,
    autoStore: false,
    // autoFocus: true,
  };

  const foot = (
    <BtnGroup>
      {onBack && <Btn2 onClick={onBack}>Back To Login</Btn2>}
      <Btn isSubmit>{step === 1 ? __ln("Send Email") : __ln("Submit")}</Btn>
    </BtnGroup>
  );

  if (step === 1) {
    return (
      <Form {...shared} onSubmit={(m) => apiForgot(m).then(() => setStep(2))}>
        <h2>Reset Password</h2>
        <p>We will send a verification code then you can reset your password</p>
        {/* todo reuse prev value here */}
        <TextControl autoComplete name={nameof<ILoginModel>("email")} label="Your email address" vls={{ required: true, email: true }} />
        {foot}
      </Form>
    );
  }

  // if (step === 2) {
  // todo issue: submit here saves password into Google Password Manager with userName: verification code
  return (
    <Form {...shared} onSubmit={apiChangePwd} autoComplete={false}>
      <h2>New Password</h2>
      <NewPassword isForgot />
      {foot}
    </Form>
  );
  // }
}
