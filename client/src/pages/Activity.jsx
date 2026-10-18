
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiRequest from "../services/api.js";
import "../styles/features.css";
import "../styles/activity.css";

function Activity() {
  const { id } = useParams();

  const [activities, setActivities] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let ignore = false;

    async function loadActivity() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(`/projects/${id}/activity?limit=100`);

        if (!ignore) {
          setActivities(data.activities || []);
          setProject(data.project || null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Unable to load project activity.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      ignore = true;
    };
  }, [id]);

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    return activity.resourceType === filter;
  });

  function getActionLabel(action) {
    const labels = {
      "project.created": "created this project",
      "project.member_added": "added a project member",
      "project.member_removed": "removed a project member",
      "project.sharing_changed": "changed project sharing settings",
      "note.created": "created a note",
      "note.updated": "updated a note",
      "note.deleted": "deleted a note",
      "file.uploaded": "uploaded a file",
      "file.deleted": "deleted a file",
      "task.created": "created a task",
      "task.updated": "updated a task",
      "task.deleted": "deleted a task",
    };

    return labels[action] || action?.replaceAll(".", " ") || "performed an action";
  }

  function getUserName(activity) {
    return activity.user?.name || activity.user?.email || "A team member";
  }

  function formatDate(date) {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <main className="activity-page feature-page">
      <header className="activity-topbar">
        <Link to={`/projects/${id}`} className="activity-back-link">
          ← Back to project
        </Link>

        <Link to="/" className="activity-brand">
          CollabSphere
        </Link>
      </header>

      <section className="activity-hero">
        <span className="activity-eyebrow">PROJECT WORKSPACE</span>
        <h1>Activity <span>timeline</span></h1>
        <p>
          Follow the changes and contributions happening across your project.
        </p>

        {project && <h2>{project.name}</h2>}
      </section>

      <section className="activity-content">
        <div className="activity-toolbar">
          <div>
            <h2>Recent activity</h2>
            <p>{activities.length} recorded events</p>
          </div>

          <label className="activity-filter">
            <span>Filter</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All activity</option>
              <option value="project">Project</option>
              <option value="note">Notes</option>
              <option value="file">Files</option>
              <option value="task">Tasks</option>
            </select>
          </label>
        </div>

        {loading && (
          <p className="activity-message">Loading project activity...</p>
        )}

        {!loading && error && (
          <div className="activity-empty">
            <h3>Couldn't load activity</h3>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredActivities.length === 0 && (
          <div className="activity-empty">
            <span className="activity-empty-icon">↗</span>
            <h3>No activity yet</h3>
            <p>
              Project changes will appear here when the application records
              them.
            </p>
            <Link to={`/projects/${id}`}>Return to project</Link>
          </div>
        )}

        {!loading && !error && filteredActivities.length > 0 && (
          <div className="activity-timeline">
            {filteredActivities.map((activity) => (
              <article
                className="activity-event"
                key={activity._id}
              >
                <div className="activity-event-marker">
                  {activity.resourceType === "note"
                    ? "N"
                    : activity.resourceType === "file"
                      ? "F"
                      : activity.resourceType === "task"
                        ? "T"
                        : "P"}
                </div>

                <div className="activity-event-card">
                  <div className="activity-event-heading">
                    <strong>{getUserName(activity)}</strong>
                    <span>{formatDate(activity.createdAt)}</span>
                  </div>

                  <p>{getActionLabel(activity.action)}</p>

                  {activity.details && (
                    <p className="activity-event-details">
                      {activity.details}
                    </p>
                  )}

                  <span className="activity-resource-type">
                    {activity.resourceType || "project"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Activity;
