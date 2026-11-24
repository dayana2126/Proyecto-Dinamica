export type TimeStepOption = 0.0125 | 0.05 | 0.1;

export interface ModelParams {
  Estres_Inicial: number;
  Estres_Maximo: number;
  Conocimiento_Maximo: number;
  Estres_Por_Evaluacion: number;
  Amplificacion_Deuda: number;
  Estres_Por_Hora_Estudio: number;
  Tasa_Recuperacion: number;
  Tasa_Eliminacion_Deuda: number;
  Perdida_Sueno_Por_Estres: number;
  Sueno_Referencia: number;
  Sueno_Minimo: number;
  Noches_Por_Semana: number;
  Estudio_Base: number;
  Esfuerzo_Compensatorio: number;
  Estudio_Maximo: number;
  Tasa_Aprendizaje: number;
  Escala_Deuda: number;
  Total_Evaluaciones: number;
  Duracion_Semestre: number;
  Inicio_Pico: number;
  Ventana_Pico: number;
  Fraccion_Concentrada: number;
  Escenario: 1 | 2;
  Umbral_Agotamiento: number;
  Dt: TimeStepOption;
}

export const DEFAULT_PARAMS: ModelParams = {
  Estres_Inicial: 62.4,
  Estres_Maximo: 100,
  Conocimiento_Maximo: 100,
  Estres_Por_Evaluacion: 4.0,
  Amplificacion_Deuda: 0.04,
  Estres_Por_Hora_Estudio: 0.09,
  Tasa_Recuperacion: 0.30,
  Tasa_Eliminacion_Deuda: 0.35,
  Perdida_Sueno_Por_Estres: 0.025,
  Sueno_Referencia: 8,
  Sueno_Minimo: 4,
  Noches_Por_Semana: 7,
  Estudio_Base: 10,
  Esfuerzo_Compensatorio: 0.075,
  Estudio_Maximo: 45,
  Tasa_Aprendizaje: 0.27,
  Escala_Deuda: 60,
  Total_Evaluaciones: 20,
  Duracion_Semestre: 16,
  Inicio_Pico: 6,
  Ventana_Pico: 2,
  Fraccion_Concentrada: 0.60,
  Escenario: 2,
  Umbral_Agotamiento: 75,
  Dt: 0.05,
};

export interface SimulationPoint {
  t: number;
  E: number;
  D: number;
  K: number;
  S: number;
  H: number;
  f: number;
  fPct: number;
  C: number;
  G: number;
  Gb: number;
  R: number;
  Def: number;
  RD: number;
  A: number;
}

export interface SimulationMetrics {
  picoEstres: number;
  semanaPicoEstres: number;
  estresMin: number;
  estresFinal: number;
  semanasSobreUmbral: number;
  primeraSemanaQuiebre: number | null;
  deudaFinal: number;
  deudaPico: number;
  semanaPicoDeuda: number;
  suenoMinimo: number;
  suenoFinal: number;
  conocimientoFinal: number;
  indiceDesborde: number;
}

export interface SimulationResult {
  params: ModelParams;
  points: SimulationPoint[];
  metrics: SimulationMetrics;
}

/**
 * Ejecuta la integración numérica por el Método de Euler siguiendo
 * estrictamente el orden de evaluación del modelo de carga académica y estrés estudiantil.
 */
export function runSimulation(
  params: ModelParams,
  customWeeklyLoads?: number[]
): SimulationResult {
  const dt = params.Dt;
  const steps = Math.round(params.Duracion_Semestre / dt);

  let E = params.Estres_Inicial;
  let D = 0;
  let K = 0;

  const points: SimulationPoint[] = new Array(steps + 1);

  let picoEstres = -Infinity;
  let semanaPicoEstres = 0;
  let estresMin = Infinity;
  let primeraSemanaQuiebre: number | null = null;
  let deudaPico = -Infinity;
  let semanaPicoDeuda = 0;
  let suenoMinimo = Infinity;
  let countSobreUmbral = 0;

  for (let i = 0; i <= steps; i++) {
    const t = Number((i * dt).toFixed(6));

    // 1. Carga_Academica(t)
    let C: number;
    if (customWeeklyLoads && customWeeklyLoads.length > 0) {
      const idx = Math.min(
        customWeeklyLoads.length - 1,
        Math.max(0, Math.floor(t + dt / 2))
      );
      C = customWeeklyLoads[idx];
    } else if (params.Escenario === 1) {
      C = params.Total_Evaluaciones / params.Duracion_Semestre;
    } else {
      const inPeak =
        t >= params.Inicio_Pico - dt / 2 &&
        t < params.Inicio_Pico + params.Ventana_Pico - dt / 2;
      if (inPeak) {
        C =
          (params.Fraccion_Concentrada * params.Total_Evaluaciones) /
          Math.max(0.25, params.Ventana_Pico);
      } else {
        const restDuration = Math.max(
          0.25,
          params.Duracion_Semestre - params.Ventana_Pico
        );
        C =
          ((1 - params.Fraccion_Concentrada) * params.Total_Evaluaciones) /
          restDuration;
      }
    }

    // 2. Horas_Sueno(t)
    const S = Math.max(
      params.Sueno_Minimo,
      params.Sueno_Referencia - params.Perdida_Sueno_Por_Estres * E
    );

    // 3. Horas_Estudio(t)
    const H = Math.min(
      params.Estudio_Maximo,
      params.Estudio_Base +
        params.Esfuerzo_Compensatorio * (params.Conocimiento_Maximo - K)
    );

    // 4. Eficiencia_Retencion(t)
    const f = Math.max(0, 1 - Math.pow(E / params.Estres_Maximo, 2));

    // 5. Recuperacion_Estres(t)
    const R = params.Tasa_Recuperacion * E * (S / params.Sueno_Referencia);

    // 6. Generacion_Bruta(t)
    const Gb =
      params.Estres_Por_Evaluacion * C * (1 + params.Amplificacion_Deuda * D) +
      params.Estres_Por_Hora_Estudio * H;

    // 7. Generacion_Estres(t) (cota para que E nunca supere Estres_Maximo)
    const G = Math.min(Gb, R + (params.Estres_Maximo - E) / dt);

    // 8. Deficit_Sueno(t)
    const Def = params.Noches_Por_Semana * (params.Sueno_Referencia - S);

    // 9. Recuperacion_Deuda(t)
    const RD = params.Tasa_Eliminacion_Deuda * D;

    // 10. Aprendizaje(t)
    const A =
      (params.Tasa_Aprendizaje *
        H *
        f *
        (1 - K / params.Conocimiento_Maximo)) /
      (1 + D / params.Escala_Deuda);

    points[i] = {
      t,
      E,
      D,
      K,
      S,
      H,
      f,
      fPct: f * 100,
      C,
      G,
      Gb,
      R,
      Def,
      RD,
      A,
    };

    if (E > picoEstres) {
      picoEstres = E;
      semanaPicoEstres = t;
    }
    if (E < estresMin) {
      estresMin = E;
    }
    if (E >= params.Umbral_Agotamiento && primeraSemanaQuiebre === null) {
      primeraSemanaQuiebre = t;
    }
    if (E > params.Umbral_Agotamiento) {
      countSobreUmbral++;
    }
    if (D > deudaPico) {
      deudaPico = D;
      semanaPicoDeuda = t;
    }
    if (S < suenoMinimo) {
      suenoMinimo = S;
    }

    // Actualización de Niveles (Euler)
    if (i < steps) {
      E = E + dt * (G - R);
      D = Math.max(0, D + dt * (Def - RD));
      K = Math.min(params.Conocimiento_Maximo, K + dt * A);
    }
  }

  const last = points[points.length - 1];
  const semanasSobreUmbral = Number((countSobreUmbral * dt).toFixed(4));

  return {
    params,
    points,
    metrics: {
      picoEstres,
      semanaPicoEstres,
      estresMin,
      estresFinal: last.E,
      semanasSobreUmbral,
      primeraSemanaQuiebre,
      deudaFinal: last.D,
      deudaPico,
      semanaPicoDeuda,
      suenoMinimo,
      suenoFinal: last.S,
      conocimientoFinal: last.K,
      indiceDesborde: Math.max(0, picoEstres - params.Umbral_Agotamiento),
    },
  };
}

export function getPointAtWeek(
  points: SimulationPoint[],
  week: number
): SimulationPoint {
  if (points.length === 0) {
    throw new Error('Simulation points array is empty');
  }
  let best = points[0];
  let minDiff = Math.abs(points[0].t - week);
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].t - week);
    if (diff < minDiff) {
      minDiff = diff;
      best = points[i];
    }
  }
  return best;
}

export interface WeeklySnapshotRow {
  semana: number;
  dist: SimulationPoint;
  conc: SimulationPoint;
}

export function getWeeklySnapshots(
  distPoints: SimulationPoint[],
  concPoints: SimulationPoint[],
  weeks: number[] = [0, 4, 6, 8, 10, 12, 16]
): WeeklySnapshotRow[] {
  return weeks.map((semana) => ({
    semana,
    dist: getPointAtWeek(distPoints, semana),
    conc: getPointAtWeek(concPoints, semana),
  }));
}

export interface Sensitivity10Row {
  key: keyof ModelParams;
  simbolo: string;
  nombre: string;
  unidad: string;
  baseVal: number;
  picoMenos: number;
  picoMas: number;
  kMenos: number;
  kMas: number;
  varKMenosPct: number;
  varKMasPct: number;
  maxImpactK: number;
}

export function computeSensitivity10Percent(): Sensitivity10Row[] {
  const baseRes = runSimulation(DEFAULT_PARAMS);
  const baseK = baseRes.metrics.conocimientoFinal;

  const specs: Array<{
    key: keyof ModelParams;
    simbolo: string;
    nombre: string;
    unidad: string;
  }> = [
    { key: 'Estres_Por_Evaluacion', simbolo: 'α', nombre: 'Estrés por evaluación', unidad: 'Punto/Eval.' },
    { key: 'Amplificacion_Deuda', simbolo: 'β', nombre: 'Amplificación por deuda', unidad: '1/Hora' },
    { key: 'Estres_Por_Hora_Estudio', simbolo: 'λ', nombre: 'Estrés por hora de estudio', unidad: 'Punto/Hora' },
    { key: 'Tasa_Recuperacion', simbolo: 'ρ', nombre: 'Tasa de recuperación', unidad: '1/Semana' },
    { key: 'Tasa_Eliminacion_Deuda', simbolo: 'δ', nombre: 'Eliminación de deuda', unidad: '1/Semana' },
    { key: 'Perdida_Sueno_Por_Estres', simbolo: 'γ', nombre: 'Pérdida de sueño por estrés', unidad: 'H/Noche/Pto' },
    { key: 'Estudio_Base', simbolo: 'H₀', nombre: 'Estudio base', unidad: 'Hora/Sem.' },
    { key: 'Esfuerzo_Compensatorio', simbolo: 'μ', nombre: 'Esfuerzo compensatorio', unidad: 'H/Sem./Pto' },
    { key: 'Tasa_Aprendizaje', simbolo: 'κ', nombre: 'Tasa de aprendizaje', unidad: 'Punto/Hora' },
    { key: 'Escala_Deuda', simbolo: 'D*', nombre: 'Escala de deuda', unidad: 'Hora' },
  ];

  return specs.map((spec) => {
    const baseVal = Number(DEFAULT_PARAMS[spec.key]);
    const resMenos = runSimulation({ ...DEFAULT_PARAMS, [spec.key]: baseVal * 0.9 });
    const resMas = runSimulation({ ...DEFAULT_PARAMS, [spec.key]: baseVal * 1.1 });

    const varKMenosPct = ((resMenos.metrics.conocimientoFinal - baseK) / baseK) * 100;
    const varKMasPct = ((resMas.metrics.conocimientoFinal - baseK) / baseK) * 100;

    return {
      key: spec.key,
      simbolo: spec.simbolo,
      nombre: spec.nombre,
      unidad: spec.unidad,
      baseVal,
      picoMenos: resMenos.metrics.picoEstres,
      picoMas: resMas.metrics.picoEstres,
      kMenos: resMenos.metrics.conocimientoFinal,
      kMas: resMas.metrics.conocimientoFinal,
      varKMenosPct,
      varKMasPct,
      maxImpactK: Math.max(Math.abs(varKMenosPct), Math.abs(varKMasPct)),
    };
  });
}

export interface ConcentrationSweepRow {
  label: string;
  fraccionPct: number | null;
  picoEstres: number;
  semanasSobre75: number;
  conocimientoFinal: number;
  suenoMinimo: number;
  deltaKPct: number;
}

export function computeConcentrationSweep(): ConcentrationSweepRow[] {
  const dist = runSimulation({ ...DEFAULT_PARAMS, Escenario: 1 });
  const refK = dist.metrics.conocimientoFinal;

  const rows: ConcentrationSweepRow[] = [
    {
      label: 'Distribuido (1,25 eval./sem)',
      fraccionPct: null,
      picoEstres: dist.metrics.picoEstres,
      semanasSobre75: dist.metrics.semanasSobreUmbral,
      conocimientoFinal: dist.metrics.conocimientoFinal,
      suenoMinimo: dist.metrics.suenoMinimo,
      deltaKPct: 0,
    },
  ];

  for (const p of [0.3, 0.45, 0.6, 0.75]) {
    const res = runSimulation({
      ...DEFAULT_PARAMS,
      Escenario: 2,
      Fraccion_Concentrada: p,
    });
    rows.push({
      label: `Concentrado p = ${Math.round(p * 100)} %`,
      fraccionPct: Math.round(p * 100),
      picoEstres: res.metrics.picoEstres,
      semanasSobre75: res.metrics.semanasSobreUmbral,
      conocimientoFinal: res.metrics.conocimientoFinal,
      suenoMinimo: res.metrics.suenoMinimo,
      deltaKPct: ((res.metrics.conocimientoFinal - refK) / refK) * 100,
    });
  }

  return rows;
}

export interface ValidationSuite {
  base: SimulationResult;
  distribuido: SimulationResult;
  shockSinCarga: SimulationResult;
  shockCargaExtrema: SimulationResult;
  shockSinRecuperacion: SimulationResult;
  shockColapso: SimulationResult;
  dtChico: SimulationResult;
  dtGrande: SimulationResult;
  recBaja: SimulationResult;
  recAlta: SimulationResult;
  deudaBaja: SimulationResult;
  deudaAlta: SimulationResult;
  fig1Data: Array<{ t: number; baseE: number; shockE: number }>;
  fig2Data: Array<{ t: number; baseK: number; colapsoK: number }>;
  fig3Data: Array<{ t: number; dt0125?: number; dt05?: number; dt1?: number }>;
  fig4RecData: Array<{ t: number; baja: number; base: number; alta: number }>;
  fig4DeudaData: Array<{ t: number; baja: number; base: number; alta: number }>;
}

export function computeValidationSuite(): ValidationSuite {
  const base = runSimulation(DEFAULT_PARAMS);
  const distribuido = runSimulation({ ...DEFAULT_PARAMS, Escenario: 1 });

  const shockSinCarga = runSimulation({
    ...DEFAULT_PARAMS,
    Total_Evaluaciones: 0,
  });
  const shockCargaExtrema = runSimulation({
    ...DEFAULT_PARAMS,
    Total_Evaluaciones: 200,
    Fraccion_Concentrada: 0.9,
  });
  const shockSinRecuperacion = runSimulation({
    ...DEFAULT_PARAMS,
    Tasa_Recuperacion: 0,
  });
  const shockColapso = runSimulation({
    ...DEFAULT_PARAMS,
    Total_Evaluaciones: 200,
    Fraccion_Concentrada: 0.9,
    Tasa_Recuperacion: 0.05,
    Amplificacion_Deuda: 0.2,
  });

  const dtChico = runSimulation({ ...DEFAULT_PARAMS, Dt: 0.0125 });
  const dtGrande = runSimulation({ ...DEFAULT_PARAMS, Dt: 0.1 });

  const recBaja = runSimulation({ ...DEFAULT_PARAMS, Tasa_Recuperacion: 0.2 });
  const recAlta = runSimulation({ ...DEFAULT_PARAMS, Tasa_Recuperacion: 0.4 });
  const deudaBaja = runSimulation({ ...DEFAULT_PARAMS, Amplificacion_Deuda: 0.02 });
  const deudaAlta = runSimulation({ ...DEFAULT_PARAMS, Amplificacion_Deuda: 0.08 });

  const fig1Data = base.points.map((pt, i) => ({
    t: pt.t,
    baseE: Number(pt.E.toFixed(2)),
    shockE: Number(shockCargaExtrema.points[i].E.toFixed(2)),
  }));

  const fig2Data = base.points.map((pt, i) => ({
    t: pt.t,
    baseK: Number(pt.K.toFixed(2)),
    colapsoK: Number(shockColapso.points[i].K.toFixed(2)),
  }));

  // Alinear la serie de integración numérica sobre los puntos de 0.05 y 0.1 (dt0125 cada 0.05 para superposición nítida)
  const fig3Map = new Map<
    number,
    { t: number; dt0125?: number; dt05?: number; dt1?: number }
  >();
  for (const pt of dtChico.points) {
    // Tomar puntos múltiplos de 0.05 para evitar 1281 puntos innecesarios manteniendo la curva exacta
    if (Math.abs((pt.t * 20) - Math.round(pt.t * 20)) < 1e-4) {
      fig3Map.set(pt.t, { t: pt.t, dt0125: Number(pt.E.toFixed(2)) });
    }
  }
  for (const pt of base.points) {
    const entry = fig3Map.get(pt.t) ?? { t: pt.t };
    entry.dt05 = Number(pt.E.toFixed(2));
    fig3Map.set(pt.t, entry);
  }
  for (const pt of dtGrande.points) {
    const entry = fig3Map.get(pt.t) ?? { t: pt.t };
    entry.dt1 = Number(pt.E.toFixed(2));
    fig3Map.set(pt.t, entry);
  }
  const fig3Data = Array.from(fig3Map.values()).sort((a, b) => a.t - b.t);

  const fig4RecData = base.points.map((pt, i) => ({
    t: pt.t,
    baja: Number(recBaja.points[i].E.toFixed(2)),
    base: Number(pt.E.toFixed(2)),
    alta: Number(recAlta.points[i].E.toFixed(2)),
  }));

  const fig4DeudaData = base.points.map((pt, i) => ({
    t: pt.t,
    baja: Number(deudaBaja.points[i].E.toFixed(2)),
    base: Number(pt.E.toFixed(2)),
    alta: Number(deudaAlta.points[i].E.toFixed(2)),
  }));

  return {
    base,
    distribuido,
    shockSinCarga,
    shockCargaExtrema,
    shockSinRecuperacion,
    shockColapso,
    dtChico,
    dtGrande,
    recBaja,
    recAlta,
    deudaBaja,
    deudaAlta,
    fig1Data,
    fig2Data,
    fig3Data,
    fig4RecData,
    fig4DeudaData,
  };
}

export function buildWeeklySummaryCSV(
  dist: SimulationResult,
  conc: SimulationResult
): string {
  const rows = getWeeklySnapshots(dist.points, conc.points);
  const header = [
    'Semana',
    'Estres_Distribuido_pts',
    'Estres_Concentrado60_pts',
    'Deuda_Sueno_Dist_h',
    'Deuda_Sueno_Conc_h',
    'Conocimiento_Dist_pts',
    'Conocimiento_Conc_pts',
    'Sueno_Dist_h_noche',
    'Sueno_Conc_h_noche',
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.semana,
      r.dist.E.toFixed(2),
      r.conc.E.toFixed(2),
      r.dist.D.toFixed(2),
      r.conc.D.toFixed(2),
      r.dist.K.toFixed(2),
      r.conc.K.toFixed(2),
      r.dist.S.toFixed(2),
      r.conc.S.toFixed(2),
    ].join(',')
  );

  return '\uFEFF' + [header, ...lines].join('\n');
}

export function buildFullSeriesCSV(
  result: SimulationResult,
  label = 'Simulacion_Actual'
): string {
  const header = [
    'Escenario',
    'Semana_t',
    'Estres_Acumulado_E',
    'Deuda_Sueno_D_h',
    'Conocimiento_K',
    'Horas_Sueno_S_h_noche',
    'Horas_Estudio_H_h_sem',
    'Eficiencia_Retencion_f',
    'Carga_Academica_C_eval_sem',
    'Generacion_Estres_G',
    'Recuperacion_Estres_R',
    'Aprendizaje_A',
  ].join(',');

  const lines = result.points.map((p) =>
    [
      label,
      p.t.toFixed(4),
      p.E.toFixed(4),
      p.D.toFixed(4),
      p.K.toFixed(4),
      p.S.toFixed(4),
      p.H.toFixed(4),
      p.f.toFixed(4),
      p.C.toFixed(4),
      p.G.toFixed(4),
      p.R.toFixed(4),
      p.A.toFixed(4),
    ].join(',')
  );

  return '\uFEFF' + [header, ...lines].join('\n');
}

