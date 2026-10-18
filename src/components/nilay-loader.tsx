export function NilayLoader({ label, fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return (
    <div className={`nilay-loader-wrap ${fullscreen ? "is-fullscreen" : ""}`} role="status" aria-label={label || "Loading"}>
      <div className="nilay-spinner">
        <div className="nilay-spinner-ring outer" />
        <div className="nilay-spinner-ring inner" />
        <div className="nilay-spinner-core" />
      </div>
      {label && <p className="nilay-loader-text">{label}</p>}
    </div>
  );
}

