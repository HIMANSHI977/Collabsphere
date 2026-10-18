
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import apiRequest from "../services/api.js";
import "../styles/features.css";
import "../styles/notes.css";

const emptyDraft = { title: "", content: "" };

export default function Notes() {
  const { id: projectId } = useParams();

  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiAction, setAiAction] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!projectId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [projectData, notesData] = await Promise.all([
          apiRequest(`/projects/${projectId}`),
          apiRequest(`/notes?projectId=${encodeURIComponent(projectId)}`),
        ]);

        if (!active) return;

        const loadedProject =
          projectData.project || projectData.data || projectData;

        const loadedNotes = Array.isArray(notesData.notes)
          ? notesData.notes
          : Array.isArray(notesData.data)
            ? notesData.data
            : [];

        setProject(loadedProject);
        setNotes(loadedNotes);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load project notes.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [projectId]);

  function selectNote(note) {
    setSelectedId(note._id);
    setDraft({
      title: note.title || "",
      content: note.content || "",
    });
    setAiResult("");
    setError("");
    setNotice("");
  }

  function createDraft() {
    setSelectedId(null);
    setDraft({ ...emptyDraft });
    setAiResult("");
    setError("");
    setNotice("");
  }

  async function saveNote(event) {
    event.preventDefault();

    if (!projectId) {
      setError("Project ID is missing. Open Notes from a project.");
      return;
    }

    const title = draft.title.trim();

    if (!title) {
      setError("Please enter a note title.");
      return;
    }

    if (title.length > 160) {
      setError("The note title cannot exceed 160 characters.");
      return;
    }

    if (draft.content.length > 100000) {
      setError("Note content cannot exceed 100,000 characters.");
      return;
    }

    if (saving || deleting) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const editing = Boolean(selectedId);

      const data = await apiRequest(
        editing ? `/notes/${selectedId}` : "/notes",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(
            editing
              ? { title, content: draft.content }
              : { projectId, title, content: draft.content }
          ),
        }
      );

      const saved = data.note;

      if (!saved?._id) {
        throw new Error(data.message || "The saved note was not returned.");
      }

      setNotes((current) =>
        editing
          ? current.map((note) =>
              note._id === saved._id ? { ...note, ...saved } : note
            )
          : [saved, ...current.filter((note) => note._id !== saved._id)]
      );

      setSelectedId(saved._id);
      setDraft({
        title: saved.title || title,
        content: saved.content ?? draft.content,
      });

      setNotice(
        editing
          ? "Note updated successfully."
          : "Note created successfully."
      );
    } catch (saveError) {
      setError(saveError.message || "Unable to save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    if (!selectedId || saving || deleting) return;

    if (!window.confirm("Delete this note permanently?")) {
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/notes/${selectedId}`, {
        method: "DELETE",
      });

      setNotes((current) =>
        current.filter((note) => note._id !== selectedId)
      );

      setSelectedId(null);
      setDraft({ ...emptyDraft });
      setAiResult("");
      setNotice("Note deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete the note.");
    } finally {
      setDeleting(false);
    }
  }

  async function runAi(action) {
    if (!draft.content.trim()) {
      setError("Add note content before requesting AI help.");
      return;
    }

    if (aiAction || saving || deleting) return;

    setAiAction(action);
    setAiResult("");
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/gemini/explain", {
        method: "POST",
        body: JSON.stringify({
          text: draft.content,
          kind: "note",
          action,
        }),
      });

      if (!data.success || typeof data.result !== "string" || !data.result.trim()) {
        throw new Error(data.message || "Gemini did not return a result.");
      }

      setAiResult(data.result);
      setNotice(
        action === "improve"
          ? "Improvement suggestions generated."
          : "Note explanation generated."
      );
    } catch (aiError) {
      setError(aiError.message || "Gemini could not complete the request.");
    } finally {
      setAiAction("");
    }
  }

  function applyAiResult() {
    if (!aiResult.trim()) return;

    setDraft((current) => ({
      ...current,
      content: aiResult,
    }));

    setNotice(
      "AI result applied to the editor. Save your note to keep the changes."
    );
    setError("");
  }

  if (!projectId) {
    return (
      <main className="feature-page notes-page">
        <p className="feature-message error" role="alert">
          Project ID is missing. Please open Notes from a specific project.
        </p>
        <Link to="/dashboard" className="feature-back">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="feature-page notes-page">
      <header className="feature-topbar">
        <Link to={`/projects/${projectId}`} className="feature-back">
          ← {project?.name || "Project"}
        </Link>

        <nav aria-label="Project tools" className="feature-nav">
          <Link to={`/projects/${projectId}/files`}>Files</Link>
          <Link to={`/projects/${projectId}/analytics`}>Analytics</Link>
          <Link to="/ai">Gemini AI</Link>
        </nav>
      </header>

      <section className="feature-heading">
        <p className="feature-eyebrow">PROJECT KNOWLEDGE</p>
        <h1>Markdown notes</h1>
        <p>
          Create project documentation, preview Markdown, and improve your
          writing with Gemini AI.
        </p>
      </section>

      {error && (
        <p className="feature-message error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="feature-message success" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="feature-state">Loading project notes…</p>
      ) : (
        <div className="notes-layout">
          <aside className="notes-list" aria-label="Project notes">
            <button
              type="button"
              className="feature-primary"
              onClick={createDraft}
              disabled={saving || deleting || Boolean(aiAction)}
            >
              + New note
            </button>

            {notes.length === 0 ? (
              <p className="feature-state">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <button
                  type="button"
                  className={`note-list-item${
                    selectedId === note._id ? " selected" : ""
                  }`}
                  key={note._id}
                  onClick={() => selectNote(note)}
                  disabled={saving || deleting || Boolean(aiAction)}
                >
                  <strong>{note.title}</strong>
                  <span>
                    {note.updatedAt
                      ? new Date(note.updatedAt).toLocaleDateString()
                      : ""}
                  </span>
                </button>
              ))
            )}
          </aside>

          <section className="note-editor-panel">
            <form onSubmit={saveNote}>
              <label className="feature-field">
                Note title
                <input
                  value={draft.title}
                  maxLength={160}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Project setup guide"
                  required
                  disabled={saving || deleting}
                />
              </label>

              <div className="markdown-columns">
                <label className="feature-field">
                  Markdown editor
                  <textarea
                    className="markdown-source"
                    value={draft.content}
                    maxLength={100000}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    placeholder={
                      "# Meeting notes\n\nAdd decisions, action items, and useful links…"
                    }
                    disabled={saving || deleting}
                  />
                  <small>
                    {draft.content.length.toLocaleString()} / 100,000
                    characters
                  </small>
                </label>

                <section
                  className="markdown-preview"
                  aria-label="Rendered Markdown preview"
                >
                  <h2>Preview</h2>

                  {draft.content.trim() ? (
                    <ReactMarkdown>{draft.content}</ReactMarkdown>
                  ) : (
                    <p className="preview-placeholder">
                      Rendered preview appears here.
                    </p>
                  )}
                </section>
              </div>

              <div className="feature-actions">
                <button
                  className="feature-primary"
                  type="submit"
                  disabled={saving || deleting || Boolean(aiAction)}
                >
                  {saving
                    ? "Saving…"
                    : selectedId
                      ? "Save changes"
                      : "Create note"}
                </button>

                {selectedId && (
                  <button
                    className="feature-danger"
                    type="button"
                    onClick={deleteNote}
                    disabled={saving || deleting || Boolean(aiAction)}
                  >
                    {deleting ? "Deleting…" : "Delete note"}
                  </button>
                )}

                <button
                  type="button"
                  className="feature-secondary"
                  onClick={() => runAi("explain")}
                  disabled={Boolean(aiAction) || saving || deleting}
                >
                  {aiAction === "explain"
                    ? "Explaining…"
                    : "Explain this note"}
                </button>

                <button
                  type="button"
                  className="feature-secondary"
                  onClick={() => runAi("improve")}
                  disabled={Boolean(aiAction) || saving || deleting}
                >
                  {aiAction === "improve"
                    ? "Reviewing…"
                    : "Suggest improvements"}
                </button>
              </div>
            </form>

            {aiResult && (
              <section className="ai-result">
                <div className="notes-ai-result-heading">
                  <h2>Gemini response</h2>

                  <button
                    type="button"
                    className="feature-primary"
                    onClick={applyAiResult}
                    disabled={saving || deleting}
                  >
                    Apply AI result to editor
                  </button>
                </div>

                <p className="notes-ai-hint">
                  Applying replaces the current editor content. Your saved
                  note changes only after you click Save changes.
                </p>

                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </section>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
