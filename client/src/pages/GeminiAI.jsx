
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import apiRequest from "../services/api.js";
import "../styles/gemini-ai.css";

const tools = [
  {
    id: "explain",
    title: "Explain content",
    description: "Understand code or notes with Gemini AI.",
  },
  {
    id: "docs",
    title: "Generate documentation",
    description: "Turn your code into clear developer documentation.",
  },
  {
    id: "readme",
    title: "Generate README",
    description: "Create a Markdown README for your project.",
  },
];

function GeminiAI() {
  const location = useLocation();
  const projectContext = location.state || {};

  const [activeTool, setActiveTool] = useState("explain");
  const [text, setText] = useState("");
  const [kind, setKind] = useState("code");
  const [action, setAction] = useState("explain");
  const [projectDescription, setProjectDescription] = useState(
    projectContext.projectDescription || ""
  );
  const [codeOverview, setCodeOverview] = useState(
    projectContext.projectName
      ? `Project name: ${projectContext.projectName}\n\nProject description: ${
          projectContext.projectDescription || "Not provided"
        }\n\nAdd your technologies, important files, and main features here.`
      : ""
  );
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  async function handleGenerate(event) {
    event.preventDefault();
    setError("");
    setCopyMessage("");
    setResult("");
    setLoading(true);

    try {
      let endpoint;
      let body;

      if (activeTool === "explain") {
        endpoint = "/gemini/explain";
        body = { text, kind, action };
      } else if (activeTool === "docs") {
        endpoint = "/gemini/docs";
        body = { codeText: text };
      } else {
        endpoint = "/gemini/readme";
        body = {
          projectDescription: projectContext.projectName
            ? `Project name: ${projectContext.projectName}\n\n${projectDescription}`
            : projectDescription,
          codeOverview,
        };
      }

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.success || !data.result) {
        throw new Error(data.message || "Gemini did not return a result.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message || "Unable to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeTool(tool) {
    setActiveTool(tool);
    setResult("");
    setError("");
    setCopyMessage("");
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopyMessage("Copied to clipboard!");
    } catch {
      setError("Unable to copy automatically. Please select and copy the result.");
    }
  }

  return (
    <div className="collabsphere gemini-page">
      <header className="gemini-header">
        <Link className="brand" to="/dashboard">
          <span className="brand-icon">C</span>
          CollabSphere
        </Link>

        <Link className="gemini-back-link" to="/dashboard">
          ← Back to workspace
        </Link>
      </header>

      <main className="gemini-container">
        <section className="gemini-intro">
          <span className="eyebrow">AI-POWERED WORKSPACE</span>
          <h1>Your AI development assistant.</h1>
          <p>
            Explain code, generate developer documentation, and prepare
            project README files with Gemini.
          </p>

          {projectContext.projectName && (
            <div className="gemini-project-context">
              <span>WORKING WITH PROJECT</span>
              <strong>{projectContext.projectName}</strong>
              <p>
                Your project description has been passed to the README tool.
              </p>
            </div>
          )}
        </section>

        <section className="gemini-tool-grid">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`gemini-tool-card ${
                activeTool === tool.id ? "active" : ""
              }`}
              onClick={() => changeTool(tool.id)}
            >
              <span className="gemini-tool-symbol">
                {tool.id === "explain"
                  ? "</>"
                  : tool.id === "docs"
                    ? "▤"
                    : "MD"}
              </span>
              <strong>{tool.title}</strong>
              <span>{tool.description}</span>
            </button>
          ))}
        </section>

        <section className="gemini-workspace">
          <div className="gemini-workspace-heading">
            <div>
              <span className="eyebrow">GEMINI ASSISTANT</span>
              <h2>{tools.find((tool) => tool.id === activeTool)?.title}</h2>
            </div>
            <span className="gemini-model-label">Gemini AI</span>
          </div>

          <form onSubmit={handleGenerate} className="gemini-form">
            {activeTool === "explain" && (
              <>
                <label htmlFor="gemini-kind">Content type</label>
                <select
                  id="gemini-kind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                >
                  <option value="code">Code</option>
                  <option value="note">Notes</option>
                </select>

                <label htmlFor="gemini-action">What should Gemini do?</label>
                <select
                  id="gemini-action"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option value="explain">Explain this content</option>
                  <option value="improve">Suggest improvements</option>
                </select>
              </>
            )}

            {activeTool === "readme" ? (
              <>
                <label htmlFor="project-description">
                  Project description
                </label>
                <textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="Describe what your project does, who it is for, and its main features..."
                  rows={4}
                  required
                />

                <label htmlFor="code-overview">
                  Code and technology overview
                </label>
                <textarea
                  id="code-overview"
                  value={codeOverview}
                  onChange={(event) => setCodeOverview(event.target.value)}
                  placeholder="Mention your frontend, backend, database, routes, and important features..."
                  rows={6}
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="gemini-input">
                  {activeTool === "docs" ? "Paste your code" : "Your content"}
                </label>
                <textarea
                  id="gemini-input"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={
                    activeTool === "docs"
                      ? "Paste the code you want documented..."
                      : "Paste your code or notes here..."
                  }
                  rows={10}
                  required
                />
              </>
            )}

            {error && (
              <p className="gemini-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="gemini-generate-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Gemini is working..." : "✦ Generate with Gemini"}
            </button>
          </form>

          {(loading || result) && (
            <section className="gemini-result" aria-live="polite">
              <div className="gemini-result-heading">
                <div>
                  <span className="eyebrow">AI OUTPUT</span>
                  <h3>
                    {loading ? "Generating your result..." : "Generated result"}
                  </h3>
                </div>

                {result && (
                  <button
                    type="button"
                    className="gemini-copy-button"
                    onClick={copyResult}
                  >
                    Copy result
                  </button>
                )}
              </div>

              {copyMessage && (
                <p className="gemini-copy-message" role="status">
                  {copyMessage}
                </p>
              )}

              {loading ? (
                <p className="gemini-loading">
                  Please wait while Gemini processes your request.
                </p>
              ) : (
                <pre className="gemini-result-content">{result}</pre>
              )}
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

export default GeminiAI;
