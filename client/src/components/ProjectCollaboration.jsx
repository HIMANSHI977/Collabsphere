import { useState } from "react";
import { Link } from "react-router-dom";
import apiRequest from "../services/api.js";

export default function ProjectCollaboration({ project, onProjectChange }) {
  const [email, setEmail] = useState("");
  const [publicReadme, setPublicReadme] = useState(project.publicReadme || "");
  const [codeOverview, setCodeOverview] = useState("");
  const [members, setMembers] = useState(project.members || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isOwner = project.role === "owner";
  const shareUrl = project.shareId
    ? `${window.location.origin}/share/${project.shareId}`
    : "";

  async function addMember(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest(`/projects/${project._id}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMembers(data.members || []);
      setEmail("");
      setNotice("Project member added.");
      onProjectChange?.({ ...project, members: data.members || [] });
    } catch (requestError) {
      setError(requestError.message || "Unable to add member");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.name} from this project?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest(`/projects/${project._id}/members/${member._id}`, {
        method: "DELETE",
      });
      setMembers(data.members || []);
      setNotice("Project member removed.");
      onProjectChange?.({ ...project, members: data.members || [] });
    } catch (requestError) {
      setError(requestError.message || "Unable to remove member");
    } finally {
      setBusy(false);
    }
  }

  async function updateSharing(enabled, content = publicReadme) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest(`/projects/${project._id}/sharing`, {
        method: "PATCH",
        body: JSON.stringify({ enabled, publicReadme: content }),
      });
      setPublicReadme(content);
      onProjectChange?.({ ...project, isPublic: data.isPublic, shareId: data.shareId || undefined, publicReadme: content });
      setNotice(enabled ? "Public read-only page enabled." : "Public sharing revoked.");
    } catch (requestError) {
      setError(requestError.message || "Unable to update public sharing");
    } finally {
      setBusy(false);
    }
  }

  async function generateReadme(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest("/gemini/readme", {
        method: "POST",
        body: JSON.stringify({
          projectDescription: project.description || project.name,
          codeOverview,
        }),
      });
      setPublicReadme(data.result);
      setNotice("README generated. Review it and save the public page content.");
    } catch (requestError) {
      setError(requestError.message || "Unable to generate README");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Public project link copied.");
      setError("");
    } catch {
      setError("Clipboard access is unavailable. Select and copy the link instead.");
    }
  }

  return (
    <section className="collaboration-tools">
      <div className="collab-section">
        <div className="collab-heading">
          <div>
            <span className="details-card-label">COLLABORATION</span>
            <h2>Project members</h2>
          </div>
          <span className="member-count">{members.length + 1}</span>
        </div>
        <ul className="member-list">
          <li>
            <span className="member-avatar">{project.createdBy?.name?.slice(0, 1) || "O"}</span>
            <span><strong>{project.createdBy?.name || "Project owner"}</strong><small>{project.createdBy?.email || "Owner"}</small></span>
            <em>Owner</em>
          </li>
          {members.map((member) => (
            <li key={member._id}>
              <span className="member-avatar">{member.name?.slice(0, 1) || "M"}</span>
              <span><strong>{member.name}</strong><small>{member.email}</small></span>
              {isOwner && <button type="button" className="member-remove" onClick={() => removeMember(member)} disabled={busy} aria-label={`Remove ${member.name}`}>Remove</button>}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form className="member-add-form" onSubmit={addMember}>
            <label htmlFor="member-email">Add a registered user by email</label>
            <div><input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="teammate@example.com" /><button className="details-action" disabled={busy}>{busy ? "Working…" : "Add member"}</button></div>
          </form>
        )}
      </div>

      <div className="collab-section public-sharing-section">
        <div>
          <span className="details-card-label">PUBLIC OVERVIEW</span>
          <h2>Share a read-only project page</h2>
          <p>Only the project overview and the Markdown below are visible publicly. Notes, files, tasks, and member details stay private.</p>
        </div>
        {isOwner ? (
          <>
            <label className="public-readme-field">
              Public README / overview
              <textarea value={publicReadme} maxLength={50000} onChange={(event) => setPublicReadme(event.target.value)} rows={8} placeholder="# Project overview\n\nWrite or generate content intended for public viewing." />
            </label>
            <form className="readme-generator" onSubmit={generateReadme}>
              <label className="public-readme-field">
                Code overview for README generation
                <textarea value={codeOverview} maxLength={20000} onChange={(event) => setCodeOverview(event.target.value)} rows={4} placeholder="Summarize the stack, architecture, and main modules. Do not include secrets." />
              </label>
              <button type="submit" className="details-action secondary" disabled={busy || !codeOverview.trim()}>{busy ? "Generating…" : "Generate README with Gemini"}</button>
            </form>
            <div className="share-actions">
              <button type="button" className="details-action secondary" onClick={() => updateSharing(Boolean(project.isPublic), publicReadme)} disabled={busy}>Save public README</button>
              <button type="button" className="details-action" onClick={() => updateSharing(!project.isPublic, publicReadme)} disabled={busy}>{project.isPublic ? "Revoke public access" : "Enable public sharing"}</button>
            </div>
            {shareUrl && project.isPublic && <div className="share-link-row"><input aria-label="Public project link" readOnly value={shareUrl} /><button type="button" className="details-action secondary" onClick={copyShareUrl}>Copy link</button><Link to={`/share/${project.shareId}`}>View public page</Link></div>}
          </>
        ) : (
          <p className="member-permission-note">Public sharing is managed by the project owner.</p>
        )}
      </div>

      {(error || notice) && <p className={`collab-message ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
    </section>
  );
}
