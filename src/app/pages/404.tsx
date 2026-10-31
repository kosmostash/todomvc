import Link from "~/components/Link";

export default function NotFound() {
  return (
    <>
      <section className="todoapp">
        <header className="header">
          <h1>404</h1>
        </header>
        <footer className="footer">
          <span>Page not found</span>
          <ul className="filters">
            <li>
              <Link to={["{filter}"]}>Back to todos</Link>
            </li>
          </ul>
        </footer>
      </section>
    </>
  );
}
