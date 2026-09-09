import Link from "~/components/Link";

/**
 * The router's catch-all, rendered for any URL that matches no route.
 * Under SSR it is served with a real 404 status.
 */
export default function NotFoundPage() {
  return (
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
      </header>

      <section className="main">
        <ul className="todo-list">
          <li>
            <div className="view">
              <label>404 - nothing to do here</label>
            </div>
          </li>
        </ul>
      </section>

      <footer className="footer">
        <span className="todo-count">
          <strong>0</strong> items left
        </span>
        <ul className="filters">
          <li>
            <Link to={["index"]} className="selected">
              Back to the list
            </Link>
          </li>
        </ul>
      </footer>
    </section>
  );
}
