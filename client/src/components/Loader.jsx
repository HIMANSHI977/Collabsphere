import "./Loader.css";

export default function Loader({ label = "Loading…" }) {
  return (
    <p className="app-loader" role="status" aria-live="polite">
      <span className="app-loader-indicator" aria-hidden="true" />
      {label}
    </p>
  );
}
