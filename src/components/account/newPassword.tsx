import PasswordControl from "@/elements/controls/password";
import NumControl from "@/elements/controls/number";
import { IForgotPassword, INewPasswordModel, IUpdatePassword } from "./api.types";

interface Props {
  isForgot?: boolean;
}

export default function NewPassword({ isForgot }: Props): React.JSX.Element {
  return (
    <>
      {isForgot ? (
        <NumControl
          name={nameof<IForgotPassword>("validationCode")}
          vls={{ required: true }}
          mask="000000"
          maskholder="xxxxxx"
          autoComplete="off"
        />
      ) : (
        <PasswordControl name={nameof<IUpdatePassword>("currentPassword")} vls={{ required: true }} autoComplete="off" />
      )}
      <PasswordControl
        name={nameof<INewPasswordModel>("password")}
        vls={{ required: true }}
        isStrict
        validationShowAll
        autoComplete="new-password"
      />
      <PasswordControl
        name={nameof<INewPasswordModel>("passwordConfirm")}
        vls={{ required: true, confirm: true }}
        autoComplete="new-password"
      />
    </>
  );
}
