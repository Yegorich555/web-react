export const enum UserRoles {
  isUser = 1,
  /** Super Admin */
  sa,
}

export interface IBaseUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRoles;
}

export interface IForgotModel {
  email: string;
}

export interface IForgotPassword {
  email: string;
  validationCode: number;
  password: string;
  passwordConfirm: string;
}

export interface IUpdatePassword {
  currentPassword: string;
  password: string;
  passwordConfirm: string;
}

export type INewPasswordModel = IForgotPassword | IUpdatePassword;

export interface ILoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}
