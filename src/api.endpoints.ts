/** Object with all api routes */
const api = {
  accCurrent: "/api/account/currentUser",
  accSignIn: "/api/account/signIn",
  // accSignUp: "/api/account/signUp", // todo implement
  accSignOut: "/api/account/signOut",
  // accRemove: "/api/account/remove",
  /** Send email with instructions to user */
  accForgotPwd: "/api/account/forgotPassword",
  /** Reset password to a new one */
  accResetPwd: "/api/account/resetPassword",
  /** Set new password instead of previous */
  accChangePwd: "/api/account/changePassword",
};
export default api;
