const STATUS_META = {
  recovered: { className: 'success', label: 'Recovered' },
  failed: { className: 'danger', label: 'Failed' },
  open: { className: 'warning', label: 'Open' },
  in_progress: { className: 'info', label: 'In Progress' },
  succeeded: { className: 'success', label: 'Success' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) {
    return <span className="badge muted">{status}</span>;
  }

  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
