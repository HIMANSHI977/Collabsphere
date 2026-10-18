import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiRequest from "../services/api.js";
import "../styles/features.css";
import "../styles/analytics.css";

export default function Analytics() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [projectResponse, analyticsResponse] = await Promise.all([
          apiRequest(`/projects/${projectId}`),
          apiRequest(`/analytics/project?projectId=${encodeURIComponent(projectId)}`),
        ]);
        if (active) {
          setProject(projectResponse.project);
          setData(analyticsResponse);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load project analytics");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [projectId]);

  return (
    <main className="feature-page analytics-page">
      <header className="feature-topbar">
        <Link to={`/projects/${projectId}`} className="feature-back">← {project?.name || "Project"}</Link>
        <nav aria-label="Project tools" className="feature-nav">
          <Link to={`/projects/${projectId}/notes`}>Notes</Link>
          <Link to={`/projects/${projectId}/files`}>Files</Link>
        </nav>
      </header>
      <section className="feature-heading">
        <p className="feature-eyebrow">PROJECT CONTRIBUTIONS</p>
        <h1>Activity &amp; analytics</h1>
        <p>Contribution counts and recent events recorded for this project.</p>
      </section>
      {error && <p className="feature-message error" role="alert">{error}</p>}
      {loading ? <p className="feature-state">Loading contribution data…</p> : data && (
        <div className="analytics-content">
          <section className="analytics-summary" aria-label="Project totals">
            {[
              ["Members", data.summary.members],
              ["Notes", data.summary.notes],
              ["Files", data.summary.files],
              ["Tasks", data.summary.tasks],
            ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
          </section>
          <section className="analytics-section">
            <h2>Contributions by member</h2>
            <div className="analytics-table-wrap">
              <table>
                <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Notes</th><th scope="col">Files</th><th scope="col">Tasks</th></tr></thead>
                <tbody>{data.contributions.map((entry) => (
                  <tr key={entry.user.id}>
                    <th scope="row">{entry.user.name}</th>
                    <td>{entry.role}</td><td>{entry.notesCreated}</td><td>{entry.filesUploaded}</td><td>{entry.tasksCreated}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
          <section className="analytics-section">
            <h2>Recent project activity</h2>
            {data.recentActivity.length === 0 ? <p className="feature-state">No project activity has been recorded yet.</p> : (
              <ol className="activity-feed">
                {data.recentActivity.map((activity) => (
                  <li key={activity._id}>
                    <span className="activity-marker" aria-hidden="true" />
                    <div><strong>{activity.details || activity.action}</strong><p>{activity.user?.name || "Project member"} · {activity.action.replaceAll(".", " ")}</p></div>
                    <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
