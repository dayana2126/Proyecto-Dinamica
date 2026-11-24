import { useRef, useState, type KeyboardEvent } from 'react';
import {
  Activity,
  BookOpenCheck,
  CalendarDays,
  FlaskConical,
} from 'lucide-react';
import { DEFAULT_PARAMS, type ModelParams } from './engine/model.ts';
import { PRESETS } from './engine/presets.ts';
import { Header } from './components/Header.tsx';
import { LiveSimulatorTab } from './components/LiveSimulatorTab.tsx';
import { ValidationTab } from './components/ValidationTab.tsx';
import { ModelDefenseTab } from './components/ModelDefenseTab.tsx';
import { CustomCalendarTab } from './components/CustomCalendarTab.tsx';

type TabId = 'live' | 'validation' | 'model' | 'calendar';

const TABS: Array<{
  id: TabId;
  label: string;
  icon: typeof Activity;
}> = [
  { id: 'live', label: 'Simulador en Vivo', icon: Activity },
  {
    id: 'validation',
    label: 'Pruebas de Validación y Sensibilidad',
    icon: FlaskConical,
  },
  { id: 'model', label: 'Estructura del Modelo y Ecuaciones', icon: BookOpenCheck },
  { id: 'calendar', label: 'Simulador de Mi Calendario', icon: CalendarDays },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('live');
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string | null>('BASE');
  const [presentationMode, setPresentationMode] = useState(false);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleUpdateParam<K extends keyof ModelParams>(
    key: K,
    value: ModelParams[K]
  ) {
    setParams((prev) => ({ ...prev, [key]: value }));
    setActivePresetId(null);
  }

  function handleApplyPreset(presetId: string) {
    const found = PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setParams({ ...DEFAULT_PARAMS, ...found.overrides });
    setActivePresetId(found.id);
  }

  function handleReset() {
    setParams(DEFAULT_PARAMS);
    setActivePresetId('BASE');
  }

  function selectTab(idx: number) {
    const target = TABS[idx];
    if (!target) return;
    setActiveTab(target.id);
    const btn = tabRefs.current[idx];
    if (btn) {
      btn.focus();
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function handleTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIdx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectTab((currentIdx + 1) % TABS.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectTab((currentIdx - 1 + TABS.length) % TABS.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectTab(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectTab(TABS.length - 1);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        presentationMode={presentationMode}
        onTogglePresentation={() => setPresentationMode((m) => !m)}
      />

      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-3 pb-8 sm:px-6">
        {/* Navegación por Pestañas (modern-web-guidance: tabs) */}
        <nav aria-label="Secciones del simulador" className="mb-4">
          <div
            role="tablist"
            aria-label="Módulos del simulador de carga académica y estrés estudiantil"
            onKeyDown={handleTabKeyDown}
            className="sim-tablist"
          >
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(idx)}
                  className="sim-tab"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Render condicional del panel activo para mediciones exactas en Recharts */}
        <main>
          <div
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'live' && (
              <LiveSimulatorTab
                params={params}
                activePresetId={activePresetId}
                presentationMode={presentationMode}
                onUpdateParam={handleUpdateParam}
                onApplyPreset={handleApplyPreset}
                onReset={handleReset}
              />
            )}
            {activeTab === 'validation' && (
              <ValidationTab currentParams={params} />
            )}
            {activeTab === 'model' && <ModelDefenseTab />}
            {activeTab === 'calendar' && (
              <CustomCalendarTab baseParams={params} />
            )}
          </div>
        </main>
      </div>

      <footer
        className="border-t px-4 py-3 text-center text-xs sm:px-6"
        style={{
          borderColor: 'var(--border-default)',
          color: 'var(--text-muted)',
        }}
      >
        Simulador de Dinámica de Sistemas · Impacto de la Carga Académica en el
        Rendimiento y Estrés Estudiantil · Integración Euler (Δt = {params.Dt}{' '}
        sem., horizonte 16 semanas)
      </footer>
    </div>
  );
}

