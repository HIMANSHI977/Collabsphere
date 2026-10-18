
import { useState } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";
import Notes from "./pages/Notes.jsx";
import Files from "./pages/Files.jsx";
import Analytics from "./pages/Analytics.jsx";
import Activity from "./pages/Activity.jsx";
import GeminiAI from "./pages/GeminiAI.jsx";
import PublicProject from "./pages/PublicProject.jsx";
import NotFound from "./pages/NotFound.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import useAuth from "./hooks/useAuth.js";

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="collabsphere">
      <header className="navbar">
        <Link className="brand" to="/" onClick={closeMenu}>
          <span className="brand-icon">C</span>
          CollabSphere
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          type="button"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#features" onClick={closeMenu}>
            Features
          </a>

          <a href="#about" onClick={closeMenu}>
            About
          </a>

          {user ? (
            <Link
              className="nav-login"
              to="/dashboard"
              onClick={closeMenu}
            >
              My workspace
            </Link>
          ) : (
            <>
              <Link
                className="nav-login"
                to="/login"
                onClick={closeMenu}
              >
                Log in
              </Link>

              <Link
                className="nav-signup"
                to="/register"
                onClick={closeMenu}
              >
                Get started ↗
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <span className="eyebrow">
              ✦ YOUR SPACE TO CREATE TOGETHER
            </span>

            <h1>
              Great ideas grow
              <br />
              <span>when we work together.</span>
            </h1>

            <p className="hero-description">
              Bring your team into shared projects, document decisions in
              Markdown, and move work forward with AI-assisted tools.
            </p>

            <div className="hero-actions">
              <Link
                className="primary-button"
                to={user ? "/dashboard" : "/register"}
              >
                {user ? "Open workspace" : "Start collaborating"}{" "}
                <span>↗</span>
              </Link>

              <a className="secondary-button" href="#features">
                Explore features
              </a>
            </div>

            <div className="hero-note">
              <span className="status-dot" />
              Shared projects, notes, files, and contribution history.
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-top">
              <div>
                <span className="workspace-label">PROJECT WORKFLOW</span>
                <h2>From plan to done</h2>
              </div>

              <span className="live-badge">Project view</span>
            </div>

            <div className="workspace-stats">
              <div>
                <span className="stat-icon purple">01</span>
                <strong>Plan</strong>
                <span>Create a project</span>
              </div>

              <div>
                <span className="stat-icon peach">02</span>
                <strong>Work</strong>
                <span>Add and prioritize tasks</span>
              </div>

              <div>
                <span className="stat-icon blue">03</span>
                <strong>Finish</strong>
                <span>Track task status</span>
              </div>
            </div>

            <div className="workspace-divider" />

            <div className="activity-heading">
              <h3>Task workflow</h3>
              <span>Three statuses</span>
            </div>

            <div className="activity-item">
              <span className="activity-avatar avatar-one">1</span>
              <div className="activity-copy">
                <strong>To do</strong>
                <span>Work that is planned</span>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-avatar avatar-two">2</span>
              <div className="activity-copy">
                <strong>In progress</strong>
                <span>Work being done</span>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-avatar avatar-three">3</span>
              <div className="activity-copy">
                <strong>Completed</strong>
                <span>Finished work</span>
              </div>
            </div>

            <div className="workspace-footer">
              <span>Keep every task moving</span>
              <span>✳</span>
            </div>
          </div>

          <div className="hero-decoration decoration-one" />
          <div className="hero-decoration decoration-two" />
        </section>

        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="eyebrow">EVERYTHING IN ONE PLACE</span>
            <h2>Make room for your best work.</h2>
            <p>
              Practical tools for turning a project plan into completed work.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon lavender">▦</span>
              <h3>Project management</h3>
              <p>
                Organize projects, track progress, and keep work moving
                forward.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-icon peach-bg">✓</span>
              <h3>Markdown notes</h3>
              <p>
                Keep project notes in Markdown and use Gemini to explain or
                improve their content.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-icon blue-bg">⌕</span>
              <h3>Project files</h3>
              <p>
                Store and preview project images, documentation, and code with
                member-only access.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-icon yellow-bg">↗</span>
              <h3>Team activity</h3>
              <p>
                Invite members, review contribution history, and publish a
                read-only project overview.
              </p>
            </article>
          </div>
        </section>

        <section className="closing-section" id="about">
          <span className="eyebrow">YOUR NEXT IDEA STARTS HERE</span>
          <h2>Let's build something meaningful.</h2>
          <p>A shared space for better ideas and better teamwork.</p>

          <Link className="primary-button" to="/register">
            Join CollabSphere <span>↗</span>
          </Link>
        </section>
      </main>

      <footer className="footer">
        <Link className="brand" to="/">
          <span className="brand-icon">C</span>
          CollabSphere
        </Link>

        <span>Think together. Build together.</span>
        <span>© {new Date().getFullYear()} CollabSphere</span>
      </footer>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/share/:shareId" element={<PublicProject />} />

      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/projects/:id/notes" element={<Notes />} />
        <Route path="/projects/:id/files" element={<Files />} />
        <Route path="/projects/:id/analytics" element={<Analytics />} />
        <Route path="/projects/:id/activity" element={<Activity />} />
        <Route path="/ai" element={<GeminiAI />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
