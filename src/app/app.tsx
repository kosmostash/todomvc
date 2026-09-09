import { Outlet } from "react-router";
import { AppProvider } from "_/app";

import "todomvc-app-css/index.css";
import "~/styles/app.css";

/**
 * Wraps every route, including the 404 page.
 * `AppProvider` is the seam KosmoJS owns - it stays here whether or not a
 * provider is installed behind it.
 */
export default function App() {
  return (
    <AppProvider>
      <Outlet />

      <footer className="info">
        <p>Double-click to edit a todo</p>
        <p>Todos live in SQLite, behind a Hono API</p>
        <p>
          Built with <a href="https://kosmojs.dev">KosmoJS</a> &middot; part of{" "}
          <a href="https://todomvc.com">TodoMVC</a>
        </p>
      </footer>
    </AppProvider>
  );
}
