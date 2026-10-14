export function Stat({
  label,
  value,
  detail,
  icon,
  tone,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: string;
  progress?: number;
}) {
  return (
    <article className={`stat-card ${tone ?? ''}`}>
      <div className="stat-label">
        {label}
        <span>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">
        {detail}
        {progress !== undefined && (
          <span className="mini-progress">
            <i style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>
    </article>
  );
}
