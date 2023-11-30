import Form, { FormProps } from "@/elements/form";
import TextControl from "@/elements/controls/text";
import { useState } from "react";
import Btn from "@/elements/buttons/btn";
import Btn2 from "@/elements/buttons/btn2";
import BtnGroup from "@/elements/buttons/btnGroup";
import { apiForgot, apiResetPwd } from "./api.request";
import { IForgotModel, ILoginModel } from "./api.types";
import NewPassword from "./newPassword";

interface Props {
  shared: FormProps;
  email: string | undefined;
  onBack: () => void;
}

export default function ForgotPassword({ onBack, email, shared }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [lastEmail, setEmail] = useState(email);

  const foot = (
    <BtnGroup>
      {onBack && <Btn2 onClick={onBack}>Back To Login</Btn2>}
      <Btn isSubmit>{step === 1 ? __ln("Send Email") : __ln("Submit")}</Btn>
    </BtnGroup>
  );

  if (step === 1) {
    return (
      <Form
        {...shared}
        onSubmit={(m) =>
          apiForgot(m).then(() => {
            setEmail((m as IForgotModel).email);
            setStep(2);
          })
        }
      >
        <h2>Reset Password</h2>
        <p>We will send a verification code then you can reset your password</p>
        <TextControl
          autoComplete="username"
          name={nameof<ILoginModel>("email")}
          label="Your email address"
          vls={{ required: true, email: true }}
          initValue={lastEmail}
        />
        {foot}
      </Form>
    );
  }

  // if (step === 2) {
  return (
    // WARN: if browser saves validationCode + password then need to use split-single view where only single validationCode exists then user can go & point new password
    <Form {...shared} onSubmit={(m) => apiResetPwd({ ...m, email: lastEmail }).then(onBack)} autoComplete={false}>
      <h2>New Password</h2>
      {/* WARN: the input is required to allow browser save new password with previously pointed email */}
      <input type="text" autoComplete="username" value={lastEmail} hidden readOnly />
      <NewPassword isForgot />
      {foot}
    </Form>
  );
  // }
}
