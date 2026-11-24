import assert from 'node:assert/strict';
import {
  DEFAULT_PARAMS,
  runSimulation,
  getWeeklySnapshots,
  computeSensitivity10Percent,
  computeConcentrationSweep,
} from '../src/engine/model.ts';
import { PRESETS } from '../src/engine/presets.ts';

function near(actual: number, expected: number, tol = 0.08, label = '') {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tol,
    `${label}: expected ${expected} ± ${tol}, got ${actual.toFixed(4)} (diff ${diff.toFixed(4)})`
  );
}

const base = runSimulation(DEFAULT_PARAMS);
near(base.metrics.picoEstres, 86.4, 0.06, 'BASE picoEstres');
near(base.metrics.semanaPicoEstres, 8.0, 0.1, 'BASE semanaPicoEstres');
near(base.metrics.semanasSobreUmbral, 1.35, 0.001, 'BASE semanasSobreUmbral');
near(base.metrics.estresFinal, 31.8, 0.06, 'BASE estresFinal');
near(base.metrics.deudaFinal, 21.3, 0.06, 'BASE deudaFinal');
near(base.metrics.conocimientoFinal, 32.2, 0.06, 'BASE conocimientoFinal');
near(base.metrics.suenoMinimo, 5.84, 0.01, 'BASE suenoMinimo');

const dist = runSimulation({ ...DEFAULT_PARAMS, Escenario: 1 });
near(dist.metrics.estresFinal, 40.7, 0.06, 'DIST estresFinal');
near(dist.metrics.conocimientoFinal, 34.4, 0.06, 'DIST conocimientoFinal');
near(dist.metrics.suenoMinimo, 6.44, 0.01, 'DIST suenoMinimo');
const lossPct =
  ((base.metrics.conocimientoFinal - dist.metrics.conocimientoFinal) /
    dist.metrics.conocimientoFinal) *
  100;
near(lossPct, -6.4, 0.2, 'Knowledge loss %');

const dtChico = runSimulation({ ...DEFAULT_PARAMS, Dt: 0.0125 });
const dtGrande = runSimulation({ ...DEFAULT_PARAMS, Dt: 0.1 });
near(dtChico.metrics.picoEstres, 86.4, 0.1, 'DT_CHICO pico');
near(dtChico.metrics.semanasSobreUmbral, 1.36, 0.02, 'DT_CHICO w75');
near(dtGrande.metrics.picoEstres, 86.3, 0.1, 'DT_GRANDE pico');
near(dtGrande.metrics.semanasSobreUmbral, 1.40, 0.02, 'DT_GRANDE w75');
assert.ok(
  Math.abs(dtChico.metrics.estresFinal - dtGrande.metrics.estresFinal) < 0.25,
  'Numeric integration convergence check'
);

for (const preset of PRESETS) {
  const res = runSimulation({ ...DEFAULT_PARAMS, ...preset.overrides });
  for (const pt of res.points) {
    assert.ok(pt.E >= 0 && pt.E <= 100.0001, `${preset.id} E out of bounds: ${pt.E}`);
    assert.ok(pt.D >= 0, `${preset.id} D negative: ${pt.D}`);
    assert.ok(pt.K >= 0 && pt.K <= 100, `${preset.id} K out of bounds: ${pt.K}`);
    assert.ok(pt.S >= 4 && pt.S <= 8, `${preset.id} S out of bounds: ${pt.S}`);
  }
  if (preset.id === 'SHOCK_SIN_CARGA') {
    near(res.metrics.estresMin, 5.2, 0.1, 'SHOCK_SIN_CARGA Emin');
    near(res.metrics.conocimientoFinal, 43.0, 0.1, 'SHOCK_SIN_CARGA K');
  }
  if (preset.id === 'SHOCK_CARGA_EXTREMA') {
    near(res.metrics.picoEstres, 100.0, 0.01, 'SHOCK_CARGA_EXTREMA Emax');
    near(res.metrics.semanasSobreUmbral, 10.0, 0.06, 'SHOCK_CARGA_EXTREMA w75');
    near(res.metrics.conocimientoFinal, 18.5, 0.1, 'SHOCK_CARGA_EXTREMA K');
  }
  if (preset.id === 'SHOCK_SIN_RECUPERACION') {
    near(res.metrics.semanasSobreUmbral, 13.45, 0.06, 'SHOCK_SIN_RECUPERACION w75');
    near(res.metrics.conocimientoFinal, 8.0, 0.1, 'SHOCK_SIN_RECUPERACION K');
  }
  if (preset.id === 'SHOCK_COLAPSO') {
    near(res.metrics.semanasSobreUmbral, 14.90, 0.06, 'SHOCK_COLAPSO w75');
    near(res.metrics.conocimientoFinal, 3.7, 0.1, 'SHOCK_COLAPSO K');
  }
  if (preset.id === 'ESC_RECUPERACION_BAJA') {
    near(res.metrics.semanasSobreUmbral, 5.75, 0.06, 'ESC_REC_BAJA w75');
    near(res.metrics.conocimientoFinal, 23.1, 0.1, 'ESC_REC_BAJA K');
  }
  if (preset.id === 'ESC_RECUPERACION_ALTA') {
    near(res.metrics.picoEstres, 67.0, 0.1, 'ESC_REC_ALTA Emax');
    near(res.metrics.conocimientoFinal, 37.7, 0.1, 'ESC_REC_ALTA K');
  }
}

const snaps = getWeeklySnapshots(dist.points, base.points);
const w8 = snaps.find((s) => s.semana === 8)!;
near(w8.dist.E, 42.8, 0.1, 'W8 dist E');
near(w8.conc.E, 86.4, 0.1, 'W8 conc E');
const w10 = snaps.find((s) => s.semana === 10)!;
near(w10.conc.D, 30.1, 0.1, 'W10 conc D');
near(w10.conc.K, 22.3, 0.1, 'W10 conc K');

const sens = computeSensitivity10Percent();
assert.equal(sens.length, 10);
const sweep = computeConcentrationSweep();
assert.equal(sweep.length, 5);

console.log('ALL MATHEMATICAL VERIFICATIONS PASSED SUCCESSFULLY.');

