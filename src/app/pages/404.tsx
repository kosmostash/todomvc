import Link from "~/components/Link";

export default function NotFound() {
  return (
    <section class="todoapp">
      <header class="header">
        <h1>404</h1>
      </header>
      <footer class="footer">
        <span>Page not found</span>
        <ul class="filters">
          <li>
            <Link to={["{filter}"]}>Back to todos</Link>
          </li>
        </ul>
      </footer>
    </section>
  );
}
