import { useMemo, useState } from 'react';
import {
  BookMarked,
  GitBranch,
  HelpCircle,
  Lock,
  Search,
  Sigma,
} from 'lucide-react';
import {
  DEFENSE_QA,
  EQUATIONS_LIST,
  FEEDBACK_LOOPS,
  MAGNITUDES_TABLE,
  PROJECT_META,
  type FeedbackLoopInfo,
} from '../data/reportData.ts';

interface ClNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  isStock?: boolean;
}

const CL_NODES: ClNode[] = [
  { id: 'C', label: 'Carga Académica', sub: 'C(t)', x: 85, y: 75 },
  { id: 'Gb', label: 'Gen. Bruta', sub: 'Gb', x: 245, y: 75 },
  { id: 'G', label: 'Gen. Estrés', sub: 'G', x: 405, y: 75 },
  { id: 'E', label: 'Estrés Acumulado', sub: 'E (Nivel)', x: 565, y: 75, isStock: true },
  { id: 'R', label: 'Recuperación', sub: 'R', x: 745, y: 75 },
  { id: 'RP', label: 'Riesgo de Pausa', sub: 'B2 (conceptual)', x: 245, y: 175 },
  { id: 'S', label: 'Horas de Sueño', sub: 'S', x: 710, y: 205 },
  { id: 'D', label: 'Deuda de Sueño', sub: 'D (Nivel)', x: 485, y: 205, isStock: true },
  { id: 'f', label: 'Eficiencia Ret.', sub: 'f(E)', x: 565, y: 315 },
  { id: 'A', label: 'Aprendizaje', sub: 'A', x: 375, y: 315 },
  { id: 'K', label: 'Conocimiento', sub: 'K (Nivel)', x: 185, y: 315, isStock: true },
  { id: 'H', label: 'Horas de Estudio', sub: 'H', x: 115, y: 195 },
];

interface ClEdge {
  id: string;
  from: string;
  to: string;
  sign: '+' | '−';
  curve?: number;
  dashed?: boolean;
}

const CL_EDGES: ClEdge[] = [
  { id: 'C->Gb', from: 'C', to: 'Gb', sign: '+' },
  { id: 'Gb->G', from: 'Gb', to: 'G', sign: '+' },
  { id: 'G->E', from: 'G', to: 'E', sign: '+' },
  { id: 'E->G', from: 'E', to: 'G', sign: '−', curve: -42 },
  { id: 'E->R', from: 'E', to: 'R', sign: '+', curve: -28 },
  { id: 'R->E', from: 'R', to: 'E', sign: '−', curve: 28 },
  { id: 'E->S', from: 'E', to: 'S', sign: '−', curve: 18 },
  { id: 'S->R', from: 'S', to: 'R', sign: '+' },
  { id: 'S->D', from: 'S', to: 'D', sign: '−' },
  { id: 'D->Gb', from: 'D', to: 'Gb', sign: '+', curve: -22 },
  { id: 'D->A', from: 'D', to: 'A', sign: '−' },
  { id: 'E->f', from: 'E', to: 'f', sign: '−' },
  { id: 'f->A', from: 'f', to: 'A', sign: '+' },
  { id: 'A->K', from: 'A', to: 'K', sign: '+' },
  { id: 'K->H', from: 'K', to: 'H', sign: '−' },
  { id: 'H->Gb', from: 'H', to: 'Gb', sign: '+', curve: -18 },
  { id: 'H->A', from: 'H', to: 'A', sign: '+', curve: 24 },
  { id: 'E->RP', from: 'E', to: 'RP', sign: '+', dashed: true, curve: 18 },
  { id: 'RP->C', from: 'RP', to: 'C', sign: '−', dashed: true },
];

function computeEdgePath(a: ClNode, b: ClNode, curve = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const padStart = 42;
  const padEnd = 46;
  const sx = a.x + ux * padStart;
  const sy = a.y + uy * padStart;
  const ex = b.x - ux * padEnd;
  const ey = b.y - uy * padEnd;

  const mx = (sx + ex) / 2 - uy * curve;
  const my = (sy + ey) / 2 + ux * curve;

  const lx = (sx + 2 * mx + ex) / 4;
  const ly = (sy + 2 * my + ey) / 4;

  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    lx,
    ly,
  };
}

export function ModelDefenseTab() {
  const [selectedLoop, setSelectedLoop] = useState<FeedbackLoopInfo>(
    FEEDBACK_LOOPS[0]
  );
  const [diagramView, setDiagramView] = useState<'causal' | 'forrester'>(
    'causal'
  );
  const [magFilter, setMagFilter] = useState<'ALL' | 'N' | 'F' | 'A' | 'T'>(
    'ALL'
  );
  const [magSearch, setMagSearch] = useState('');

  const filteredMagnitudes = useMemo(() => {
    const q = magSearch.trim().toLowerCase();
    return MAGNITUDES_TABLE.filter((item) => {
      if (magFilter !== 'ALL' && item.clase !== magFilter) return false;
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.simbolo.toLowerCase().includes(q) ||
        item.definicion.toLowerCase().includes(q) ||
        item.unidades.toLowerCase().includes(q)
      );
    });
  }, [magFilter, magSearch]);

  const nodeMap = useMemo(
    () => new Map(CL_NODES.map((n) => [n.id, n])),
    []
  );

  return (
    <div className="space-y-5">
      {/* Encabezado Temático del Modelo */}
      <section className="sim-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              {PROJECT_META.enfoque}
            </div>
            <h2 className="mt-0.5 text-base font-bold sm:text-lg">
              {PROJECT_META.titulo}
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {PROJECT_META.descripcion}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_META.pilares.map((pilar) => (
              <span
                key={pilar}
                className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {pilar}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Diagrama Causal Interactivo y los 6+1 Bucles */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="sim-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold">
                <GitBranch
                  className="h-4 w-4"
                  style={{ color: 'var(--accent-primary)' }}
                  aria-hidden="true"
                />
                {diagramView === 'causal'
                  ? 'Diagrama Causal (Haz clic en un bucle para resaltarlo)'
                  : 'Diagrama de Forrester (Niveles, Flujos y Auxiliares)'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {diagramView === 'causal'
                  ? 'Rectángulos = Niveles (E, D, K) · Línea discontinua = Bucle B2 conceptual'
                  : 'Representación hidrodinámica: rectángulos = niveles, válvulas = flujos, nubes = fuentes/sumideros'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-lg border p-0.5 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--border-default)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDiagramView('causal')}
                  className="cursor-pointer rounded-md px-2.5 py-1"
                  style={{
                    backgroundColor:
                      diagramView === 'causal'
                        ? 'var(--bg-card)'
                        : 'transparent',
                    color:
                      diagramView === 'causal'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Diagrama Causal
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramView('forrester')}
                  className="cursor-pointer rounded-md px-2.5 py-1"
                  style={{
                    backgroundColor:
                      diagramView === 'forrester'
                        ? 'var(--bg-card)'
                        : 'transparent',
                    color:
                      diagramView === 'forrester'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Diagrama de Forrester
                </button>
              </div>
              {diagramView === 'causal' && (
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: selectedLoop.tipo.includes('Explosivo')
                      ? 'var(--danger-bg)'
                      : 'var(--ok-bg)',
                    color: selectedLoop.tipo.includes('Explosivo')
                      ? 'var(--danger-text)'
                      : 'var(--ok-text)',
                  }}
                >
                  {selectedLoop.id} · {selectedLoop.tipo}
                </span>
              )}
            </div>
          </div>

          <div
            className="overflow-x-auto rounded-lg border p-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
            }}
          >
            {diagramView === 'causal' ? (
              <svg
                viewBox="0 0 830 375"
                className="h-auto min-w-[640px] w-full"
                role="img"
                aria-label="Diagrama causal interactivo del sistema de estrés estudiantil"
              >
                <defs>
                  <marker
                    id="arrow-muted"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M 0 1 L 10 5 L 0 9 z"
                      fill={
                        selectedLoop.tipo.includes('Explosivo')
                          ? '#dc2626'
                          : '#0d9488'
                      }
                    />
                  </marker>
                </defs>

                {CL_EDGES.map((edge) => {
                  const from = nodeMap.get(edge.from);
                  const to = nodeMap.get(edge.to);
                  if (!from || !to) return null;
                  const active = selectedLoop.highlightEdges.includes(edge.id);
                  const { d, lx, ly } = computeEdgePath(from, to, edge.curve);
                  const activeStroke = selectedLoop.tipo.includes('Explosivo')
                    ? '#dc2626'
                    : '#0d9488';

                  return (
                    <g key={edge.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke={active ? activeStroke : '#94a3b8'}
                        strokeWidth={active ? 2.6 : 1.3}
                        strokeOpacity={active ? 1 : 0.4}
                        strokeDasharray={edge.dashed ? '5 4' : undefined}
                        markerEnd={
                          active ? 'url(#arrow-active)' : 'url(#arrow-muted)'
                        }
                      />
                      <circle
                        cx={lx}
                        cy={ly}
                        r={9}
                        fill={
                          active
                            ? activeStroke
                            : edge.sign === '+'
                              ? '#e0f2fe'
                              : '#fee2e2'
                        }
                        opacity={active ? 1 : 0.9}
                      />
                      <text
                        x={lx}
                        y={ly + 3.5}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill={
                          active
                            ? '#ffffff'
                            : edge.sign === '+'
                              ? '#0369a1'
                              : '#b91c1c'
                        }
                      >
                        {edge.sign}
                      </text>
                    </g>
                  );
                })}

                {CL_NODES.map((node) => {
                  const active = selectedLoop.highlightNodes.includes(node.id);
                  const activeBorder = selectedLoop.tipo.includes('Explosivo')
                    ? '#dc2626'
                    : '#0d9488';

                  return (
                    <g key={node.id}>
                      <rect
                        x={node.x - 56}
                        y={node.y - 22}
                        width={112}
                        height={44}
                        rx={node.isStock ? 4 : 16}
                        fill={
                          node.isStock
                            ? active
                              ? 'var(--accent-primary-bg)'
                              : 'var(--bg-subtle)'
                            : 'var(--bg-card)'
                        }
                        stroke={
                          active
                            ? activeBorder
                            : node.isStock
                              ? 'var(--accent-primary)'
                              : 'var(--border-strong)'
                        }
                        strokeWidth={active ? 2.6 : node.isStock ? 2 : 1.2}
                      />
                      <text
                        x={node.x}
                        y={node.y - 3}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {node.label}
                      </text>
                      {node.sub && (
                        <text
                          x={node.x}
                          y={node.y + 12}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="600"
                          fill={
                            node.isStock
                              ? 'var(--accent-primary)'
                              : 'var(--text-secondary)'
                          }
                        >
                          {node.sub}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg
                viewBox="0 0 830 375"
                className="h-auto min-w-[640px] w-full"
                role="img"
                aria-label="Diagrama de Forrester de niveles, flujos y variables auxiliares"
              >
                <defs>
                  <marker
                    id="f-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                  </marker>
                  <marker
                    id="f-pipe-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-secondary)" />
                  </marker>
                </defs>

                {/* Cadena 1: Estrés Acumulado (E) */}
                <ellipse cx="60" cy="80" rx="26" ry="18" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeDasharray="3 2" />
                <text x="60" y="84" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">Fuente</text>
                <line x1="88" y1="80" x2="345" y2="80" stroke="var(--text-secondary)" strokeWidth="4" markerEnd="url(#f-pipe-arrow)" />
                <polygon points="195,68 215,92 215,68 195,92" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="1.8" />
                <text x="205" y="56" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Generacion_Estres (G)</text>

                <rect x="350" y="54" width="136" height="52" rx="4" fill="var(--accent-primary-bg)" stroke="var(--accent-primary)" strokeWidth="2.4" />
                <text x="418" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">Estres_Acumulado</text>
                <text x="418" y="93" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent-primary)">E(0) = 62,4 · [0, 100]</text>

                <line x1="486" y1="80" x2="732" y2="80" stroke="var(--text-secondary)" strokeWidth="4" markerEnd="url(#f-pipe-arrow)" />
                <polygon points="605,68 625,92 625,68 605,92" fill="var(--bg-card)" stroke="#0d9488" strokeWidth="1.8" />
                <text x="615" y="56" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Recuperacion_Estres (R)</text>
                <ellipse cx="764" cy="80" rx="26" ry="18" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeDasharray="3 2" />
                <text x="764" y="84" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">Sumidero</text>

                {/* Cadena 2: Deuda de Sueño (D) */}
                <ellipse cx="60" cy="200" rx="26" ry="18" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeDasharray="3 2" />
                <text x="60" y="204" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">Fuente</text>
                <line x1="88" y1="200" x2="345" y2="200" stroke="var(--text-secondary)" strokeWidth="4" markerEnd="url(#f-pipe-arrow)" />
                <polygon points="195,188 215,212 215,188 195,212" fill="var(--bg-card)" stroke="#d97706" strokeWidth="1.8" />
                <text x="205" y="176" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Deficit_Sueno (Def)</text>

                <rect x="350" y="174" width="136" height="52" rx="4" fill="var(--bg-subtle)" stroke="#d97706" strokeWidth="2.4" />
                <text x="418" y="196" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">Deuda_Sueno (D)</text>
                <text x="418" y="213" textAnchor="middle" fontSize="10" fontWeight="700" fill="#d97706">D(0) = 0 · Hora</text>

                <line x1="486" y1="200" x2="732" y2="200" stroke="var(--text-secondary)" strokeWidth="4" markerEnd="url(#f-pipe-arrow)" />
                <polygon points="605,188 625,212 625,188 605,212" fill="var(--bg-card)" stroke="#0d9488" strokeWidth="1.8" />
                <text x="615" y="176" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Recuperacion_Deuda (RD)</text>
                <ellipse cx="764" cy="200" rx="26" ry="18" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeDasharray="3 2" />
                <text x="764" y="204" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">Sumidero</text>

                {/* Cadena 3: Conocimiento (K) */}
                <ellipse cx="60" cy="316" rx="26" ry="18" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeDasharray="3 2" />
                <text x="60" y="320" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">Fuente</text>
                <line x1="88" y1="316" x2="345" y2="316" stroke="var(--text-secondary)" strokeWidth="4" markerEnd="url(#f-pipe-arrow)" />
                <polygon points="195,304 215,328 215,304 195,328" fill="var(--bg-card)" stroke="#10b981" strokeWidth="1.8" />
                <text x="205" y="292" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Aprendizaje (A)</text>

                <rect x="350" y="290" width="136" height="52" rx="4" fill="var(--ok-bg)" stroke="#10b981" strokeWidth="2.4" />
                <text x="418" y="312" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">Conocimiento (K)</text>
                <text x="418" y="329" textAnchor="middle" fontSize="10" fontWeight="700" fill="#10b981">K(0) = 0 · [0, 100]</text>

                {/* Auxiliares clave */}
                <circle cx="135" cy="138" r="24" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
                <text x="135" y="136" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--text-primary)">Gb · C(t)</text>
                <text x="135" y="148" textAnchor="middle" fontSize="8.5" fill="var(--text-secondary)">Carga/Bruta</text>

                <circle cx="560" cy="140" r="24" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
                <text x="560" y="138" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--text-primary)">Horas_Sueno</text>
                <text x="560" y="150" textAnchor="middle" fontSize="8.5" fill="var(--text-secondary)">S ∈ [4, 8]</text>

                <circle cx="290" cy="256" r="24" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
                <text x="290" y="254" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--text-primary)">f(E)</text>
                <text x="290" y="266" textAnchor="middle" fontSize="8.5" fill="var(--text-secondary)">Retención</text>

                <circle cx="620" cy="316" r="26" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
                <text x="620" y="314" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--text-primary)">Horas_Estudio</text>
                <text x="620" y="326" textAnchor="middle" fontSize="8.5" fill="var(--text-secondary)">H ∈ [10, 45]</text>

                {/* Canales de información principales */}
                <path d="M 152 120 Q 175 104 198 92" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 468 106 Q 520 120 538 130" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 578 124 Q 598 108 610 95" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 538 150 Q 370 165 220 190" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 355 182 Q 240 160 158 145" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 390 106 Q 345 180 304 235" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 272 272 Q 240 292 216 306" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 392 226 Q 315 270 222 308" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 486 316 L 590 316" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
                <path d="M 620 342 Q 400 370 210 326" fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#f-arrow)" />
              </svg>
            )}
          </div>
        </div>

        {/* Lista de los 6+1 Bucles de Realimentación */}
        <div className="sim-card p-4 space-y-2.5">
          <h3 className="text-sm font-bold">
            Bucles de Realimentación (4 Explosivos + 3 Depresivos)
          </h3>
          <div className="space-y-2">
            {FEEDBACK_LOOPS.map((loop) => {
              const isSelected = selectedLoop.id === loop.id;
              const isExplosive = loop.tipo.includes('Explosivo');
              return (
                <button
                  key={loop.id}
                  type="button"
                  onClick={() => setSelectedLoop(loop)}
                  className="w-full cursor-pointer rounded-lg border p-2.5 text-left transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? isExplosive
                        ? 'var(--danger-bg)'
                        : 'var(--ok-bg)'
                      : 'var(--bg-subtle)',
                    borderColor: isSelected
                      ? isExplosive
                        ? 'var(--danger-border)'
                        : 'var(--ok-border)'
                      : 'var(--border-default)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold">{loop.nombre}</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span
                        className="rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: isExplosive
                            ? 'var(--danger-bg)'
                            : 'var(--ok-bg)',
                          color: isExplosive
                            ? 'var(--danger-text)'
                            : 'var(--ok-text)',
                        }}
                      >
                        Signos −: {loop.negativos}
                      </span>
                      {!loop.activoEnSimulacion && (
                        <span
                          className="rounded px-1.5 py-0.5"
                          style={{
                            backgroundColor: 'var(--warn-bg)',
                            color: 'var(--warn-text)',
                          }}
                        >
                          Solo conceptual
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-1 font-mono text-[11px]"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {loop.recorrido}
                  </div>
                  {isSelected && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {loop.descripcion}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sistema de Ecuaciones, Concordancia de Unidades y Cota 0 <= E <= 100 */}
      <section className="space-y-4">
        <div
          className="sim-card p-4"
          style={{
            borderColor: 'var(--accent-primary)',
            backgroundColor: 'var(--accent-primary-bg)',
          }}
        >
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lock
              className="h-4 w-4"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
            Demostración de la Cota del Estrés (0 ≤ E ≤ 100) — Bucle B3
          </h3>
          <p className="mt-1 text-xs leading-relaxed">
            Para evitar que el estrés supere <code>Estres_Maximo = 100</code> ante cargas extremas, el flujo de entrada incorpora la cota:{' '}
            <code className="font-mono font-bold">
              G(t) = mín&#123; Gb(t) ; R(t) + (E_máx − E(t)) / Δt &#125;
            </code>
            . Cuando <code>Gb(t)</code> supera la segunda rama, al sustituir en Euler se cumple exactamente:
            <br />
            <code className="font-mono font-bold">
              E(t + Δt) = E(t) + Δt · [ R(t) + (E_máx − E(t))/Δt − R(t) ] = E(t) + (E_máx − E(t)) = E_máx = 100
            </code>
            . Asimismo, <code>E(t) ≥ 0</code> porque <code>Gb ≥ 0</code> y la disipación <code>Δt·R = Δt·ρ·(S/8)·E ≤ 0,015·E &lt; E</code>.
          </p>
        </div>

        <div className="sim-card p-4 space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Sigma
              className="h-4 w-4"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
            Sistema de Ecuaciones y Concordancia de Unidades (Sección 3.5)
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {EQUATIONS_LIST.map((eq) => (
              <div
                key={eq.nombre}
                className="rounded-lg border p-3 space-y-1.5"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{eq.nombre}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {eq.grupo} · {eq.unidades}
                  </span>
                </div>
                <div
                  className="rounded px-2 py-1 font-mono text-[11px] font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {eq.formula}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <strong>Concordancia:</strong> {eq.concordancia}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabla de Magnitudes Completa */}
      <section className="sim-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <BookMarked
                className="h-4 w-4"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              Tabla Completa de Magnitudes (Niveles, Flujos, Auxiliares y Tasas)
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              29 magnitudes clasificadas según Forrester / Orellana Araoz (2011).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border p-0.5 text-[11px] font-semibold"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {(
                [
                  { id: 'ALL', label: 'Todas' },
                  { id: 'N', label: 'N · Nivel' },
                  { id: 'F', label: 'F · Flujo' },
                  { id: 'A', label: 'A · Auxiliar' },
                  { id: 'T', label: 'T · Tasa' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMagFilter(f.id)}
                  className="cursor-pointer rounded-md px-2.5 py-1"
                  style={{
                    backgroundColor:
                      magFilter === f.id ? 'var(--bg-card)' : 'transparent',
                    color:
                      magFilter === f.id
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5"
                style={{ color: 'var(--text-muted)' }}
                aria-hidden="true"
              />
              <input
                type="search"
                value={magSearch}
                onChange={(e) => setMagSearch(e.target.value)}
                placeholder="Buscar magnitud..."
                aria-label="Buscar magnitud por nombre, símbolo o unidad"
                className="rounded-lg border py-1 pr-3 pl-8 text-xs"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="tabla-magnitudes-caption"
          className="table-wrapper"
        >
          <table className="sim-table">
            <caption id="tabla-magnitudes-caption" className="sr-only">
              Tabla de magnitudes del modelo de carga académica y estrés estudiantil
            </caption>
            <thead>
              <tr>
                <th>N°</th>
                <th>Clase</th>
                <th>Símbolo</th>
                <th>Variable / Parámetro</th>
                <th>Definición</th>
                <th>Unidades</th>
                <th>Valor / Tipo</th>
                <th>Observación / Fuente</th>
              </tr>
            </thead>
            <tbody>
              {filteredMagnitudes.map((m) => (
                <tr key={m.num}>
                  <td data-label="N°" className="tabular-nums">
                    {m.num}
                  </td>
                  <td data-label="Clase">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold"
                      style={{
                        backgroundColor: 'var(--accent-primary-bg)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {m.clase}
                    </span>
                  </td>
                  <td data-label="Símbolo" className="font-mono font-bold">
                    {m.simbolo}
                  </td>
                  <th>{m.nombre}</th>
                  <td data-label="Definición">{m.definicion}</td>
                  <td data-label="Unidades" className="font-mono text-xs">
                    {m.unidades}
                  </td>
                  <td data-label="Valor / Tipo" className="tabular-nums font-mono text-xs">
                    {m.valorInicialOConstante}
                  </td>
                  <td
                    data-label="Observación"
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {m.observacion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tarjetas de Apoyo para la Defensa Oral */}
      <section className="sim-card p-4 space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <HelpCircle
            className="h-4 w-4"
            style={{ color: 'var(--accent-primary)' }}
            aria-hidden="true"
          />
          Preguntas Clave del Modelo y Análisis de Resultados
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {DEFENSE_QA.map((item) => (
            <div
              key={item.pregunta}
              className="rounded-lg border p-3"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-default)',
              }}
            >
              <h4 className="text-xs font-bold">{item.pregunta}</h4>
              <p
                className="mt-1.5 text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.respuesta}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

