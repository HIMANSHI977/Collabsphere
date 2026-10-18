import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import apiRequest from "../services/api.js";
import "../styles/public-project.css";

export default function PublicProject() {
  const { shareId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/public/projects/${encodeURIComponent(shareId)}`)
      .then((data) => { if (active) setProject(data.project); })
      .catch((requestError) => { if (active) setError(requestError.message || "This public project is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [shareId]);

  return (
    <main className="public-project-page">
      <header className="public-project-header">
        <Link to="/" className="public-project-brand"><span>C</span> CollabSphere</Link>
        <span>Public project overview</span>
      </header>
      {loading ? <p className="public-project-state">Loading public project…</p> : error ? (
        <section className="public-project-error"><p className="feature-eyebrow">LINK UNAVAILABLE</p><h1>Public project not found</h1><p>{error}</p><Link to="/">Go to CollabSphere</Link></section>
      ) : project && (
        <article className="public-project-content">
          <p className="feature-eyebrow">READ-ONLY PROJECT PAGE</p>
          <h1>{project.name}</h1>
          <span className={`public-project-status status-${project.status}`}>{project.status.replaceAll("-", " ")}</span>
          {project.description && <section><h2>Overview</h2><p className="public-description">{project.description}</p></section>}
          <section className="public-readme">
            <h2>Project README</h2>
            {project.readme?.trim()
              ? <ReactMarkdown>{project.readme}</ReactMarkdown>
              : <p className="public-project-state">The owner has not published a README yet.</p>}
          </section>
          <footer>Published project overview · Updated {new Date(project.updatedAt).toLocaleDateString()}</footer>
        </article>
      )}
    </main>
  );
}
