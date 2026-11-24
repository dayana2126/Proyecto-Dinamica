import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { runSimulation, type ModelParams } from '../engine/model.ts';
import { SimTooltip } from './SimTooltip.tsx';

interface CustomCalendarTabProps {
  baseParams: ModelParams;
}

const CALENDAR_PRESETS: Array<{
  id: string;
  label: string;
  loads: number[];
}> = [
  {
    id: 'semestre_tipico',
    label: 'Semestre Típico (Parciales + Finales)',
    loads: [0, 0, 1, 1, 1, 1, 4, 4, 0, 1, 1, 1, 0, 1, 2, 2],
  },
  {
    id: 'concentrado_60',
    label: 'Concentrado (60% en Sem. 7–8)',
    loads: [1, 0, 1, 0, 1, 1, 6, 6, 0, 1, 0, 1, 0, 1, 0, 1],
  },
  {
    id: 'distribuido',
    label: 'Distribuido Equilibrado',
    loads: [1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2],
  },
  {
    id: 'terror_finales',
    label: 'Semana del Terror (Finales)',
    loads: [0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0, 2, 3, 5],
  },
];

const WEEK_TICKS = [0, 2, 4, 6, 8, 10, 12, 14, 16];

export function CustomCalendarTab({ baseParams }: CustomCalendarTabProps) {
  const [weeklyLoads, setWeeklyLoads] = useState<number[]>(
    CALENDAR_PRESETS[0].loads
  );

  const totalEvals = useMemo(
    () => weeklyLoads.reduce((acc, v) => acc + v, 0),
    [weeklyLoads]
  );

  const customSim = useMemo(
    () => runSimulation(baseParams, weeklyLoads),
    [baseParams, weeklyLoads]
  );

  const uniformEquivalent = useMemo(
    () =>
      runSimulation({
        ...baseParams,
        Escenario: 1,
        Total_Evaluaciones: totalEvals,
      }),
    [baseParams, totalEvals]
  );

  const chartData = useMemo(
    () =>
      customSim.points.map((pt, i) => {
        const u = uniformEquivalent.points[i];
        return {
          t: pt.t,
          E: Number(pt.E.toFixed(2)),
          E_unif: u ? Number(u.E.toFixed(2)) : undefined,
          K: Number(pt.K.toFixed(2)),
          K_unif: u ? Number(u.K.toFixed(2)) : undefined,
          D: Number(pt.D.toFixed(2)),
          C: Number(pt.C.toFixed(2)),
        };
      }),
    [customSim.points, uniformEquivalent.points]
  );

  function setWeekLoad(idx: number, val: number) {
    const clamped = Math.max(0, Math.min(15, Math.round(val)));
    setWeeklyLoads((prev) => prev.map((v, i) => (i === idx ? clamped : v)));
  }

  function handleRedistribute() {
    const baseCount = Math.floor(totalEvals / 16);
    const rem = totalEvals % 16;
    const next = Array.from({ length: 16 }, (_, i) =>
      i < rem ? baseCount + 1 : baseCount
    );
    setWeeklyLoads(next);
  }

  const crossed =
    customSim.metrics.picoEstres >= baseParams.Umbral_Agotamiento;
  const kLossPct =
    uniformEquivalent.metrics.conocimientoFinal > 0.01
      ? ((customSim.metrics.conocimientoFinal -
          uniformEquivalent.metrics.conocimientoFinal) /
          uniformEquivalent.metrics.conocimientoFinal) *
        100
      : 0;

  return (
    <div className="space-y-4">
      {/* Banner Diagnóstico del Punto de Quiebre */}
      <section
        className="sim-card flex flex-wrap items-center justify-between gap-3 p-4"
        style={{
          backgroundColor: crossed ? 'var(--danger-bg)' : 'var(--ok-bg)',
          borderColor: crossed ? 'var(--danger-border)' : 'var(--ok-border)',
        }}
      >
        <div className="flex items-start gap-3">
          {crossed ? (
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: 'var(--danger-text)' }}
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: 'var(--ok-text)' }}
              aria-hidden="true"
            />
          )}
          <div>
            <h2
              className="text-sm font-bold"
              style={{
                color: crossed ? 'var(--danger-text)' : 'var(--ok-text)',
              }}
            >
              {crossed
                ? `¡PUNTO DE QUIEBRE DETECTADO en la Semana ${customSim.metrics.primeraSemanaQuiebre?.toFixed(2)}!`
                : 'Calendario Sostenible — Sin cruce del umbral de agotamiento'}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-primary)' }}>
              Con <strong>{totalEvals} evaluaciones</strong> totales, el pico de estrés alcanza{' '}
              <strong className="tabular-nums">
                {customSim.metrics.picoEstres.toFixed(1)} pts
              </strong>{' '}
              (semana {customSim.metrics.semanaPicoEstres.toFixed(1)}), permanece{' '}
              <strong className="tabular-nums">
                {customSim.metrics.semanasSobreUmbral.toFixed(2)} semanas
              </strong>{' '}
              sobre {baseParams.Umbral_Agotamiento} pts y logra{' '}
              <strong className="tabular-nums">
                {customSim.metrics.conocimientoFinal.toFixed(1)} pts
              </strong>{' '}
              de conocimiento ({kLossPct >= 0 ? '+' : ''}
              {kLossPct.toFixed(1)}% frente a distribuir esas mismas{' '}
              {totalEvals} evaluaciones).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRedistribute}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          Redistribuir {totalEvals} eval. equilibradamente
        </button>
      </section>

      {/* Selector de Plantillas y Editor de 16 Semanas */}
      <section className="sim-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <Calendar
                className="h-4 w-4"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              Calendario Interactivo de 16 Semanas (Evaluaciones por semana)
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Asigna manualmente parciales, prácticas o entregas finales por semana usando los botones o teclando el número.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CALENDAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setWeeklyLoads(preset.loads)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--border-default)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWeeklyLoads(Array(16).fill(0))}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--danger-text)',
              }}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
          {weeklyLoads.map((count, idx) => {
            const heavy = count >= 4;
            return (
              <div
                key={idx}
                className="rounded-lg border p-2 text-center"
                style={{
                  backgroundColor: heavy ? 'var(--danger-bg)' : 'var(--bg-subtle)',
                  borderColor: heavy
                    ? 'var(--danger-border)'
                    : 'var(--border-default)',
                }}
              >
                <div
                  className="text-[11px] font-bold"
                  style={{
                    color: heavy ? 'var(--danger-text)' : 'var(--text-secondary)',
                  }}
                >
                  Sem. {idx + 1}
                </div>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    aria-label={`Restar evaluación en semana ${idx + 1}`}
                    onClick={() => setWeekLoad(idx, count - 1)}
                    className="h-6 w-6 cursor-pointer rounded border text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    aria-label={`Evaluaciones semana ${idx + 1}`}
                    value={count}
                    onChange={(e) =>
                      setWeekLoad(idx, parseInt(e.target.value || '0', 10))
                    }
                    className="tabular-nums w-9 rounded border py-0.5 text-center font-mono text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Sumar evaluación en semana ${idx + 1}`}
                    onClick={() => setWeekLoad(idx, count + 1)}
                    className="h-6 w-6 cursor-pointer rounded border text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gráficas del Calendario Personalizado */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="sim-card p-4">
          <h3 className="text-sm font-bold">
            Estrés Acumulado (E) y Carga Semanal — Tu Calendario vs. Distribuido
          </h3>
          <p className="mb-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Total evaluaciones: {totalEvals} · Equivalente uniforme:{' '}
            {(totalEvals / 16).toFixed(2)} eval./sem.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                syncId="custom-calendar"
                margin={{ top: 8, right: 0, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, 16]}
                  ticks={WEEK_TICKS}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 100]}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea
                  yAxisId="left"
                  y1={baseParams.Umbral_Agotamiento}
                  y2={100}
                  fill="#ef4444"
                  fillOpacity={0.07}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={baseParams.Umbral_Agotamiento}
                  stroke="#ef4444"
                  strokeDasharray="5 4"
                  label={{
                    value: `Umbral = ${baseParams.Umbral_Agotamiento}`,
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <Area
                  yAxisId="right"
                  type="stepAfter"
                  dataKey="C"
                  name="Carga semanal (eval.)"
                  unit="eval/sem"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.18}
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="E"
                  name="Estrés (Tu Calendario)"
                  unit="pts"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="E_unif"
                  name="Estrés (Equiv. Distribuido)"
                  unit="pts"
                  stroke="#0d9488"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sim-card p-4">
          <h3 className="text-sm font-bold">
            Conocimiento Adquirido (K) y Deuda de Sueño (D)
          </h3>
          <p className="mb-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Sueño mínimo alcanzado: {customSim.metrics.suenoMinimo.toFixed(2)} h/noche · Deuda pico:{' '}
            {customSim.metrics.deudaPico.toFixed(1)} h
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                syncId="custom-calendar"
                margin={{ top: 8, right: 0, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, 16]}
                  ticks={WEEK_TICKS}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 'auto']}
                  tick={{ fill: '#10b981', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']}
                  tick={{ fill: '#d97706', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="K"
                  name="Conocimiento K (Tu Calendario)"
                  unit="pts"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="K_unif"
                  name="Conocimiento K (Equiv. Distribuido)"
                  unit="pts"
                  stroke="#0d9488"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="D"
                  name="Deuda de Sueño (h)"
                  unit="h"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

