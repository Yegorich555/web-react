/* eslint-disable import/no-extraneous-dependencies */
/* This file contains api-mock-response to help you develop UI without real API side */
import webpackMockServer from "webpack-mock-server";
import api from "@/api.endpoints";
import { IBaseUser, ILoginModel, UserRoles } from "./api.types";

const mockUser: IBaseUser = {
  id: 1,
  firstName: "Will",
  lastName: "Smith",
  email: "will.smith@mailbox.com",
  role: UserRoles.sa,
};
let rememberMe = false;

export default webpackMockServer.add((app) => {
  app.get(api.accCurrent, (_, res) => res.json(rememberMe ? mockUser : null));
  app.post(api.accSignIn, (req, res) => {
    const body = req.body as ILoginModel;
    rememberMe = !!body.rememberMe;
    res.json({ ...mockUser, email: body.email });
  });
  app.post(api.accSignOut, (_, res) => res.json(null));
  app.post(api.accForgotPwd, (_, res) => res.json({ success: true }));
  app.post(api.accChangePwd, (_, res) => res.json({ success: true }));
});
