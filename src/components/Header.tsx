import { useEffect, useState } from 'react';
import { MonitorPlay, Moon, Sun, Activity, BrainCircuit } from 'lucide-react';

interface HeaderProps {
  presentationMode: boolean;
  onTogglePresentation: () => void;
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredScheme(): 'light' | 'dark' | null {
  try {
    const val = localStorage.getItem('color-scheme');
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

export function Header({
  presentationMode,
  onTogglePresentation,
}: HeaderProps) {
  const [stored, setStored] = useState<'light' | 'dark' | null>(() =>
    typeof window !== 'undefined' ? readStoredScheme() : null
  );
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' ? getSystemDark() : false
  );

  const renderedScheme: 'light' | 'dark' =
    stored ?? (systemDark ? 'dark' : 'light');

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]'
    );
    if (meta) {
      meta.content = stored ?? 'light dark';
    }
  }, [stored]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        setStored(
          e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null
        );
      }
    };
    mq.addEventListener('change', onMediaChange);
    window.addEventListener('storage', onStorage);
    return () => {
      mq.removeEventListener('change', onMediaChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  function handleThemeToggle() {
    const currentSysDark = getSystemDark();
    const sysScheme: 'light' | 'dark' = currentSysDark ? 'dark' : 'light';
    const target: 'light' | 'dark' =
      renderedScheme === 'dark' ? 'light' : 'dark';

    if (target === sysScheme) {
      try {
        localStorage.removeItem('color-scheme');
      } catch {
        // Ignorar si almacenamiento bloqueado
      }
      setStored(null);
    } else {
      try {
        localStorage.setItem('color-scheme', target);
      } catch {
        // Ignorar si almacenamiento bloqueado
      }
      setStored(target);
    }
  }

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--bg-card) 90%, transparent)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, #1d4ed8 0%, #0d9488 100%)',
            }}
            aria-hidden="true"
          >
            <Activity className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase"
                style={{
                  backgroundColor: 'var(--accent-primary-bg)',
                  color: 'var(--accent-primary)',
                }}
              >
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                Dinámica de Sistemas
              </span>
              <span
                className="hidden text-xs sm:inline"
                style={{ color: 'var(--text-muted)' }}
              >
                Estrés Acumulado · Deuda de Sueño · Rendimiento Estudiantil
              </span>
            </div>
            <h1 className="truncate text-sm font-bold tracking-tight sm:text-base md:text-lg">
              Impacto de la Carga Académica en el Rendimiento y Estrés Estudiantil
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePresentation}
            aria-pressed={presentationMode}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm"
            style={{
              backgroundColor: presentationMode
                ? 'var(--accent-primary)'
                : 'var(--bg-subtle)',
              color: presentationMode ? '#ffffff' : 'var(--text-primary)',
              borderColor: presentationMode
                ? 'var(--accent-primary)'
                : 'var(--border-default)',
            }}
            title="Oculta controles avanzados para exponer el simulador en pantalla completa"
          >
            <MonitorPlay className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {presentationMode ? 'Salir de Presentación' : 'Modo Presentación'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleThemeToggle}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
            aria-label={
              renderedScheme === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
            }
            title={
              stored === null
                ? `Tema del sistema (${renderedScheme === 'dark' ? 'oscuro' : 'claro'}). Clic para cambiar.`
                : `Tema ${renderedScheme === 'dark' ? 'oscuro' : 'claro'}. Clic para cambiar.`
            }
          >
            {renderedScheme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

