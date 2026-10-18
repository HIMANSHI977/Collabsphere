
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiRequest from "../services/api.js";
import useAuth from "../hooks/useAuth.js";
import "../styles/project.css";

const emptyForm = {
  name: "",
  description: "",
  status: "planning",
};

export default function Projects() {
  const { user, logout } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/projects");
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, []);


useEffect(() => {
  let ignore = false;

  async function fetchInitialProjects() {
    try {
      const data = await apiRequest("/projects");

      if (!ignore) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      if (!ignore) {
        setError(err.message || "Could not load projects.");
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  }

  fetchInitialProjects();

  return () => {
    ignore = true;
  };
}, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleEditChange(event) {
    setEditForm({
      ...editForm,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const data = await apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (data.project) {
        setProjects((current) => [data.project, ...current]);
      } else {
        await loadProjects();
      }

      setForm(emptyForm);
      setSuccess("Project created successfully.");
    } catch (err) {
      setError(err.message || "Could not create project.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(project) {
    setEditingId(project._id);
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "planning",
    });
    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleUpdate(event, projectId) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setUpdatingId(projectId);

    try {
      const data = await apiRequest(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });

      if (data.project) {
        setProjects((current) =>
          current.map((project) =>
            project._id === projectId ? data.project : project
          )
        );
      } else {
        await loadProjects();
      }

      setEditingId(null);
      setEditForm(emptyForm);
      setSuccess("Project updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update project.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(project) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(project._id);

    try {
      await apiRequest(`/projects/${project._id}`, {
        method: "DELETE",
      });

      setProjects((current) =>
        current.filter((item) => item._id !== project._id)
      );

      if (editingId === project._id) {
        cancelEditing();
      }

      setSuccess("Project deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="projects-page">
      <header className="projects-header">
        <Link to="/dashboard" className="projects-brand">
          <span className="projects-brand-icon">C</span>
          CollabSphere
        </Link>

        <nav className="projects-nav">
          <Link to="/dashboard">Dashboard</Link>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.assign("/login");
            }}
          >
            Log out
          </button>
        </nav>
      </header>

      <section className="projects-content">
        <p className="projects-eyebrow">YOUR WORKSPACE / PROJECTS</p>

        <div className="projects-heading">
          <div>
            <h1>Your projects</h1>
            <p>Create projects, organize your work, and track progress.</p>
          </div>

          <span className="projects-count">
            {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        <section className="project-form-card">
          <h2>Create a new project</h2>
          <p className="project-form-description">
            Start with a name and add details whenever you need.
          </p>

          <form onSubmit={handleSubmit} className="project-form">
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. CollabSphere Development"
              minLength={2}
              maxLength={100}
              required
            />

            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What are you building?"
              maxLength={1000}
              rows={3}
            />

            <label htmlFor="project-status">Status</label>
            <select
              id="project-status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>

            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "+ Create project"}
            </button>
          </form>
        </section>

        {error && (
          <div className="project-message project-error" role="alert">
            {error}
            {error.toLowerCase().includes("authentication") && (
              <p>
                Your session may have expired. Please{" "}
                <Link to="/login">log in again</Link>.
              </p>
            )}
          </div>
        )}

        {success && (
          <p className="project-message project-success" role="status">
            {success}
          </p>
        )}

        <section className="project-list-section">
          <div className="project-list-heading">
            <h2>All projects</h2>
            <button
              type="button"
              className="project-refresh"
              onClick={loadProjects}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="projects-empty">Loading your projects...</div>
          ) : projects.length === 0 ? (
            <div className="projects-empty">
              <span className="projects-empty-icon">▦</span>
              <h3>No projects yet</h3>
              <p>Create your first project using the form above.</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <article className="project-card" key={project._id}>
                  {editingId === project._id ? (
                    <form
                      className="project-edit-form"
                      onSubmit={(event) => handleUpdate(event, project._id)}
                    >
                      <h3>Edit project</h3>

                      <label htmlFor={`edit-name-${project._id}`}>
                        Project name
                      </label>
                      <input
                        id={`edit-name-${project._id}`}
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        minLength={2}
                        maxLength={100}
                        required
                      />

                      <label htmlFor={`edit-description-${project._id}`}>
                        Description
                      </label>
                      <textarea
                        id={`edit-description-${project._id}`}
                        name="description"
                        value={editForm.description}
                        onChange={handleEditChange}
                        maxLength={1000}
                        rows={3}
                      />

                      <label htmlFor={`edit-status-${project._id}`}>
                        Status
                      </label>
                      <select
                        id={`edit-status-${project._id}`}
                        name="status"
                        value={editForm.status}
                        onChange={handleEditChange}
                      >
                        <option value="planning">Planning</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <div className="project-actions">
                        <button
                          type="submit"
                          disabled={updatingId === project._id}
                        >
                          {updatingId === project._id
                            ? "Saving..."
                            : "Save changes"}
                        </button>

                        <button
                          type="button"
                          className="project-cancel-button"
                          onClick={cancelEditing}
                          disabled={updatingId === project._id}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="project-card-top">
                        <span className="project-card-icon">▦</span>

                        <span
                          className={`project-status status-${project.status}`}
                        >
                          {project.status === "in-progress"
                            ? "In progress"
                            : project.status === "completed"
                              ? "Completed"
                              : "Planning"}
                        </span>
                      </div>

                      <h3>{project.name}</h3>
                      <span className="project-ownership-label">
                        {project.role === "member" ? "Shared with you" : "Owned by you"}
                      </span>

                      <p className="project-card-description">
                        {project.description || "No description added yet."}
                      </p>

                      <div className="project-card-footer">
                        <span>
                          {project.createdAt
                            ? new Date(
                                project.createdAt
                              ).toLocaleDateString()
                            : "Recently created"}
                        </span>
                        <span><Link
  to={`/projects/${project._id}`}
  className="view-project-link"
>
  View project ↗
</Link></span>
                      </div>

                      <div className="project-actions">
                        <button
                          type="button"
                          onClick={() => startEditing(project)}
                          disabled={deletingId === project._id}
                        >
                          Edit project
                        </button>

                        <button
                          type="button"
                          className="project-delete-button"
                          onClick={() => handleDelete(project)}
                          disabled={deletingId === project._id}
                        >
                          {deletingId === project._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="projects-user">
          Signed in as {user?.name || user?.email || "CollabSphere member"}
        </p>
      </section>
    </main>
  );
}
