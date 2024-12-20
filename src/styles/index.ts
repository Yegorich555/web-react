import { useBuiltinStyle, WUPcssBtnIcon, WUPcssButton, WUPcssScrollSmall } from "web-ui-pack/styles";
import "./main.scss";
import * as styles from "./shared.m.scss";

useBuiltinStyle(WUPcssButton("button")); // re-use styles from package
useBuiltinStyle(WUPcssBtnIcon(`.${styles.btnIcon}`)); // re-use styles from package
useBuiltinStyle(WUPcssScrollSmall("body"));
