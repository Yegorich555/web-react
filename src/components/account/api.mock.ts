/* eslint-disable import/no-extraneous-dependencies */
/* This file contains api-mock-response to help you develop UI without real API side */
import webpackMockServer from "webpack-mock-server";
import api from "@/api.endpoints";
import { IBaseUser } from "./api.types";

const mockUser: IBaseUser = {
  id: 1,
  firstName: "Will",
  lastName: "Smith",
  email: "will.smith@mailbox.com",
};

export default webpackMockServer.add((app) => {
  app.get(api.accCurrent, (_, res) => res.json(mockUser));
});
