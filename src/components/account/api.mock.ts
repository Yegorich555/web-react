/* eslint-disable import/no-extraneous-dependencies */
/* This file contains api-mock-response to help you develop UI without real API side */
import webpackMockServer from "webpack-mock-server";
import api from "@/api.endpoints";
import { IBaseUser, IForgotPassword, ILoginModel, UserRoles } from "./api.types";

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
  app.post(api.accForgotPwd, (req, res) => res.json({ success: !!req.body.email }));
  app.post(api.accResetPwd, (req, res) => {
    const m = req.body as IForgotPassword;
    const isOk = m.email && m.validationCode && m.password && m.passwordConfirm;
    if (!isOk) {
      res.status(400).json({ message: "Something missed" });
    } else {
      res.json({ success: true });
    }
  });
});
