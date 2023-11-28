import imgLogo from "images/logo.png"; // start-path is 'images/' because we have an alias 'images' in webpack.common.js
import UserImage from "@/elements/userImage";
import { useState } from "react";
import Modal from "@/elements/modal";
import styles from "./theHeader.scss";
import Login from "./account/login";

export default function TheHeader() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className={styles.header}>
      <h1>
        <img src={imgLogo} alt="logo" />
        Web React
      </h1>
      <button className={styles.btnUser} type="button" aria-label="login" onClick={() => setShowLogin(true)}>
        <UserImage {...$u} />
      </button>
      {showLogin ? (
        <Modal onClose={() => setShowLogin(false)} confirmUnsaved={false}>
          <Login />
        </Modal>
      ) : null}
    </div>
  );
}
