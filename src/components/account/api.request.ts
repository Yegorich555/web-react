/* eslint-disable import/prefer-default-export */
import http from "@/helpers/httpService";
import api from "@/api.endpoints";
import setupAccess from "@/setupAccess";
import { IBaseUser, ILoginModel } from "./api.types";

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
  const res = await http.post<IBaseUser>(api.accSignOut, m);
  return res.data;
}
