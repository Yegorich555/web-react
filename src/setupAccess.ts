/* eslint-disable no-param-reassign */
import { IBaseUser, UserRoles } from "./components/account/api.types";

declare global {
  /** Current user logged in the system */
  let $u: IBaseUser;
  /** Object with defined access-rules */
  let $acc: ReturnType<typeof setupAcc>;
  interface Window {
    $u?: IBaseUser | null;
    $acc?: ReturnType<typeof setupAcc> | null;
  }
}

type ICastDeep<V, O> = {
  [K in keyof O]: O[K] extends Record<string, unknown> ? ICastDeep<V, O[K]> : V;
};

function setupAcc(u: IBaseUser) {
  const { role } = u;
  const isSuper = role === UserRoles.sa;
  const result = {
    pages: {
      dashboard: true,
      products: true,
      users: true,
    },
    product: {
      add: isSuper,
      edit: isSuper,
      delete: isSuper,
    },
  };

  const cast = (v: unknown): boolean | Record<string, unknown> => {
    if (Array.isArray(v)) {
      return v.includes(u.role);
    }
    switch (typeof v) {
      case "function":
        return v(u);
      case "object":
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return act(v as Record<string, unknown>, {});
      default:
        return !!v;
    }
  };

  const act = (obj: Record<string, unknown>, next: Record<string, unknown>) => {
    Object.keys(obj).forEach((k) => {
      next[k] = cast(obj[k]);
    });
    return next;
  };
  const r = act(result, {}) as ICastDeep<boolean, typeof result>;
  return r;
}

interface DisposedFunc {
  (u: IBaseUser): void;
  /** Call it on logout */
  dispose: () => void;
}

/** Add user to global window.$u + window.$acc to setup access */
const setupAccess = <DisposedFunc>function setupAccess(u: IBaseUser): void {
  window.$u = Object.freeze(u);
  window.$acc = Object.freeze(setupAcc(u));
};
setupAccess.dispose = function dispose() {
  window.$u = null;
  window.$acc = null;
};

export default setupAccess;
