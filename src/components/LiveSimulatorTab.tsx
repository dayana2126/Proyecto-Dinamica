import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  BookOpen,
  GitCompare,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import {
  getPointAtWeek,
  runSimulation,
  type ModelParams,
  type TimeStepOption,
} from '../engine/model.ts';
import { PRESETS } from '../engine/presets.ts';
import { RangeSlider } from './RangeSlider.tsx';
import { SimTooltip } from './SimTooltip.tsx';

interface LiveSimulatorTabProps {
  params: ModelParams;
  activePresetId: string | null;
  presentationMode: boolean;
  onUpdateParam: <K extends keyof ModelParams>(
    key: K,
    value: ModelParams[K]
  ) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
}

const WEEK_TICKS = [0, 2, 4, 6, 8, 10, 12, 14, 16];

function getPhaseBadge(week: number, params: ModelParams): string {
  if (params.Escenario === 1) return 'Carga uniforme (16 semanas)';
  if (week < params.Inicio_Pico) return 'Fase 1: Pre-pico (carga ligera)';
  if (week < params.Inicio_Pico + params.Ventana_Pico)
    return 'Fase 2: Ventana pico de evaluaciones';
  return 'Fase 3: Post-pico y recuperación';
}

export function LiveSimulatorTab({
  params,
  activePresetId,
  presentationMode,
  onUpdateParam,
  onApplyPreset,
  onReset,
}: LiveSimulatorTabProps) {
  const [compareDistributed, setCompareDistributed] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reproducción animada ("sobre la marcha")
  const [playheadWeek, setPlayheadWeek] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(1);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const mainSim = useMemo(() => runSimulation(params), [params]);
  const altSim = useMemo(
    () =>
      runSimulation({
        ...params,
        Escenario: params.Escenario === 2 ? 1 : 2,
      }),
    [params]
  );

  // Animación por requestAnimationFrame (aprox. 2.5 semanas/seg a 1x)
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const elapsedSec = Math.min(0.1, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      setPlayheadWeek((prev) => {
        const next = prev + elapsedSec * 2.5 * speed;
        if (next >= params.Duracion_Semestre) {
          setIsPlaying(false);
          return params.Duracion_Semestre;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, params.Duracion_Semestre]);

  function handleTogglePlay() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (playheadWeek >= params.Duracion_Semestre - 0.05) {
      setPlayheadWeek(0);
    }
    setIsPlaying(true);
  }

  function handleRestart() {
    setIsPlaying(false);
    setPlayheadWeek(0);
  }

  function handleComplete() {
    setIsPlaying(false);
    setPlayheadWeek(params.Duracion_Semestre);
  }

  // Datos sincronizados hasta playheadWeek
  const chartData = useMemo(() => {
    const merged = mainSim.points.map((pt, idx) => {
      const altPt = altSim.points[idx];
      return {
        t: pt.t,
        E: Number(pt.E.toFixed(2)),
        E_alt: altPt ? Number(altPt.E.toFixed(2)) : undefined,
        K: Number(pt.K.toFixed(2)),
        K_alt: altPt ? Number(altPt.K.toFixed(2)) : undefined,
        D: Number(pt.D.toFixed(2)),
        S: Number(pt.S.toFixed(2)),
        C: Number(pt.C.toFixed(2)),
        fPct: Number(pt.fPct.toFixed(1)),
      };
    });
    return merged.filter((p) => p.t <= playheadWeek + 1e-6);
  }, [mainSim.points, altSim.points, playheadWeek]);

  // Indicadores actuales en playheadWeek
  const currentMainPt = useMemo(
    () => getPointAtWeek(mainSim.points, playheadWeek),
    [mainSim.points, playheadWeek]
  );
  const currentAltPt = useMemo(
    () => getPointAtWeek(altSim.points, playheadWeek),
    [altSim.points, playheadWeek]
  );

  // Estadísticas observadas hasta playheadWeek
  const liveWindowStats = useMemo(() => {
    let picoHastaAhora = -Infinity;
    let semanaPico = 0;
    let suenoMinHastaAhora = Infinity;
    let countUmbral = 0;
    let primerQuiebre: number | null = null;
    for (const pt of mainSim.points) {
      if (pt.t > playheadWeek + 1e-6) break;
      if (pt.E > picoHastaAhora) {
        picoHastaAhora = pt.E;
        semanaPico = pt.t;
      }
      if (pt.S < suenoMinHastaAhora) {
        suenoMinHastaAhora = pt.S;
      }
      if (pt.E >= params.Umbral_Agotamiento && primerQuiebre === null) {
        primerQuiebre = pt.t;
      }
      if (pt.E > params.Umbral_Agotamiento) {
        countUmbral++;
      }
    }
    return {
      picoHastaAhora,
      semanaPico,
      suenoMinHastaAhora,
      semanasSobreUmbral: Number((countUmbral * params.Dt).toFixed(2)),
      primerQuiebre,
    };
  }, [mainSim.points, playheadWeek, params.Umbral_Agotamiento, params.Dt]);

  const isCurrentlyOverThreshold = currentMainPt.E >= params.Umbral_Agotamiento;
  const crossedThreshold =
    liveWindowStats.picoHastaAhora >= params.Umbral_Agotamiento;
  const desbordePts = Math.max(
    0,
    liveWindowStats.picoHastaAhora - params.Umbral_Agotamiento
  );
  const kDiffPct =
    currentAltPt.K > 0.001
      ? ((currentMainPt.K - currentAltPt.K) / currentAltPt.K) * 100
      : 0;

  const principalPresets = PRESETS.filter((p) => p.category === 'principal');
  const shockPresets = PRESETS.filter((p) => p.category === 'shock');
  const sensPresets = PRESETS.filter((p) => p.category === 'sensibilidad');

  return (
    <div className="space-y-4">
      {/* Barra compacta exclusiva de Modo Presentación */}
      {presentationMode && (
        <div className="sim-card flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Presentación:
            </span>
            <div
              className="inline-flex rounded-lg border p-0.5"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => onUpdateParam('Escenario', 1)}
                className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor:
                    params.Escenario === 1 ? 'var(--bg-card)' : 'transparent',
                  color:
                    params.Escenario === 1
                      ? 'var(--accent-primary)'
                      : 'var(--text-secondary)',
                }}
              >
                Distribuido (1)
              </button>
              <button
                type="button"
                onClick={() => onUpdateParam('Escenario', 2)}
                className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor:
                    params.Escenario === 2 ? 'var(--bg-card)' : 'transparent',
                  color:
                    params.Escenario === 2
                      ? 'var(--accent-primary)'
                      : 'var(--text-secondary)',
                }}
              >
                Concentrado (2)
              </button>
            </div>

            <select
              aria-label="Seleccionar escenario preconfigurado"
              value={activePresetId ?? ''}
              onChange={(e) => {
                if (e.target.value) onApplyPreset(e.target.value);
              }}
              className="rounded-lg border px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Personalizado</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
              <input
                type="checkbox"
                checked={compareDistributed}
                onChange={(e) => setCompareDistributed(e.target.checked)}
                className="accent-teal-600"
              />
              <span>Comparar vs. Distribuido</span>
            </label>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Base
            </button>
          </div>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-4 ${
          presentationMode ? '' : 'lg:grid-cols-[345px_minmax(0,1fr)]'
        }`}
      >
        {/* PANEL IZQUIERDO DE CONTROLES */}
        {!presentationMode && (
          <aside className="space-y-4">
            {/* Escenario y Comparación */}
            <section className="sim-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold">
                  <SlidersHorizontal
                    className="h-4 w-4"
                    style={{ color: 'var(--accent-primary)' }}
                    aria-hidden="true"
                  />
                  Cronograma y Escenario
                </h2>
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors hover:opacity-85"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Restablecer base
                </button>
              </div>

              <div
                className="grid grid-cols-2 gap-1.5 rounded-lg p-1"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => onUpdateParam('Escenario', 1)}
                  className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      params.Escenario === 1 ? 'var(--bg-card)' : 'transparent',
                    color:
                      params.Escenario === 1
                        ? 'var(--accent-teal)'
                        : 'var(--text-secondary)',
                    boxShadow:
                      params.Escenario === 1
                        ? '0 1px 2px rgb(0 0 0 / 0.08)'
                        : 'none',
                  }}
                >
                  1 · Distribuido
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParam('Escenario', 2)}
                  className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      params.Escenario === 2 ? 'var(--bg-card)' : 'transparent',
                    color:
                      params.Escenario === 2
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                    boxShadow:
                      params.Escenario === 2
                        ? '0 1px 2px rgb(0 0 0 / 0.08)'
                        : 'none',
                  }}
                >
                  2 · Concentrado
                </button>
              </div>

              <label
                className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium"
                style={{
                  borderColor: compareDistributed
                    ? 'var(--accent-teal)'
                    : 'var(--border-default)',
                  backgroundColor: compareDistributed
                    ? 'color-mix(in srgb, var(--accent-teal) 9%, transparent)'
                    : 'transparent',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <GitCompare
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--accent-teal)' }}
                    aria-hidden="true"
                  />
                  Comparar Distribuido vs. Concentrado
                </span>
                <input
                  type="checkbox"
                  checked={compareDistributed}
                  onChange={(e) => setCompareDistributed(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-teal-600"
                />
              </label>

              {/* Paso de integración TIME STEP */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  TIME STEP (Δt):
                </span>
                <div
                  className="inline-flex rounded-lg border p-0.5"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                >
                  {([0.0125, 0.05, 0.1] as TimeStepOption[]).map((dtVal) => (
                    <button
                      key={dtVal}
                      type="button"
                      onClick={() => onUpdateParam('Dt', dtVal)}
                      className="tabular-nums cursor-pointer rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold"
                      style={{
                        backgroundColor:
                          params.Dt === dtVal
                            ? 'var(--bg-card)'
                            : 'transparent',
                        color:
                          params.Dt === dtVal
                            ? 'var(--accent-primary)'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {dtVal}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Escenarios Preconfigurados (Presets del informe) */}
            <section className="sim-card p-4 space-y-3">
              <h2 className="text-sm font-bold">
                Escenarios Preconfigurados (Informe)
              </h2>

              <div className="space-y-2">
                <div
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Principales
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {principalPresets.map((p) => {
                    const active = activePresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onApplyPreset(p.id)}
                        title={p.description}
                        className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent-primary-bg)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--accent-primary)'
                            : 'var(--border-default)',
                          color: active
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {p.shortName}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="pt-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Pruebas de Shock (Extremos)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {shockPresets.map((p) => {
                    const active = activePresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onApplyPreset(p.id)}
                        title={p.description}
                        className="cursor-pointer rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors"
                        style={{
                          backgroundColor: active
                            ? 'var(--danger-bg)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--danger-border)'
                            : 'var(--border-default)',
                          color: active
                            ? 'var(--danger-text)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="pt-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sensibilidad Estructural
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {sensPresets.map((p) => {
                    const active = activePresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onApplyPreset(p.id)}
                        title={p.description}
                        className="cursor-pointer rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent-primary-bg)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--accent-primary)'
                            : 'var(--border-default)',
                          color: active
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {p.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Controles Deslizantes Principales */}
            <section className="sim-card p-4 space-y-2.5">
              <h2 className="text-sm font-bold">Parámetros del Modelo</h2>

              <RangeSlider
                label="Fracción Concentrada"
                symbol="p"
                value={params.Fraccion_Concentrada}
                min={0.1}
                max={0.95}
                step={0.05}
                unit="%"
                formatValue={(v) => `${Math.round(v * 100)}`}
                onChange={(v) => onUpdateParam('Fraccion_Concentrada', v)}
                disabled={params.Escenario === 1}
              />

              <RangeSlider
                label="Total Evaluaciones"
                symbol="N"
                value={params.Total_Evaluaciones}
                min={0}
                max={200}
                step={1}
                unit="Eval."
                decimals={0}
                onChange={(v) => onUpdateParam('Total_Evaluaciones', v)}
              />

              <div className="grid grid-cols-2 gap-3">
                <RangeSlider
                  label="Inicio Pico"
                  value={params.Inicio_Pico}
                  min={1}
                  max={13}
                  step={0.5}
                  unit="Sem"
                  decimals={1}
                  onChange={(v) => onUpdateParam('Inicio_Pico', v)}
                  disabled={params.Escenario === 1}
                />
                <RangeSlider
                  label="Ventana Pico"
                  value={params.Ventana_Pico}
                  min={0.5}
                  max={6}
                  step={0.5}
                  unit="Sem"
                  decimals={1}
                  onChange={(v) => onUpdateParam('Ventana_Pico', v)}
                  disabled={params.Escenario === 1}
                />
              </div>

              <RangeSlider
                label="Tasa de Recuperación"
                symbol="ρ"
                value={params.Tasa_Recuperacion}
                min={0}
                max={0.8}
                step={0.01}
                unit="1/Sem"
                decimals={2}
                accentColor="#0d9488"
                onChange={(v) => onUpdateParam('Tasa_Recuperacion', v)}
              />

              <RangeSlider
                label="Amplificación Deuda"
                symbol="β"
                value={params.Amplificacion_Deuda}
                min={0}
                max={0.25}
                step={0.005}
                unit="1/Hora"
                decimals={3}
                accentColor="#d97706"
                onChange={(v) => onUpdateParam('Amplificacion_Deuda', v)}
              />

              <RangeSlider
                label="Estrés por Evaluación"
                symbol="α"
                value={params.Estres_Por_Evaluacion}
                min={0.5}
                max={10}
                step={0.1}
                unit="Pto/Eval"
                decimals={1}
                accentColor="#dc2626"
                onChange={(v) => onUpdateParam('Estres_Por_Evaluacion', v)}
              />

              <RangeSlider
                label="Estrés Inicial E(0)"
                symbol="E₀"
                value={params.Estres_Inicial}
                min={0}
                max={100}
                step={0.2}
                unit="Pto"
                decimals={1}
                onChange={(v) => onUpdateParam('Estres_Inicial', v)}
              />

              {/* Parámetros Avanzados Colapsables */}
              <div
                className="border-t pt-2"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdvanced((s) => !s)}
                  className="flex w-full cursor-pointer items-center justify-between py-1 text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-expanded={showAdvanced}
                >
                  <span>Parámetros avanzados (λ, δ, γ, H₀, μ, κ, D*)</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-2 space-y-2">
                    <RangeSlider
                      label="Estrés/Hora Estudio"
                      symbol="λ"
                      value={params.Estres_Por_Hora_Estudio}
                      min={0}
                      max={0.3}
                      step={0.01}
                      unit="Pto/H"
                      decimals={2}
                      onChange={(v) =>
                        onUpdateParam('Estres_Por_Hora_Estudio', v)
                      }
                    />
                    <RangeSlider
                      label="Eliminación Deuda"
                      symbol="δ"
                      value={params.Tasa_Eliminacion_Deuda}
                      min={0.05}
                      max={1}
                      step={0.05}
                      unit="1/Sem"
                      decimals={2}
                      onChange={(v) =>
                        onUpdateParam('Tasa_Eliminacion_Deuda', v)
                      }
                    />
                    <RangeSlider
                      label="Pérdida Sueño/Estrés"
                      symbol="γ"
                      value={params.Perdida_Sueno_Por_Estres}
                      min={0}
                      max={0.06}
                      step={0.001}
                      unit="H/N/Pto"
                      decimals={3}
                      onChange={(v) =>
                        onUpdateParam('Perdida_Sueno_Por_Estres', v)
                      }
                    />
                    <RangeSlider
                      label="Estudio Base"
                      symbol="H₀"
                      value={params.Estudio_Base}
                      min={2}
                      max={25}
                      step={1}
                      unit="H/Sem"
                      decimals={0}
                      onChange={(v) => onUpdateParam('Estudio_Base', v)}
                    />
                    <RangeSlider
                      label="Esfuerzo Compensat."
                      symbol="μ"
                      value={params.Esfuerzo_Compensatorio}
                      min={0}
                      max={0.2}
                      step={0.005}
                      unit="H/Sem/Pto"
                      decimals={3}
                      onChange={(v) =>
                        onUpdateParam('Esfuerzo_Compensatorio', v)
                      }
                    />
                    <RangeSlider
                      label="Tasa Aprendizaje"
                      symbol="κ"
                      value={params.Tasa_Aprendizaje}
                      min={0.05}
                      max={0.6}
                      step={0.01}
                      unit="Pto/H"
                      decimals={2}
                      onChange={(v) => onUpdateParam('Tasa_Aprendizaje', v)}
                    />
                    <RangeSlider
                      label="Escala Deuda"
                      symbol="D*"
                      value={params.Escala_Deuda}
                      min={15}
                      max={120}
                      step={5}
                      unit="Hora"
                      decimals={0}
                      onChange={(v) => onUpdateParam('Escala_Deuda', v)}
                    />
                    <RangeSlider
                      label="Umbral Agotamiento"
                      symbol="U"
                      value={params.Umbral_Agotamiento}
                      min={50}
                      max={95}
                      step={1}
                      unit="Pto"
                      decimals={0}
                      accentColor="#dc2626"
                      onChange={(v) => onUpdateParam('Umbral_Agotamiento', v)}
                    />
                  </div>
                )}
              </div>
            </section>
          </aside>
        )}

        {/* ÁREA PRINCIPAL DE SIMULACIÓN EN VIVO */}
        <div className="min-w-0 space-y-4">
          {/* Barra de Reproducción Animada ("Sobre la marcha") */}
          <section className="sim-card p-3.5 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      Simular
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reiniciar
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                  title="Saltar al final del semestre (semana 16)"
                >
                  <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                  Sem. 16
                </button>

                <div
                  className="inline-flex items-center rounded-lg border p-0.5"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                >
                  {([0.5, 1, 2, 4] as const).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeed(sp)}
                      className="tabular-nums cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor:
                          speed === sp ? 'var(--bg-card)' : 'transparent',
                        color:
                          speed === sp
                            ? 'var(--accent-primary)'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {sp}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className="rounded-md px-2 py-1 font-medium"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {getPhaseBadge(playheadWeek, params)}
                </span>
                <span
                  className="tabular-nums font-mono text-sm font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Sem. {playheadWeek.toFixed(2)} / {params.Duracion_Semestre}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <input
                type="range"
                aria-label="Línea de tiempo del semestre en semanas"
                className="sim-slider"
                min={0}
                max={params.Duracion_Semestre}
                step={params.Dt}
                value={playheadWeek}
                style={
                  {
                    '--attr-min': 0,
                    '--attr-max': params.Duracion_Semestre,
                    '--control-value': playheadWeek,
                  } as React.CSSProperties
                }
                onChange={(e) => {
                  setIsPlaying(false);
                  setPlayheadWeek(parseFloat(e.target.value));
                }}
              />
            </div>
          </section>

          {/* Tarjetas KPI en Tiempo Real */}
          <section
            aria-label="Indicadores clave del sistema"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {/* KPI 1: Estrés & Desborde */}
            <div
              className={`sim-card p-3.5 ${isCurrentlyOverThreshold ? 'pulse-danger' : ''}`}
              style={{
                borderColor: crossedThreshold
                  ? 'var(--danger-border)'
                  : 'var(--border-default)',
                backgroundColor: isCurrentlyOverThreshold
                  ? 'var(--danger-bg)'
                  : 'var(--bg-card)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Estrés Acumulado (E)
                </span>
                <Flame
                  className="h-4 w-4"
                  style={{
                    color: crossedThreshold
                      ? 'var(--danger-text)'
                      : 'var(--accent-primary)',
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tabular-nums text-2xl font-extrabold">
                  {currentMainPt.E.toFixed(1)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  / 100 pts
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Pico:{' '}
                  <strong className="tabular-nums">
                    {liveWindowStats.picoHastaAhora.toFixed(1)}
                  </strong>{' '}
                  (sem. {liveWindowStats.semanaPico.toFixed(1)})
                </span>
                {crossedThreshold ? (
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold"
                    style={{
                      backgroundColor: 'var(--danger-bg)',
                      color: 'var(--danger-text)',
                      border: '1px solid var(--danger-border)',
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    DESBORDE +{desbordePts.toFixed(1)}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold"
                    style={{
                      backgroundColor: 'var(--ok-bg)',
                      color: 'var(--ok-text)',
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Bajo umbral ({params.Umbral_Agotamiento})
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Punto de Quiebre y Semanas sobre Umbral */}
            <div className="sim-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Exposición al Agotamiento
                </span>
                <AlertTriangle
                  className="h-4 w-4"
                  style={{
                    color:
                      liveWindowStats.semanasSobreUmbral > 0
                        ? 'var(--danger-text)'
                        : 'var(--ok-text)',
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tabular-nums text-2xl font-extrabold">
                  {liveWindowStats.semanasSobreUmbral.toFixed(2)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  sem. sobre {params.Umbral_Agotamiento} pts
                </span>
              </div>
              <div
                className="mt-1.5 text-[11px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {liveWindowStats.primerQuiebre !== null ? (
                  <span style={{ color: 'var(--danger-text)' }}>
                    <strong>PUNTO DE QUIEBRE:</strong> Sem.{' '}
                    {liveWindowStats.primerQuiebre.toFixed(2)}
                  </span>
                ) : (
                  <span>Sin cruce del punto de quiebre</span>
                )}
              </div>
            </div>

            {/* KPI 3: Sueño y Deuda */}
            <div className="sim-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Sueño (S) y Deuda (D)
                </span>
                <Moon
                  className="h-4 w-4 text-violet-500"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 flex items-baseline gap-3">
                <div>
                  <span className="tabular-nums text-2xl font-extrabold">
                    {currentMainPt.S.toFixed(2)}
                  </span>
                  <span
                    className="ml-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    h/noche
                  </span>
                </div>
                <span
                  className="tabular-nums rounded px-1.5 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--warn-bg)',
                    color: 'var(--warn-text)',
                  }}
                >
                  Deuda: {currentMainPt.D.toFixed(1)} h
                </span>
              </div>
              <div
                className="mt-1.5 text-[11px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Mín. sueño observado:{' '}
                <strong className="tabular-nums">
                  {liveWindowStats.suenoMinHastaAhora.toFixed(2)} h/noche
                </strong>
              </div>
            </div>

            {/* KPI 4: Conocimiento Adquirido */}
            <div className="sim-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Conocimiento Adquirido (K)
                </span>
                <BookOpen
                  className="h-4 w-4 text-emerald-500"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tabular-nums text-2xl font-extrabold">
                  {currentMainPt.K.toFixed(1)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  / 100 pts
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {params.Escenario === 2 ? 'Distribuido' : 'Concentrado'}:{' '}
                  <strong className="tabular-nums">
                    {currentAltPt.K.toFixed(1)}
                  </strong>
                </span>
                <span
                  className="tabular-nums rounded px-1.5 py-0.5 font-bold"
                  style={{
                    backgroundColor:
                      kDiffPct < -0.5
                        ? 'var(--danger-bg)'
                        : kDiffPct > 0.5
                          ? 'var(--ok-bg)'
                          : 'var(--bg-subtle)',
                    color:
                      kDiffPct < -0.5
                        ? 'var(--danger-text)'
                        : kDiffPct > 0.5
                          ? 'var(--ok-text)'
                          : 'var(--text-secondary)',
                  }}
                >
                  {kDiffPct >= 0 ? '+' : ''}
                  {kDiffPct.toFixed(1)}% vs.{' '}
                  {params.Escenario === 2 ? 'dist.' : 'conc.'}
                </span>
              </div>
            </div>
          </section>

          {/* 4 Gráficas Sincronizadas Estilo Vensim */}
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Gráfica 1: Estrés Acumulado */}
            <div className="sim-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">
                    1. Estres_Acumulado (E) vs. Tiempo
                  </h3>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Escala 0–100 pts · Zona roja indica punto de quiebre (≥{' '}
                    {params.Umbral_Agotamiento})
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    syncId="simulador-live"
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, params.Duracion_Semestre]}
                      ticks={WEEK_TICKS}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <Tooltip content={<SimTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceArea
                      y1={params.Umbral_Agotamiento}
                      y2={100}
                      fill="#ef4444"
                      fillOpacity={0.08}
                    />
                    <ReferenceLine
                      y={params.Umbral_Agotamiento}
                      stroke="#ef4444"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Umbral = ${params.Umbral_Agotamiento}`,
                        position: 'insideTopRight',
                        fill: '#ef4444',
                        fontSize: 10,
                      }}
                    />
                    {playheadWeek < params.Duracion_Semestre && (
                      <ReferenceLine
                        x={playheadWeek}
                        stroke="var(--accent-primary)"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="E"
                      name={
                        params.Escenario === 2
                          ? 'Estrés (Concentrado)'
                          : 'Estrés (Distribuido)'
                      }
                      unit="pts"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    {compareDistributed && (
                      <Line
                        type="monotone"
                        dataKey="E_alt"
                        name={
                          params.Escenario === 2
                            ? 'Estrés (Ref. Distribuido)'
                            : 'Estrés (Ref. Concentrado)'
                        }
                        unit="pts"
                        stroke="#0d9488"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 2: Conocimiento Adquirido */}
            <div className="sim-card p-4">
              <div className="mb-2">
                <h3 className="text-sm font-bold">
                  2. Conocimiento Adquirido (K) vs. Tiempo
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Proporción acumulada del contenido del semestre (Puntos)
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    syncId="simulador-live"
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, params.Duracion_Semestre]}
                      ticks={WEEK_TICKS}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <Tooltip content={<SimTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {playheadWeek < params.Duracion_Semestre && (
                      <ReferenceLine
                        x={playheadWeek}
                        stroke="var(--accent-primary)"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="K"
                      name="Conocimiento K (Actual)"
                      unit="pts"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    {compareDistributed && (
                      <Line
                        type="monotone"
                        dataKey="K_alt"
                        name={
                          params.Escenario === 2
                            ? 'Conocimiento K (Distribuido)'
                            : 'Conocimiento K (Concentrado)'
                        }
                        unit="pts"
                        stroke="#0d9488"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 3: Deuda de Sueño y Horas de Sueño */}
            <div className="sim-card p-4">
              <div className="mb-2">
                <h3 className="text-sm font-bold">
                  3. Deuda_Sueno (D) y Horas_Sueno (S)
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Eje izq.: Deuda acumulada (Horas) · Eje der.: Sueño nocturno
                  (4–8 h/noche)
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    syncId="simulador-live"
                    margin={{ top: 8, right: 0, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, params.Duracion_Semestre]}
                      ticks={WEEK_TICKS}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 'auto']}
                      tick={{ fill: '#d97706', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[4, 8.2]}
                      tick={{ fill: '#8b5cf6', fontSize: 11 }}
                    />
                    <Tooltip content={<SimTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {playheadWeek < params.Duracion_Semestre && (
                      <ReferenceLine
                        yAxisId="left"
                        x={playheadWeek}
                        stroke="var(--accent-primary)"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="D"
                      name="Deuda de Sueño (D)"
                      unit="h"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="S"
                      name="Horas de Sueño (S)"
                      unit="h/noche"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 4: Carga Académica y Eficiencia de Retención */}
            <div className="sim-card p-4">
              <div className="mb-2">
                <h3 className="text-sm font-bold">
                  4. Carga_Academica (C) y Eficiencia_Retencion (f)
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Eje izq.: Evaluaciones/semana · Eje der.: Retención cognitiva
                  (0–100%)
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    syncId="simulador-live"
                    margin={{ top: 8, right: 0, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, params.Duracion_Semestre]}
                      ticks={WEEK_TICKS}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 'auto']}
                      tick={{ fill: '#3b82f6', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fill: '#059669', fontSize: 11 }}
                    />
                    <Tooltip content={<SimTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {playheadWeek < params.Duracion_Semestre && (
                      <ReferenceLine
                        yAxisId="left"
                        x={playheadWeek}
                        stroke="var(--accent-primary)"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Area
                      yAxisId="left"
                      type="stepAfter"
                      dataKey="C"
                      name="Carga Académica (C)"
                      unit="eval/sem"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="fPct"
                      name="Eficiencia Retención (f)"
                      unit="%"
                      stroke="#059669"
                      strokeWidth={2.2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
