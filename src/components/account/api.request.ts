/* eslint-disable import/prefer-default-export */
import http from "@/helpers/httpService";
import api from "@/api.endpoints";
import { IBaseUser, ILoginModel } from "./api.types";

export async function apiGetCurrentUser(): Promise<IBaseUser> {
  const res = await http.get<IBaseUser>(api.accCurrent);
  return res.data;
}

export async function apiLogin(m: ILoginModel): Promise<IBaseUser> {
  const res = await http.post<IBaseUser>(api.accSignIn, m);
  return res.data;
}
