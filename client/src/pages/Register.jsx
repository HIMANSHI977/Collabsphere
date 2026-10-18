
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8 || password.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await register({ name, email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to create your account.");
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
        <h1>Create your account</h1>
        <p>Set up your space and bring your ideas together.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Full name</label>
          <input id="name" type="text" value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2} maxLength={60} autoComplete="name" required />

          <label htmlFor="email">Email address</label>
          <input id="email" type="email" value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8} maxLength={72}
            autoComplete="new-password" required />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
        <Link className="auth-home" to="/">← Back to home</Link>
      </section>
    </main>
  );
}
