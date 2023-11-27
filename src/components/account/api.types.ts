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

export interface ILoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}
