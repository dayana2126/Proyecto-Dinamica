interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  unit?: string;
  dataKey?: string;
}

export interface SimTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number | string;
  labelPrefix?: string;
}

export function SimTooltip({
  active,
  payload,
  label,
  labelPrefix = 'Semana',
}: SimTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const formattedLabel =
    typeof label === 'number'
      ? `${labelPrefix} ${label.toFixed(2)}`
      : `${label}`;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="mb-1 font-bold"
        style={{ color: 'var(--accent-primary)' }}
      >
        {formattedLabel}
      </div>
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                {entry.name}:
              </span>
            </span>
            <span className="tabular-nums font-mono font-semibold">
              {typeof entry.value === 'number' ? entry.value.toFixed(2) : '—'}
              {entry.unit ? ` ${entry.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

