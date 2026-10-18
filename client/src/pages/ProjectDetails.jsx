
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import apiRequest from "../services/api.js";
import TaskBoard from "../components/TaskBoard.jsx";
import ProjectCollaboration from "../components/ProjectCollaboration.jsx";

import "../styles/project-details.css";

function ProjectDetails() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchProject() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(`/projects/${id}`);

        if (!ignore) {
          setProject(data.project);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Unable to load project details.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchProject();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="project-details-page">
        <p className="details-message">Loading project details...</p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="project-details-page">
        <section className="details-error">
          <span className="details-eyebrow">PROJECT UNAVAILABLE</span>
          <h1>We couldn't open this project.</h1>
          <p>{error || "This project could not be found."}</p>

          <Link className="details-back-link" to="/projects">
            ← Back to projects
          </Link>
        </section>
      </main>
    );
  }

  const statusLabels = {
    planning: "Planning",
    "in-progress": "In progress",
    completed: "Completed",
  };

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : createdDate;

  return (
    <main className="project-details-page">
      <header className="details-topbar">
        <Link className="details-back-link" to="/projects">
          <span aria-hidden="true">←</span> All projects
        </Link>

        <Link className="details-brand" to="/">
          CollabSphere
        </Link>
      </header>

      <section className="details-hero">
        <span className="details-eyebrow">PROJECT WORKSPACE</span>

        <div className="details-heading-row">
          <div>
            <h1>{project.name}</h1>
            <p className="details-subtitle">
              Your project, organized in one workspace.
            </p>
          </div>

          <span
            className={`details-status details-status-${project.status}`}
          >
            <span className="details-status-dot" />
            {statusLabels[project.status] || project.status}
          </span>
        </div>
      </section>

      <section className="details-content">
        <article className="details-card details-description-card">
          <span className="details-card-label">OVERVIEW</span>
          <h2>About this project</h2>

          <p className="details-description">
            {project.description?.trim() ||
              "No description has been added to this project yet."}
          </p>
        </article>

        <article className="details-card">
          <span className="details-card-label">PROJECT INFORMATION</span>
          <h2>Details</h2>

          <div className="details-info-row">
            <span>Project name</span>
            <strong>{project.name}</strong>
          </div>

          <div className="details-info-row">
            <span>Current status</span>
            <strong>
              {statusLabels[project.status] || project.status}
            </strong>
          </div>

          <div className="details-info-row">
            <span>Created on</span>
            <strong>{createdDate}</strong>
          </div>

          <div className="details-info-row">
            <span>Last updated</span>
            <strong>{updatedDate}</strong>
          </div>

          <div className="details-info-row">
            <span>Project ID</span>
            <code>{project._id}</code>
          </div>
        </article>
      </section>

      <nav
        className="project-tool-nav"
        aria-label="Project workspace tools"
      >
        <Link to={`/projects/${project._id}/notes`}>
          Markdown notes
        </Link>

        <Link to={`/projects/${project._id}/files`}>
          Project files
        </Link>

        <Link to={`/projects/${project._id}/analytics`}>
          Analytics
        </Link>

        <Link to={`/projects/${project._id}/activity`}>
          Activity
        </Link>

        <Link
          className="project-ai-link"
          to="/ai"
          state={{
            projectName: project.name,
            projectDescription: project.description || "",
          }}
        >
          ✦ Gemini AI Assistant
        </Link>
      </nav>

      <ProjectCollaboration
        project={project}
        onProjectChange={(updatedProject) => setProject(updatedProject)}
      />

      <TaskBoard projectId={project._id} />

      <footer className="details-footer">
        <p>Keep your work moving forward, one step at a time.</p>
        <Link to="/projects">Return to your projects →</Link>
      </footer>
    </main>
  );
}

export default ProjectDetails;
