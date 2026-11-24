import { useId, type CSSProperties } from 'react';

interface RangeSliderProps {
  label: string;
  symbol?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  formatValue?: (val: number) => string;
  onChange: (value: number) => void;
  accentColor?: string;
  disabled?: boolean;
}

export function RangeSlider({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  decimals = 2,
  formatValue,
  onChange,
  accentColor,
  disabled = false,
}: RangeSliderProps) {
  const id = useId();
  const formatted = formatValue ? formatValue(value) : value.toFixed(decimals);
  const valueText = `${formatted} ${unit}`.trim();

  const styleVars = {
    '--attr-min': min,
    '--attr-max': max,
    '--control-value': value,
    ...(accentColor ? { '--slider-fill-color': accentColor } : {}),
  } as CSSProperties;

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {symbol && (
            <span
              className="inline-flex min-w-5 items-center justify-center rounded px-1 py-0.5 font-mono text-[11px] font-bold"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent-primary)',
              }}
            >
              {symbol}
            </span>
          )}
          <span>{label}</span>
        </label>
        <span
          className="tabular-nums shrink-0 font-mono text-[11px] font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          {formatted}{' '}
          <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        </span>
      </div>

      <input
        id={id}
        type="range"
        className="sim-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        style={styleVars}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

