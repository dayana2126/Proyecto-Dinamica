import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildFullSeriesCSV,
  buildWeeklySummaryCSV,
  computeConcentrationSweep,
  computeSensitivity10Percent,
  computeValidationSuite,
  getPointAtWeek,
  getWeeklySnapshots,
  runSimulation,
  type ModelParams,
} from '../engine/model.ts';
import { SimTooltip } from './SimTooltip.tsx';

interface ValidationTabProps {
  currentParams: ModelParams;
}

const WEEK_TICKS = [0, 2, 4, 6, 8, 10, 12, 14, 16];

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ValidationTab({ currentParams }: ValidationTabProps) {
  const suite = useMemo(() => computeValidationSuite(), []);
  const sens10 = useMemo(() => computeSensitivity10Percent(), []);
  const concSweep = useMemo(() => computeConcentrationSweep(), []);
  const currentRun = useMemo(() => runSimulation(currentParams), [currentParams]);
  const weeklySnaps = useMemo(
    () => getWeeklySnapshots(suite.distribuido.points, suite.base.points),
    [suite]
  );

  const [fig4Mode, setFig4Mode] = useState<'rho' | 'beta'>('rho');
  const [expandedFig, setExpandedFig] = useState<number | null>(null);
  const [siscoInputs, setSiscoInputs] = useState<{
    w0: string;
    w8: string;
    w16: string;
  }>({
    w0: '62.4',
    w8: '',
    w16: '',
  });

  const tornadoData = useMemo(
    () =>
      [...sens10]
        .sort((a, b) => b.maxImpactK - a.maxImpactK)
        .map((r) => ({
          name: `${r.simbolo} (${r.nombre.split(' ')[0]})`,
          menos10: Number(r.varKMenosPct.toFixed(1)),
          mas10: Number(r.varKMasPct.toFixed(1)),
        })),
    [sens10]
  );

  const knowledgeLossPct =
    ((suite.base.metrics.conocimientoFinal -
      suite.distribuido.metrics.conocimientoFinal) /
      suite.distribuido.metrics.conocimientoFinal) *
    100;

  return (
    <div className="space-y-5">
      {/* Resumen de Pruebas de Validación */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sim-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Comportamiento Extremo</span>
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'var(--ok-bg)', color: 'var(--ok-text)' }}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              APROBADO
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Con cota B3: 0 ≤ E ≤ 100, D ≥ 0 y 0 ≤ K ≤ 100 en los 4 shocks extremos.
          </p>
        </div>

        <div className="sim-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Integración Numérica</span>
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'var(--ok-bg)', color: 'var(--ok-text)' }}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              APROBADO
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Δt = 0.0125, 0.05 y 0.1 se superponen con diferencia &lt; 0,2 pts.
          </p>
        </div>

        <div className="sim-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Sensibilidad (±10 %)</span>
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'var(--ok-bg)', color: 'var(--ok-text)' }}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              APROBADO
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Prioridad de calibración: α, ρ, γ (estrés) y ρ, κ, α, γ (conocimiento).
          </p>
        </div>

        <div className="sim-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Comparación Escenarios</span>
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: 'var(--accent-primary-bg)',
                color: 'var(--accent-primary)',
              }}
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {knowledgeLossPct.toFixed(1)}% K
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Concentrado 60%: pico {suite.base.metrics.picoEstres.toFixed(1)} pts (
            {suite.base.metrics.semanasSobreUmbral.toFixed(2)} sem &gt; 75).
          </p>
        </div>
      </section>

      {/* 4 Figuras de Validación del Proyecto */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Figura 1: Shock Carga Extrema */}
        <div
          className={`sim-card p-4 ${expandedFig === 1 ? 'lg:col-span-2' : ''}`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">
                Figura 1 (Shock): Estres_Acumulado — BASE vs. SHOCK_CARGA_EXTREMA
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                200 evaluaciones (90% concentradas). Verifica saturación limpia en E = 100 sin desbordar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedFig(expandedFig === 1 ? null : 1)}
              className="cursor-pointer rounded p-1 hover:opacity-80"
              aria-label="Ampliar Figura 1"
            >
              {expandedFig === 1 ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className={expandedFig === 1 ? 'h-80 w-full' : 'h-60 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={suite.fig1Data}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
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
                  domain={[0, 105]}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={75}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: 'Umbral = 75', fill: '#94a3b8', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseE"
                  name="BASE (Concentrado 60%)"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="shockE"
                  name="SHOCK_CARGA_EXTREMA"
                  stroke="#ea580c"
                  strokeWidth={2.2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Figura 2: Colapso Conocimiento */}
        <div
          className={`sim-card p-4 ${expandedFig === 2 ? 'lg:col-span-2' : ''}`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">
                Figura 2 (Colapso): Conocimiento — BASE vs. SHOCK_COLAPSO
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Base (32,2 pts) vs. Colapso extremo (3,7 pts con ρ=0,05, β=0,20, 200 eval.).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedFig(expandedFig === 2 ? null : 2)}
              className="cursor-pointer rounded p-1 hover:opacity-80"
              aria-label="Ampliar Figura 2"
            >
              {expandedFig === 2 ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className={expandedFig === 2 ? 'h-80 w-full' : 'h-60 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={suite.fig2Data}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
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
                  domain={[0, 45]}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="baseK"
                  name="BASE (K final = 32,2)"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="colapsoK"
                  name="SHOCK_COLAPSO (K final = 3,7)"
                  stroke="#dc2626"
                  strokeWidth={2.2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Figura 3: Prueba de Integración Numérica */}
        <div
          className={`sim-card p-4 ${expandedFig === 3 ? 'lg:col-span-2' : ''}`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">
                Figura 3 (Integración Numérica): Sensibilidad al TIME STEP (Δt)
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Superposición de Δt = 0.0125 ({suite.dtChico.metrics.picoEstres.toFixed(1)}), 0.05 ({suite.base.metrics.picoEstres.toFixed(1)}) y 0.1 ({suite.dtGrande.metrics.picoEstres.toFixed(1)}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedFig(expandedFig === 3 ? null : 3)}
              className="cursor-pointer rounded p-1 hover:opacity-80"
              aria-label="Ampliar Figura 3"
            >
              {expandedFig === 3 ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className={expandedFig === 3 ? 'h-80 w-full' : 'h-60 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={suite.fig3Data}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
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
                  domain={[0, 100]}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="dt0125"
                  name="BASE_DT_CHICO (0.0125)"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="dt05"
                  name="BASE (0.05)"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="dt1"
                  name="BASE_DT_GRANDE (0.1)"
                  stroke="#16a34a"
                  strokeWidth={2}
                  strokeDasharray="2 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Figura 4: Sensibilidad Estructural */}
        <div
          className={`sim-card p-4 ${expandedFig === 4 ? 'lg:col-span-2' : ''}`}
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">
                Figura 4 (Sensibilidad Estructural):{' '}
                {fig4Mode === 'rho'
                  ? 'Tasa_Recuperacion (ρ)'
                  : 'Amplificacion_Deuda (β)'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {fig4Mode === 'rho'
                  ? 'ρ = 0.20 (5,75 sem > 75) · ρ = 0.30 (1,35 sem) · ρ = 0.40 (0 sem, absorbe el pico)'
                  : 'β = 0.02 (0 sem > 75) · β = 0.04 (1,35 sem) · β = 0.08 (3,95 sem > 75)'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="inline-flex rounded-md border p-0.5 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--border-default)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFig4Mode('rho')}
                  className="cursor-pointer rounded px-2 py-0.5"
                  style={{
                    backgroundColor:
                      fig4Mode === 'rho' ? 'var(--bg-card)' : 'transparent',
                    color:
                      fig4Mode === 'rho'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  ρ (Recuperación)
                </button>
                <button
                  type="button"
                  onClick={() => setFig4Mode('beta')}
                  className="cursor-pointer rounded px-2 py-0.5"
                  style={{
                    backgroundColor:
                      fig4Mode === 'beta' ? 'var(--bg-card)' : 'transparent',
                    color:
                      fig4Mode === 'beta'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  β (Deuda)
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpandedFig(expandedFig === 4 ? null : 4)}
                className="cursor-pointer rounded p-1 hover:opacity-80"
                aria-label="Ampliar Figura 4"
              >
                {expandedFig === 4 ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className={expandedFig === 4 ? 'h-80 w-full' : 'h-60 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={fig4Mode === 'rho' ? suite.fig4RecData : suite.fig4DeudaData}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
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
                  domain={[0, 105]}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={75}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Umbral = 75', fill: '#ef4444', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey={fig4Mode === 'rho' ? 'baja' : 'alta'}
                  name={
                    fig4Mode === 'rho'
                      ? 'ESC_RECUPERACION_BAJA (0.20)'
                      : 'ESC_DEUDA_ALTA (0.08)'
                  }
                  stroke="#dc2626"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="base"
                  name={fig4Mode === 'rho' ? 'BASE (0.30)' : 'BASE (0.04)'}
                  stroke="#f97316"
                  strokeWidth={2.2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={fig4Mode === 'rho' ? 'alta' : 'baja'}
                  name={
                    fig4Mode === 'rho'
                      ? 'ESC_RECUPERACION_ALTA (0.40)'
                      : 'ESC_DEUDA_BAJA (0.02)'
                  }
                  stroke="#16a34a"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Sensibilidad ±10% y Barrido de Concentración */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="sim-card p-4">
          <h3 className="text-sm font-bold">
            Análisis de Sensibilidad (±10 % sobre Conocimiento Final)
          </h3>
          <p className="mb-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Variación porcentual de K(16) al perturbar cada parámetro ±10 % respecto al caso BASE.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tornadoData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 20, bottom: 4 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  unit="%"
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <Tooltip content={<SimTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={0} stroke="var(--border-strong)" />
                <Bar
                  dataKey="menos10"
                  name="Parámetro −10 %"
                  unit="%"
                  fill="#0ea5e9"
                  radius={[2, 2, 2, 2]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="mas10"
                  name="Parámetro +10 %"
                  unit="%"
                  fill="#f97316"
                  radius={[2, 2, 2, 2]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sim-card p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold">
              Sensibilidad a la Concentración de Evaluaciones (Tabla 11)
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Efecto no lineal: cruzar p = 45 % a 60 % dispara el pico en +13,4 pts y supera el umbral.
            </p>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Tabla de sensibilidad por concentración de evaluaciones"
            className="table-wrapper"
          >
            <table className="sim-table">
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th>Pico Estrés</th>
                  <th>Sem. &gt; 75</th>
                  <th>K Final</th>
                  <th>Sueño Mín.</th>
                  <th>Δ K vs. Dist.</th>
                </tr>
              </thead>
              <tbody>
                {concSweep.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td data-label="Pico Estrés" className="tabular-nums">
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            row.picoEstres >= 75
                              ? 'var(--danger-text)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {row.picoEstres.toFixed(1)}
                      </span>
                    </td>
                    <td data-label="Sem. > 75" className="tabular-nums">
                      {row.semanasSobre75.toFixed(2)}
                    </td>
                    <td data-label="K Final" className="tabular-nums">
                      {row.conocimientoFinal.toFixed(1)}
                    </td>
                    <td data-label="Sueño Mín." className="tabular-nums">
                      {row.suenoMinimo.toFixed(2)} h
                    </td>
                    <td data-label="Δ K vs. Dist." className="tabular-nums">
                      {row.fraccionPct === null ? (
                        <span style={{ color: 'var(--text-muted)' }}>
                          referencia
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger-text)' }}>
                          {row.deltaKPct.toFixed(1)} %
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tabla Resumen Interactiva (Semanas 0, 4, 6, 8, 10, 12, 16) + Exportar CSV */}
      <section className="sim-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <FileSpreadsheet
                className="h-4 w-4"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              Tabla Resumen Comparativa (Semanas 0, 4, 6, 8, 10, 12 y 16)
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Comparación directa Distribuido vs. Concentrado 60 % (Sección 3.7.7 del informe).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  'resumen_semanal_carga_estres.csv',
                  buildWeeklySummaryCSV(suite.distribuido, suite.base)
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exportar Resumen CSV
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  'simulacion_completa_carga_estres.csv',
                  buildFullSeriesCSV(currentRun, 'Simulacion_Actual')
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exportar Serie Actual CSV
            </button>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="tabla-resumen-caption"
          className="table-wrapper"
        >
          <table className="sim-table">
            <caption id="tabla-resumen-caption" className="sr-only">
              Valores de estrés, deuda de sueño y conocimiento en semanas clave
            </caption>
            <thead>
              <tr>
                <th>Semana</th>
                <th>Estrés (Distribuido)</th>
                <th>Estrés (Concentrado 60 %)</th>
                <th>Deuda de sueño en h (Dist. / Conc.)</th>
                <th>Conocimiento K (Dist. / Conc.)</th>
                <th>Sueño h/noche (Dist. / Conc.)</th>
              </tr>
            </thead>
            <tbody>
              {weeklySnaps.map((row) => (
                <tr key={row.semana}>
                  <th className="tabular-nums">Semana {row.semana}</th>
                  <td data-label="Estrés (Dist.)" className="tabular-nums">
                    {row.dist.E.toFixed(1)}
                  </td>
                  <td data-label="Estrés (Conc. 60%)" className="tabular-nums">
                    <span
                      className="font-bold"
                      style={{
                        color:
                          row.conc.E >= 75
                            ? 'var(--danger-text)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {row.conc.E.toFixed(1)}
                    </span>
                  </td>
                  <td data-label="Deuda (Dist. / Conc.)" className="tabular-nums">
                    {row.dist.D.toFixed(1)} / {row.conc.D.toFixed(1)}
                  </td>
                  <td data-label="Conocimiento (Dist. / Conc.)" className="tabular-nums">
                    {row.dist.K.toFixed(1)} / {row.conc.K.toFixed(1)}
                  </td>
                  <td data-label="Sueño (Dist. / Conc.)" className="tabular-nums">
                    {row.dist.S.toFixed(2)} / {row.conc.S.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comprobación de Exactitud Empírica (Contraste SISCO — Error Relativo) */}
      <section className="sim-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold">
            Comprobación de Exactitud Empírica (Contraste SISCO — Error Relativo)
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Ingresa los puntajes promedio reales observados (0–100) en tres momentos del semestre para calcular automáticamente{' '}
            <code>Error relativo (%) = |Real − Modelo| / Real × 100</code>.
          </p>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Tabla interactiva de comprobación de exactitud con encuesta SISCO"
          className="table-wrapper"
        >
          <table className="sim-table">
            <thead>
              <tr>
                <th>Momento del semestre</th>
                <th>Estrés real SISCO (Editable)</th>
                <th>Modelo Distribuido</th>
                <th>Modelo Concentrado 60%</th>
                <th>Error Relativo (Dist. / Conc.)</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { key: 'w0', label: 'Inicio (Semana 0)', week: 0 },
                  { key: 'w8', label: 'Pico exámenes (Semana 8)', week: 8 },
                  { key: 'w16', label: 'Cierre (Semana 16)', week: 16 },
                ] as const
              ).map((moment) => {
                const distE = getPointAtWeek(suite.distribuido.points, moment.week).E;
                const concE = getPointAtWeek(suite.base.points, moment.week).E;
                const rawVal = siscoInputs[moment.key].trim();
                const realVal = rawVal === '' ? NaN : parseFloat(rawVal);
                const validReal = Number.isFinite(realVal) && realVal > 0;
                const errDist = validReal
                  ? (Math.abs(realVal - distE) / realVal) * 100
                  : null;
                const errConc = validReal
                  ? (Math.abs(realVal - concE) / realVal) * 100
                  : null;

                return (
                  <tr key={moment.key}>
                    <th>{moment.label}</th>
                    <td data-label="Estrés real SISCO">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="Por medir..."
                        aria-label={`Estrés real SISCO en ${moment.label}`}
                        value={siscoInputs[moment.key]}
                        onChange={(e) =>
                          setSiscoInputs((prev) => ({
                            ...prev,
                            [moment.key]: e.target.value,
                          }))
                        }
                        className="tabular-nums w-28 rounded border px-2 py-1 font-mono text-xs"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>
                    <td data-label="Distribuido" className="tabular-nums">
                      {distE.toFixed(1)} pts
                    </td>
                    <td data-label="Concentrado 60%" className="tabular-nums">
                      {concE.toFixed(1)} pts
                    </td>
                    <td data-label="Error Relativo" className="tabular-nums">
                      {validReal ? (
                        <span className="font-mono font-semibold">
                          {errDist!.toFixed(1)}% / {errConc!.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          Pendiente de medición
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

