import http from "@/helpers/httpService";
import api from "@/api.endpoints";
import setupAccess from "@/setupAccess";
import { IBaseUser, IForgotModel, IForgotPassword, ILoginModel, IUpdatePassword } from "./api.types";

export async function apiGetCurrentUser(): Promise<IBaseUser | null> {
  const res = await http.get<IBaseUser>(api.accCurrent);
  res.data && setupAccess(res.data);
  return res.data;
}

export async function apiLogin(m: ILoginModel): Promise<IBaseUser> {
  const res = await http.post<IBaseUser>(api.accSignIn, m);
  res.data && setupAccess(res.data);
  return res.data;
}

export async function apiLogout(m: ILoginModel): Promise<IBaseUser> {
  setupAccess.dispose();
  http.cancelAll();
  const res = await http.post<IBaseUser>(api.accSignOut, m);
  return res.data;
}

export async function apiForgot(m: IForgotModel): Promise<{ success: boolean }> {
  const res = await http.post<{ success: boolean }>(api.accForgotPwd, m);
  return res.data;
}

export async function apiResetPwd(m: IForgotPassword): Promise<{ success: boolean }> {
  const res = await http.post<{ success: boolean }>(api.accResetPwd, m);
  return res.data;
}

export function apiChangePwd(m: IUpdatePassword): Promise<{ success: boolean }> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  throw new Error("Coming soon", { m });
}
