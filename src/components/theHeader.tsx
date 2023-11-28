import imgLogo from "images/logo.png"; // start-path is 'images/' because we have an alias 'images' in webpack.common.js
import UserImage from "@/elements/userImage";
import styles from "./theHeader.scss";

export default function TheHeader() {
  return (
    <div className={styles.header}>
      <h1>
        <img src={imgLogo} alt="logo" />
        Web React
      </h1>
      <span>
        Login
        <UserImage {...$u} />
      </span>
    </div>
  );
}
