import Dashboard from "./components/dashboard";

interface IRoute {
  /** Browser URL */
  path: string;
  /** h2 on the page */
  title: string;
  /** Component for rendering on the page */
  component: React.ComponentType;
}

interface AllRoutes {
  home: IRoute;
}

const routes: AllRoutes = {
  // public
  home: {
    path: "/",
    title: "Dashboard",
    component: Dashboard,
    // auth: true,
  },

  // private
  // profile: {
  //   path: "/profile/",
  //   headerName: "Profile",
  //   component: () => <ProfileView />,
  // },
};

export default routes; // as Record<keyof typeof routes, IRoute>;
