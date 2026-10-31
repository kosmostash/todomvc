import "todomvc-common/base.css";
import "todomvc-app-css/index.css";

import { Outlet } from "react-router";
import { AppProvider } from "_/app";

export default function App() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
