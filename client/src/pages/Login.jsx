
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" to="/">
          <span className="brand-icon">C</span>CollabSphere
        </Link>
        <h1>Welcome back</h1>
        <p>Log in to continue to your workspace.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password" required />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
        <Link className="auth-home" to="/">← Back to home</Link>
      </section>
    </main>
  );
}
