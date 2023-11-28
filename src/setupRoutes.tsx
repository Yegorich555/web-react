import Dashboard from "./components/dashboard";

interface IRoute {
  /** Browser URL */
  path: string;
  /** h2 on the page */
  title: string;
  /** Component for rendering on the page */
  component: React.ComponentType;
}

const routes = {
  // public
  home: {
    path: "/",
    title: "Dashboard",
    component: Dashboard,
  },

  // private
  // profile: {
  //   path: "/profile/",
  //   headerName: "Profile",
  //   component: () => <ProfileView />,
  // },
};

export default routes as Record<keyof typeof routes, IRoute>;
