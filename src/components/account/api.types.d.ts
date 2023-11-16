export interface IBaseUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ILoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}
