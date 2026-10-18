
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/dashboard.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/" className="dashboard-brand">
          <span className="dashboard-brand-icon">C</span>
          CollabSphere
        </Link>

        <button
          className="dashboard-logout"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
      </header>

      <section className="dashboard-content">
        <p className="dashboard-eyebrow">YOUR WORKSPACE</p>

        <h1>
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </h1>

        <p className="dashboard-description">
          Manage your projects, organize your tasks, and build faster with
          your AI development assistant.
        </p>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <span className="dashboard-card-icon">01</span>
            <h2>Projects</h2>
            <p>
              Organize your work, manage project details, and track progress.
            </p>
            <Link to="/projects">Explore projects →</Link>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-icon">02</span>
            <h2>Task boards</h2>
            <p>
              Manage tasks, set priorities, and keep your project work moving.
            </p>
            <Link to="/projects">Open a project →</Link>
          </article>

          <article className="dashboard-card dashboard-ai-card">
            <span className="dashboard-card-icon dashboard-ai-icon">
              ✦
            </span>
            <h2>Gemini AI Assistant</h2>
            <p>
              Explain code, improve notes, generate documentation, and create
              project README files with Gemini AI.
            </p>
            <Link to="/ai">Open AI Assistant →</Link>
          </article>
        </div>

        <section className="dashboard-profile">
          <div>
            <p className="dashboard-eyebrow">YOUR ACCOUNT</p>
            <h2>{user?.name || "CollabSphere member"}</h2>
            <p>{user?.email || "Your account details"}</p>
          </div>
          <span className="dashboard-status">Signed in</span>
        </section>
      </section>
    </main>
  );
}
