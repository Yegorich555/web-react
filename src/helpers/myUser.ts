import { useSyncExternalStore } from "react";
import observer from "web-ui-pack/helpers/observer";

/** Current user of the system; it can be changed in runtime: `myUser.isAdmin = true` OR `window.myUser = { isAdmin: true }` */
export interface IMyUser {
  /** Any truthy value means admin: `true`, `1` */
  isAdmin: boolean | number;
}

declare global {
  interface Window {
    myUser: IMyUser;
  }
}

const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((f) => f());

let current: IMyUser;
function setUser(v: IMyUser | null | undefined): void {
  current = observer.make<IMyUser>({ isAdmin: false, ...v }); // isAdmin is false by default
  observer.onChanged(current, emit);
}

setUser(window.myUser); // keep it if it's defined before the app
Object.defineProperty(window, "myUser", {
  configurable: true,
  get: () => current,
  set: (v: IMyUser) => {
    setUser(v);
    emit();
  },
});

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getIsAdmin = (): boolean => !!window.myUser.isAdmin;

/** Returns true if current user is admin; component is re-rendered when `myUser.isAdmin` is changed */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, getIsAdmin);
}
