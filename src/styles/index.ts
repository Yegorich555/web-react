import { useBuiltinStyle, WUPcssBtnIcon } from "web-ui-pack/styles";
import "./main.scss";
import styles from "./shared.m.scss";

useBuiltinStyle(WUPcssBtnIcon(`.${styles.wupBtnIcon}`)); // re-use styles from package