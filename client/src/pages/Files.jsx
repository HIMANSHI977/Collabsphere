
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import apiRequest, { apiFetch } from "../services/api.js";
import "../styles/features.css";
import "../styles/files.css";

const acceptedFiles =
  ".png,.jpg,.jpeg,.gif,.webp,.txt,.md,.json,.js,.jsx,.ts,.tsx,.html,.css,.py,.java,.c,.h,.cpp,.go,.rs,.sh";

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileId(file) {
  return file?._id || file?.id;
}

function getFileName(file) {
  return file?.originalName || file?.filename || file?.name || "Untitled file";
}

function isImageFile(file) {
  return (
    file?.mimeType?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(getFileName(file))
  );
}

function isTextFile(file) {
  return (
    file?.mimeType?.startsWith("text/") ||
    /\.(txt|md|json|js|jsx|ts|tsx|html|css|py|java|c|h|cpp|go|rs|sh)$/i.test(
      getFileName(file)
    )
  );
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed with status ${response.status}.`
    );
  }

  return data;
}

export default function Files() {
  const { id: projectId } = useParams();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [upload, setUpload] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const inputRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [projectData, filesData] = await Promise.all([
          apiRequest(`/projects/${projectId}`),
          apiRequest(`/files?projectId=${encodeURIComponent(projectId)}`),
        ]);

        if (cancelled) return;

        const loadedProject =
          projectData.project || projectData.data || projectData;

        const loadedFiles = Array.isArray(filesData.files)
          ? filesData.files
          : Array.isArray(filesData.data)
            ? filesData.data
            : [];

        setProject(loadedProject);
        setFiles(loadedFiles);

        setSelectedFile((current) => {
          if (!current) return null;

          return (
            loadedFiles.find(
              (file) => getFileId(file) === getFileId(current)
            ) || null
          );
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Unable to load project files.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearPreview() {
    setPreview(null);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
  }

  async function uploadFile(event) {
    event.preventDefault();

    if (!projectId) {
      setError("Project ID is missing.");
      return;
    }

    if (!upload) {
      setError("Please choose a file first.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", upload);
      formData.append("projectId", projectId);

      const response = await apiFetch("/files", {
        method: "POST",
        body: formData,
      });

      const data = await readResponse(response);
      const uploadedFile = data.file || data.data;

      if (uploadedFile) {
        setFiles((currentFiles) => [
          uploadedFile,
          ...currentFiles.filter(
            (file) => getFileId(file) !== getFileId(uploadedFile)
          ),
        ]);
        setSelectedFile(uploadedFile);
      } else {
        const refreshed = await apiRequest(
          `/files?projectId=${encodeURIComponent(projectId)}`
        );

        setFiles(
          Array.isArray(refreshed.files)
            ? refreshed.files
            : Array.isArray(refreshed.data)
              ? refreshed.data
              : []
        );
      }

      setUpload(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      clearPreview();
      setAiResult("");
      setNotice("File uploaded successfully.");
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload this file.");
    } finally {
      setBusy(false);
    }
  }

  async function openPreview(file) {
    setSelectedFile(file);
    setError("");
    setNotice("");
    setAiResult("");
    clearPreview();

    const fileId = getFileId(file);

    if (!fileId) {
      setError("This file does not have a valid ID.");
      return;
    }

    try {
      if (isImageFile(file)) {
        const response = await apiFetch(`/files/${fileId}?inline=true`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Unable to preview this image.");
        }

        const blob = await response.blob();
        setPreviewUrl(URL.createObjectURL(blob));
        setPreview("image");
        return;
      }

      if (isTextFile(file)) {
        const data = await apiRequest(`/files/${fileId}/content`);

        const content =
          typeof data.content === "string"
            ? data.content
            : typeof data.text === "string"
              ? data.text
              : "";

        setPreview(content);
        return;
      }

      setPreview("unsupported");
    } catch (previewError) {
      setError(previewError.message || "Unable to preview this file.");
    }
  }

  async function downloadFile(file) {
    setError("");
    setNotice("");

    try {
      const fileId = getFileId(file);

      if (!fileId) {
        throw new Error("This file does not have a valid ID.");
      }

      const response = await apiFetch(`/files/${fileId}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download this file.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = getFileName(file);
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download this file.");
    }
  }

  async function deleteFile(file) {
    const fileName = getFileName(file);

    if (!window.confirm(`Delete "${fileName}" from this project?`)) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const fileId = getFileId(file);

      if (!fileId) {
        throw new Error("This file does not have a valid ID.");
      }

      const response = await apiFetch(`/files/${fileId}`, {
        method: "DELETE",
      });

      await readResponse(response);

      setFiles((currentFiles) =>
        currentFiles.filter((item) => getFileId(item) !== fileId)
      );

      if (getFileId(selectedFile) === fileId) {
        setSelectedFile(null);
        clearPreview();
        setAiResult("");
      }

      setNotice("File deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete this file.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCodeAi(action) {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    if (aiBusy) return;

    setAiBusy(action);
    setError("");
    setNotice("");
    setAiResult("");

    try {
      const fileId = getFileId(selectedFile);

      if (!fileId) {
        throw new Error("This file does not have a valid ID.");
      }

      const contentData = await apiRequest(
        `/files/${fileId}/content?ai=true`
      );

      const content =
        typeof contentData.content === "string"
          ? contentData.content
          : typeof contentData.text === "string"
            ? contentData.text
            : "";

      if (!content.trim()) {
        throw new Error(
          "No readable text was found in this file. Please select a text or code file."
        );
      }

      let endpoint;
      let body;

      if (action === "explain") {
        endpoint = "/gemini/explain";
        body = {
          text: content,
          kind: "code",
        };
      } else if (action === "docs") {
        endpoint = "/gemini/docs";
        body = {
          codeText: content,
        };
      } else {
        endpoint = "/gemini/readme";
        body = {
          projectDescription:
            project?.description ||
            `Project: ${project?.name || "Untitled project"}. Uploaded file: ${getFileName(selectedFile)}.`,
          codeOverview: [
            `Project name: ${project?.name || "Untitled project"}`,
            `File name: ${getFileName(selectedFile)}`,
            "Generate a README based on the following file content.",
            "",
            content,
          ].join("\n"),
        };
      }

      const result = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const generatedText =
        result.result ||
        result.response ||
        result.explanation ||
        result.documentation ||
        result.readme ||
        result.text ||
        result.content ||
        result.data?.result ||
        result.data?.response ||
        result.data?.text ||
        "";

      if (typeof generatedText !== "string" || !generatedText.trim()) {
        throw new Error(
          "Gemini did not return any text. Please try again."
        );
      }

      setAiResult(generatedText);

      setNotice(
        action === "readme"
          ? "README generated successfully."
          : action === "docs"
            ? "Documentation generated successfully."
            : "Code explanation generated successfully."
      );
    } catch (aiError) {
      setError(aiError.message || "Unable to generate an AI response.");
    } finally {
      setAiBusy("");
    }
  }

  async function copyAiResult() {
    if (!aiResult) return;

    try {
      await navigator.clipboard.writeText(aiResult);
      setNotice("AI response copied to clipboard.");
      setError("");
    } catch {
      setError(
        "Unable to copy automatically. Please select and copy the generated text."
      );
    }
  }

  async function saveReadmeAsNote() {
    if (!aiResult.trim()) {
      setError("Generate a README before saving it.");
      return;
    }

    if (!projectId) {
      setError("Project ID is missing.");
      return;
    }

    if (aiBusy) return;

    setAiBusy("saving-note");
    setError("");
    setNotice("");

    try {
      const title = `README - ${
        project?.name || getFileName(selectedFile) || "Project"
      }`;

      const data = await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          title: title.slice(0, 160),
          content: aiResult,
        }),
      });

      if (!data.success && !data.note) {
        throw new Error(data.message || "Unable to save the project note.");
      }

      setNotice("README saved as a project note successfully.");
    } catch (saveError) {
      setError(
        saveError.message || "Unable to save the README as a project note."
      );
    } finally {
      setAiBusy("");
    }
  }

  if (!projectId) {
    return (
      <main className="feature-page files-page">
        <div className="feature-alert feature-alert-error" role="alert">
          Project ID is missing. Please open Files from a specific project.
        </div>
        <Link to="/dashboard" className="feature-back-link">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="feature-page files-page">
      <header className="feature-header">
        <div>
          <Link
            to={`/projects/${projectId}`}
            className="feature-back-link"
          >
            ← Back to project
          </Link>

          <p className="feature-eyebrow">PROJECT WORKSPACE</p>
          <h1>Project Files</h1>
          <p className="feature-description">
            Upload, preview, and manage project files. Use Gemini to
            understand code and generate documentation.
          </p>

          {project && (
            <p className="feature-state">
              Project: {project.name || "Untitled project"}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="feature-alert feature-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="feature-alert feature-alert-success" role="status">
          {notice}
        </div>
      )}

      <section className="feature-card files-upload-card">
        <div className="feature-section-heading">
          <div>
            <h2>Upload a file</h2>
            <p>Add code, documentation, or images to this project.</p>
          </div>
        </div>

        <form onSubmit={uploadFile} className="files-upload-form">
          <label htmlFor="project-file" className="feature-label">
            Choose a file
          </label>

          <input
            ref={inputRef}
            id="project-file"
            type="file"
            accept={acceptedFiles}
            onChange={(event) =>
              setUpload(event.target.files?.[0] || null)
            }
            disabled={busy}
          />

          {upload && (
            <p className="feature-state">
              Selected: {upload.name} ({formatFileSize(upload.size)})
            </p>
          )}

          <button
            type="submit"
            className="feature-primary"
            disabled={busy || !upload}
          >
            {busy ? "Please wait…" : "Upload file"}
          </button>
        </form>
      </section>

      <div className="files-workspace">
        <section className="feature-card files-list-card">
          <div className="feature-section-heading">
            <div>
              <h2>Files</h2>
              <p>
                {files.length} {files.length === 1 ? "file" : "files"} in
                this project
              </p>
            </div>
          </div>

          {loading ? (
            <p className="feature-state">Loading project files…</p>
          ) : files.length === 0 ? (
            <div className="feature-empty">
              <h3>No files yet</h3>
              <p>Upload your first file to get started.</p>
            </div>
          ) : (
            <div className="files-list">
              {files.map((file) => {
                const fileId = getFileId(file);
                const isSelected =
                  getFileId(selectedFile) === fileId;

                return (
                  <article
                    key={fileId}
                    className={`files-list-item ${
                      isSelected ? "is-selected" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="files-select-button"
                      onClick={() => openPreview(file)}
                    >
                      <span className="files-file-icon" aria-hidden="true">
                        {isImageFile(file)
                          ? "▧"
                          : isTextFile(file)
                            ? "‹ ›"
                            : "▤"}
                      </span>

                      <span className="files-file-details">
                        <strong>{getFileName(file)}</strong>
                        <small>
                          {formatFileSize(file.size || file.fileSize || 0)}
                        </small>
                      </span>
                    </button>

                    <div className="files-item-actions">
                      <button
                        type="button"
                        className="feature-secondary"
                        onClick={() => downloadFile(file)}
                        disabled={busy}
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        className="feature-secondary files-delete-button"
                        onClick={() => deleteFile(file)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="feature-card files-preview-card">
          <div className="feature-section-heading">
            <div>
              <h2>File preview</h2>
              <p>
                {selectedFile
                  ? getFileName(selectedFile)
                  : "Select a file to preview its contents."}
              </p>
            </div>
          </div>

          {!selectedFile ? (
            <div className="feature-empty">
              <p>Select a file from the list to see its contents.</p>
            </div>
          ) : preview === "image" && previewUrl ? (
            <div className="files-image-preview">
              <img src={previewUrl} alt={getFileName(selectedFile)} />
            </div>
          ) : typeof preview === "string" ? (
            <pre className="files-text-preview">
              <code>{preview}</code>
            </pre>
          ) : preview === "unsupported" ? (
            <div className="feature-empty">
              <p>
                Preview is not available for this file type. You can still
                download it.
              </p>
            </div>
          ) : (
            <div className="feature-empty">
              <p>Choose a file to preview its contents.</p>
            </div>
          )}

          {selectedFile && (
            <div className="files-ai-tools">
              <div className="feature-section-heading">
                <div>
                  <h2>Gemini AI tools</h2>
                  <p>
                    Generate an explanation, documentation, or a README
                    from your selected code file.
                  </p>
                </div>
              </div>

              <div className="feature-actions files-ai-actions">
                <button
                  type="button"
                  className="feature-primary"
                  onClick={() => requestCodeAi("explain")}
                  disabled={Boolean(aiBusy) || busy}
                >
                  {aiBusy === "explain"
                    ? "Explaining…"
                    : "Explain this code"}
                </button>

                <button
                  type="button"
                  className="feature-secondary"
                  onClick={() => requestCodeAi("docs")}
                  disabled={Boolean(aiBusy) || busy}
                >
                  {aiBusy === "docs"
                    ? "Generating…"
                    : "Generate documentation"}
                </button>

                <button
                  type="button"
                  className="feature-secondary"
                  onClick={() => requestCodeAi("readme")}
                  disabled={Boolean(aiBusy) || busy}
                >
                  {aiBusy === "readme"
                    ? "Generating README…"
                    : "Generate README"}
                </button>
              </div>
            </div>
          )}

          {aiResult && (
            <section className="ai-result">
              <div className="files-ai-result-heading">
                <h2>Gemini response</h2>

                <button
                  type="button"
                  className="feature-secondary"
                  onClick={copyAiResult}
                >
                  Copy result
                </button>
              </div>

              <ReactMarkdown>{aiResult}</ReactMarkdown>

              {aiBusy === "saving-note" ? (
                <p className="feature-state">Saving project note…</p>
              ) : (
                <div className="feature-actions">
                  <button
                    type="button"
                    className="feature-primary"
                    onClick={saveReadmeAsNote}
                    disabled={Boolean(aiBusy)}
                  >
                    Save as project note
                  </button>
                </div>
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
