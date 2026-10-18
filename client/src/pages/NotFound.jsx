import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="route-message">
      <h1>Page not found</h1>
      <Link to="/">Return to CollabSphere</Link>
    </main>
  );
}
