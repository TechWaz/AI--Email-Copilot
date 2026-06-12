import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Login from "../pages/login/page";
import Dashboard from "../pages/dashboard/page";
import Home from "../pages/home/page";
import Inbox from "../pages/inbox/page";
import { AuthGuard } from "../components/feature/AuthGuard";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: (
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    ),
  },
  {
    path: "/inbox",
    element: (
      <AuthGuard>
        <Inbox />
      </AuthGuard>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;