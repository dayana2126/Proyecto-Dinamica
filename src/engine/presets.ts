import type { ModelParams } from './model.ts';

export type PresetCategory = 'principal' | 'shock' | 'sensibilidad';

export interface SimulationPreset {
  id: string;
  name: string;
  shortName: string;
  category: PresetCategory;
  description: string;
  overrides: Partial<ModelParams>;
}

export const PRESETS: SimulationPreset[] = [
  {
    id: 'BASE',
    name: 'BASE (Concentrado 60%)',
    shortName: 'BASE (60%)',
    category: 'principal',
    description: '60% de las 20 evaluaciones concentradas en semanas 7 y 8 (t ∈ [6, 8)).',
    overrides: {
      Escenario: 2,
      Fraccion_Concentrada: 0.60,
      Total_Evaluaciones: 20,
      Inicio_Pico: 6,
      Ventana_Pico: 2,
      Tasa_Recuperacion: 0.30,
      Amplificacion_Deuda: 0.04,
      Estres_Por_Evaluacion: 4.0,
      Estres_Inicial: 62.4,
    },
  },
  {
    id: 'DISTRIBUIDO',
    name: 'Distribuido',
    shortName: 'Distribuido',
    category: 'principal',
    description: 'Carga uniforme de 1,25 evaluaciones/semana durante las 16 semanas.',
    overrides: {
      Escenario: 1,
      Total_Evaluaciones: 20,
      Tasa_Recuperacion: 0.30,
      Amplificacion_Deuda: 0.04,
      Estres_Por_Evaluacion: 4.0,
      Estres_Inicial: 62.4,
    },
  },
  {
    id: 'SHOCK_SIN_CARGA',
    name: 'SHOCK_SIN_CARGA',
    shortName: 'Sin Carga',
    category: 'shock',
    description: 'Total_Evaluaciones = 0. Verifica que el estrés desciende sin volverse negativo.',
    overrides: {
      Escenario: 2,
      Total_Evaluaciones: 0,
    },
  },
  {
    id: 'SHOCK_CARGA_EXTREMA',
    name: 'SHOCK_CARGA_EXTREMA',
    shortName: 'Carga Extrema',
    category: 'shock',
    description: 'Total_Evaluaciones = 200 y Fraccion_Concentrada = 0.90. Prueba la cota E ≤ 100.',
    overrides: {
      Escenario: 2,
      Total_Evaluaciones: 200,
      Fraccion_Concentrada: 0.9,
    },
  },
  {
    id: 'SHOCK_SIN_RECUPERACION',
    name: 'SHOCK_SIN_RECUPERACION',
    shortName: 'Sin Recuperación',
    category: 'shock',
    description: 'Tasa_Recuperacion = 0. El estrés satura en 100 pts sin disipación.',
    overrides: {
      Escenario: 2,
      Tasa_Recuperacion: 0,
    },
  },
  {
    id: 'SHOCK_COLAPSO',
    name: 'SHOCK_COLAPSO',
    shortName: 'Colapso Total',
    category: 'shock',
    description: '200 eval., 90% conc., ρ = 0.05, β = 0.20. Colapso cognitivo (K ≈ 3,7).',
    overrides: {
      Escenario: 2,
      Total_Evaluaciones: 200,
      Fraccion_Concentrada: 0.9,
      Tasa_Recuperacion: 0.05,
      Amplificacion_Deuda: 0.2,
    },
  },
  {
    id: 'ESC_RECUPERACION_BAJA',
    name: 'ESC_RECUPERACION_BAJA',
    shortName: 'Recup. Baja (0.20)',
    category: 'sensibilidad',
    description: 'Tasa_Recuperacion = 0.20/semana sobre el caso base concentrado.',
    overrides: {
      Escenario: 2,
      Tasa_Recuperacion: 0.20,
    },
  },
  {
    id: 'ESC_RECUPERACION_ALTA',
    name: 'ESC_RECUPERACION_ALTA',
    shortName: 'Recup. Alta (0.40)',
    category: 'sensibilidad',
    description: 'Tasa_Recuperacion = 0.40/semana. El estudiante absorbe el pico sin cruzar 75.',
    overrides: {
      Escenario: 2,
      Tasa_Recuperacion: 0.40,
    },
  },
  {
    id: 'ESC_DEUDA_ALTA',
    name: 'ESC_DEUDA_ALTA',
    shortName: 'Deuda Alta (0.08)',
    category: 'sensibilidad',
    description: 'Amplificacion_Deuda = 0.08/hora. Mayor sensibilidad por falta de sueño.',
    overrides: {
      Escenario: 2,
      Amplificacion_Deuda: 0.08,
    },
  },
  {
    id: 'ESC_DEUDA_BAJA',
    name: 'ESC_DEUDA_BAJA',
    shortName: 'Deuda Baja (0.02)',
    category: 'sensibilidad',
    description: 'Amplificacion_Deuda = 0.02/hora. Menor impacto del déficit de sueño.',
    overrides: {
      Escenario: 2,
      Amplificacion_Deuda: 0.02,
    },
  },
];
