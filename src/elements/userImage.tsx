import { useState } from "react";
import styles from "./userImage.scss";

interface Props {
  firstName?: string;
  lastName?: string;
  imgUrl?: string;
}
export default function UserImage(p: Props): JSX.Element {
  const [isError, setIsError] = useState(false);
  return (
    <div className={styles.userImg}>
      {p.imgUrl && !isError ? (
        <img src={p.imgUrl} alt="avatar" onError={() => setIsError(true)} loading="lazy" />
      ) : (
        `${(p.firstName || "N")[0]}${(p.lastName || "N")[0]}`.trim()
      )}
    </div>
  );
}
