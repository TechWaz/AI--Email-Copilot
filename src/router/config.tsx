import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Login from "../pages/login/page";
import Dashboard from "../pages/dashboard/page";
import Home from "../pages/home/page";
import Inbox from "../pages/inbox/page";
import Tasks from "../pages/tasks/page";
import Accounts from "../pages/accounts/page";
import Search from "../pages/search/page";
import Settings from "../pages/settings/page";
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
    path: "/tasks",
    element: (
      <AuthGuard>
        <Tasks />
      </AuthGuard>
    ),
  },
  {
    path: "/accounts",
    element: (
      <AuthGuard>
        <Accounts />
      </AuthGuard>
    ),
  },
  {
    path: "/search",
    element: (
      <AuthGuard>
        <Search />
      </AuthGuard>
    ),
  },
  {
    path: "/settings",
    element: (
      <AuthGuard>
        <Settings />
      </AuthGuard>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;