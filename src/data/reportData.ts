export interface FeedbackLoopInfo {
  id: 'R1' | 'R2' | 'R3' | 'R4' | 'B1' | 'B2' | 'B3';
  nombre: string;
  tipo: 'Explosivo (Refuerzo)' | 'Depresivo (Balance)';
  recorrido: string;
  signos: string;
  negativos: string;
  descripcion: string;
  activoEnSimulacion: boolean;
  highlightNodes: string[];
  highlightEdges: string[];
}

export const FEEDBACK_LOOPS: FeedbackLoopInfo[] = [
  {
    id: 'R1',
    nombre: 'R1. Sueño y recuperación',
    tipo: 'Explosivo (Refuerzo)',
    recorrido: 'Estrés → Horas de sueño → Recuperación → Estrés',
    signos: '−, +, −',
    negativos: '2 (par)',
    descripcion:
      'Al subir el estrés se pierden horas de sueño; dormir menos frena la recuperación del estrés y deja más estrés acumulado.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'S', 'R'],
    highlightEdges: ['E->S', 'S->R', 'R->E'],
  },
  {
    id: 'R2',
    nombre: 'R2. Deuda de sueño',
    tipo: 'Explosivo (Refuerzo)',
    recorrido: 'Estrés → Horas de sueño → Deuda de sueño → Generación de estrés → Estrés',
    signos: '−, −, +, +',
    negativos: '2 (par)',
    descripcion:
      'La falta de sueño acumula deuda de sueño D(t), la cual amplifica mediante el factor (1 + β·D) el estrés generado por cada evaluación.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'S', 'D', 'Gb', 'G'],
    highlightEdges: ['E->S', 'S->D', 'D->Gb', 'Gb->G', 'G->E'],
  },
  {
    id: 'R3',
    nombre: 'R3. Esfuerzo compensatorio',
    tipo: 'Explosivo (Refuerzo)',
    recorrido: 'Estrés → Eficiencia → Aprendizaje → Conocimiento → Horas de estudio → Generación de estrés → Estrés',
    signos: '−, +, +, −, +, +',
    negativos: '2 (par)',
    descripcion:
      'El estrés alto deteriora la retención y frena el aprendizaje; ante un conocimiento bajo, el estudiante compensa estudiando más horas, lo que añade presión λ·H.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'f', 'A', 'K', 'H', 'Gb', 'G'],
    highlightEdges: ['E->f', 'f->A', 'A->K', 'K->H', 'H->Gb', 'Gb->G', 'G->E'],
  },
  {
    id: 'R4',
    nombre: 'R4. Agotamiento completo',
    tipo: 'Explosivo (Refuerzo)',
    recorrido: 'Estrés → Horas de sueño → Deuda → Aprendizaje → Conocimiento → Horas de estudio → Generación de estrés → Estrés',
    signos: '−, −, −, +, −, +, +',
    negativos: '4 (par)',
    descripcion:
      'Integra toda la cadena psicofisiológica: la deuda de sueño frena el aprendizaje por el divisor (1 + D/D*), forzando estudio compensatorio y retroalimentando el estrés.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'S', 'D', 'A', 'K', 'H', 'Gb', 'G'],
    highlightEdges: ['E->S', 'S->D', 'D->A', 'A->K', 'K->H', 'H->Gb', 'Gb->G', 'G->E'],
  },
  {
    id: 'B1',
    nombre: 'B1. Recuperación natural',
    tipo: 'Depresivo (Balance)',
    recorrido: 'Estrés → Recuperación → Estrés',
    signos: '+, −',
    negativos: '1 (impar)',
    descripcion:
      'Mecanismo regulador principal: a mayor nivel de estrés, mayor disipación absoluta R = ρ·E·(S/8), tendiendo al equilibrio cuando baja la carga.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'R'],
    highlightEdges: ['E->R', 'R->E'],
  },
  {
    id: 'B2',
    nombre: 'B2. Pausa o abandono',
    tipo: 'Depresivo (Balance)',
    recorrido: 'Estrés → Riesgo de pausa → Carga efectiva → Generación de estrés → Estrés',
    signos: '+, −, +, +',
    negativos: '1 (impar)',
    descripcion:
      'Representa el abandono o pausa ante agotamiento extremo. Figura en el diagrama causal conceptual, pero se mantiene inactivo en la simulación numérica base.',
    activoEnSimulacion: false,
    highlightNodes: ['E', 'RP', 'C', 'Gb', 'G'],
    highlightEdges: ['E->RP', 'RP->C', 'C->Gb', 'Gb->G', 'G->E'],
  },
  {
    id: 'B3',
    nombre: 'B3. Cota del estrés',
    tipo: 'Depresivo (Balance)',
    recorrido: 'Estres_Acumulado → Generacion_Estres → Estres_Acumulado',
    signos: '−, +',
    negativos: '1 (impar)',
    descripcion:
      'Añadido en la implementación de Vensim: solo actúa cuando E se aproxima a Estres_Maximo = 100, garantizando matemáticamente 0 ≤ E ≤ 100.',
    activoEnSimulacion: true,
    highlightNodes: ['E', 'G'],
    highlightEdges: ['E->G', 'G->E'],
  },
];

export interface MagnitudeItem {
  num: number;
  clase: 'N' | 'F' | 'A' | 'T';
  simbolo: string;
  nombre: string;
  definicion: string;
  unidades: string;
  valorInicialOConstante: string;
  observacion: string;
}

export const MAGNITUDES_TABLE: MagnitudeItem[] = [
  {
    num: 1,
    clase: 'N',
    simbolo: 'E',
    nombre: 'Estres_Acumulado',
    definicion: 'Nivel de estrés del estudiante tipo en la semana t',
    unidades: 'Punto',
    valorInicialOConstante: 'E(0) = 62,4',
    observacion: 'Sarmiento-Gomez & Philco-Lima (2025)',
  },
  {
    num: 2,
    clase: 'N',
    simbolo: 'D',
    nombre: 'Deuda_Sueno',
    definicion: 'Déficit acumulado de sueño respecto de 8 horas por noche',
    unidades: 'Hora',
    valorInicialOConstante: 'D(0) = 0',
    observacion: 'Torres Soto & Martínez Ramírez (2026)',
  },
  {
    num: 3,
    clase: 'N',
    simbolo: 'K',
    nombre: 'Conocimiento',
    definicion: 'Proporción del contenido del semestre asimilada (rendimiento)',
    unidades: 'Punto',
    valorInicialOConstante: 'K(0) = 0',
    observacion: 'Pitta Villasboa et al. (2025)',
  },
  {
    num: 4,
    clase: 'F',
    simbolo: 'G',
    nombre: 'Generacion_Estres',
    definicion: 'Entrada de estrés, acotada para que E no supere Estres_Maximo',
    unidades: 'Punto/Semana',
    valorInicialOConstante: 'Flujo neto entrada',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 5,
    clase: 'F',
    simbolo: 'R',
    nombre: 'Recuperacion_Estres',
    definicion: 'Disipación natural del estrés modulada por el descanso',
    unidades: 'Punto/Semana',
    valorInicialOConstante: 'Flujo de salida',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 6,
    clase: 'F',
    simbolo: 'Def',
    nombre: 'Deficit_Sueno',
    definicion: 'Horas de sueño no dormidas por semana',
    unidades: 'Hora/Semana',
    valorInicialOConstante: 'Flujo de entrada',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 7,
    clase: 'F',
    simbolo: 'RD',
    nombre: 'Recuperacion_Deuda',
    definicion: 'Deuda de sueño que se recupera por semana',
    unidades: 'Hora/Semana',
    valorInicialOConstante: 'Flujo de salida',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 8,
    clase: 'F',
    simbolo: 'A',
    nombre: 'Aprendizaje',
    definicion: 'Incremento semanal del conocimiento adquirido',
    unidades: 'Punto/Semana',
    valorInicialOConstante: 'Flujo de entrada',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 9,
    clase: 'A',
    simbolo: 'Gb',
    nombre: 'Generacion_Bruta',
    definicion: 'Estrés generado por carga, estudio y deuda antes de aplicar la cota',
    unidades: 'Punto/Semana',
    valorInicialOConstante: 'Auxiliar intermedia',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 10,
    clase: 'A',
    simbolo: 'C',
    nombre: 'Carga_Academica',
    definicion: 'Evaluaciones que recibe el estudiante en la semana t',
    unidades: 'Evaluacion/Semana',
    valorInicialOConstante: 'Según Escenario (1 o 2)',
    observacion: 'Dato de entrada (cronograma)',
  },
  {
    num: 11,
    clase: 'A',
    simbolo: 'S',
    nombre: 'Horas_Sueno',
    definicion: 'Sueño nocturno, decreciente con el estrés (entre 4 y 8 h)',
    unidades: 'Hora/Noche',
    valorInicialOConstante: 'Auxiliar [4, 8]',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 12,
    clase: 'A',
    simbolo: 'H',
    nombre: 'Horas_Estudio',
    definicion: 'Estudio semanal, creciente cuando el conocimiento es bajo (máx 45 h)',
    unidades: 'Hora/Semana',
    valorInicialOConstante: 'Auxiliar [10, 45]',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 13,
    clase: 'A',
    simbolo: 'f',
    nombre: 'Eficiencia_Retencion',
    definicion: 'Factor cuadrático de retención cognitiva, entre 0 y 1',
    unidades: 'Dmnl (Adimensional)',
    valorInicialOConstante: 'Auxiliar [0, 1]',
    observacion: 'Ecuación del modelo',
  },
  {
    num: 14,
    clase: 'T',
    simbolo: 'α',
    nombre: 'Estres_Por_Evaluacion',
    definicion: 'Estrés que genera una evaluación',
    unidades: 'Punto/Evaluacion',
    valorInicialOConstante: '4.0',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 15,
    clase: 'T',
    simbolo: 'β',
    nombre: 'Amplificacion_Deuda',
    definicion: 'Aumento de la sensibilidad por cada hora de deuda de sueño',
    unidades: '1/Hora',
    valorInicialOConstante: '0.04',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 16,
    clase: 'T',
    simbolo: 'λ',
    nombre: 'Estres_Por_Hora_Estudio',
    definicion: 'Presión añadida por hora semanal de estudio',
    unidades: 'Punto/Hora',
    valorInicialOConstante: '0.09',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 17,
    clase: 'T',
    simbolo: 'ρ',
    nombre: 'Tasa_Recuperacion',
    definicion: 'Fracción del estrés que se disipa por semana con 8 h de sueño',
    unidades: '1/Semana',
    valorInicialOConstante: '0.30',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 18,
    clase: 'T',
    simbolo: 'δ',
    nombre: 'Tasa_Eliminacion_Deuda',
    definicion: 'Fracción de la deuda de sueño que se recupera por semana',
    unidades: '1/Semana',
    valorInicialOConstante: '0.35',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 19,
    clase: 'T',
    simbolo: 'γ',
    nombre: 'Perdida_Sueno_Por_Estres',
    definicion: 'Horas de sueño nocturno perdidas por cada punto de estrés',
    unidades: 'Hora/Noche/Punto',
    valorInicialOConstante: '0.025',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 20,
    clase: 'T',
    simbolo: 'H₀',
    nombre: 'Estudio_Base',
    definicion: 'Horas de estudio semanales con conocimiento pleno',
    unidades: 'Hora/Semana',
    valorInicialOConstante: '10',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 21,
    clase: 'T',
    simbolo: 'μ',
    nombre: 'Esfuerzo_Compensatorio',
    definicion: 'Horas extra semanales por cada punto de conocimiento faltante',
    unidades: 'Hora/Semana/Punto',
    valorInicialOConstante: '0.075',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 22,
    clase: 'T',
    simbolo: 'κ',
    nombre: 'Tasa_Aprendizaje',
    definicion: 'Aprendizaje ganado por hora de estudio efectiva',
    unidades: 'Punto/Hora',
    valorInicialOConstante: '0.27',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 23,
    clase: 'T',
    simbolo: 'D*',
    nombre: 'Escala_Deuda',
    definicion: 'Deuda de sueño que reduce la tasa de aprendizaje a la mitad',
    unidades: 'Hora',
    valorInicialOConstante: '60',
    observacion: 'Supuesto de partida, a calibrar',
  },
  {
    num: 24,
    clase: 'T',
    simbolo: 'E_máx',
    nombre: 'Estres_Maximo',
    definicion: 'Cota superior de la escala de estrés acumulado',
    unidades: 'Punto',
    valorInicialOConstante: '100',
    observacion: 'Constante de escala (Sección 3.5)',
  },
  {
    num: 25,
    clase: 'T',
    simbolo: 'K_máx',
    nombre: 'Conocimiento_Maximo',
    definicion: 'Cota superior del contenido curricular del semestre',
    unidades: 'Punto',
    valorInicialOConstante: '100',
    observacion: 'Constante de escala (Sección 3.5)',
  },
  {
    num: 26,
    clase: 'T',
    simbolo: 'S_ref / S_mín',
    nombre: 'Sueno_Referencia / Sueno_Minimo',
    definicion: 'Referencia saludable (8 h/noche) y piso fisiológico (4 h/noche)',
    unidades: 'Hora/Noche',
    valorInicialOConstante: '8 / 4',
    observacion: 'Constante fisiológica (Sección 3.5)',
  },
  {
    num: 27,
    clase: 'T',
    simbolo: 'H_máx',
    nombre: 'Estudio_Maximo',
    definicion: 'Tope máximo semanal de horas dedicadas al estudio',
    unidades: 'Hora/Semana',
    valorInicialOConstante: '45',
    observacion: 'Constante de escala (Sección 3.5)',
  },
  {
    num: 28,
    clase: 'T',
    simbolo: 'N_eval',
    nombre: 'Total_Evaluaciones',
    definicion: 'Número total de evaluaciones en el semestre (ej. 5 materias × 4)',
    unidades: 'Evaluacion',
    valorInicialOConstante: '20',
    observacion: 'Constante de escenario',
  },
  {
    num: 29,
    clase: 'T',
    simbolo: 'U_ag',
    nombre: 'Umbral_Agotamiento',
    definicion: 'Tres cuartos de la escala (75 pts) que marca el punto de quiebre',
    unidades: 'Punto',
    valorInicialOConstante: '75',
    observacion: 'Sección 3.6 (Análisis de sensibilidad)',
  },
];

export interface EquationSpec {
  grupo: 'Nivel (Euler)' | 'Flujo' | 'Auxiliar';
  nombre: string;
  formula: string;
  vensim: string;
  unidades: string;
  concordancia: string;
}

export const EQUATIONS_LIST: EquationSpec[] = [
  {
    grupo: 'Nivel (Euler)',
    nombre: 'Estres_Acumulado (E)',
    formula: 'E(t + Δt) = E(t) + Δt · [G(t) − R(t)],  E(0) = 62,4',
    vensim: 'INTEG(Generacion_Estres - Recuperacion_Estres, Estres_Inicial)',
    unidades: 'Punto',
    concordancia: 'Punto = Punto + Semana · (Punto/Semana − Punto/Semana)',
  },
  {
    grupo: 'Nivel (Euler)',
    nombre: 'Deuda_Sueno (D)',
    formula: 'D(t + Δt) = máx{ 0 ; D(t) + Δt · [Def(t) − RD(t)] },  D(0) = 0',
    vensim: 'INTEG(Deficit_Sueno - Recuperacion_Deuda, 0)',
    unidades: 'Hora',
    concordancia: 'Hora = Hora + Semana · (Hora/Semana − Hora/Semana)',
  },
  {
    grupo: 'Nivel (Euler)',
    nombre: 'Conocimiento (K)',
    formula: 'K(t + Δt) = mín{ K_máx ; K(t) + Δt · A(t) },  K(0) = 0',
    vensim: 'INTEG(Aprendizaje, 0)',
    unidades: 'Punto',
    concordancia: 'Punto = Punto + Semana · (Punto/Semana)',
  },
  {
    grupo: 'Flujo',
    nombre: 'Generacion_Estres (G)',
    formula: 'G(t) = mín{ Gb(t) ; R(t) + (E_máx − E(t)) / Δt }',
    vensim: 'MIN(Generacion_Bruta, Recuperacion_Estres + (Estres_Maximo - Estres_Acumulado) / TIME STEP)',
    unidades: 'Punto/Semana',
    concordancia: 'Punto/Semana = mín{ Punto/Semana ; Punto/Semana + (Punto − Punto)/Semana }',
  },
  {
    grupo: 'Flujo',
    nombre: 'Recuperacion_Estres (R)',
    formula: 'R(t) = ρ · E(t) · [S(t) / S_ref]',
    vensim: 'Tasa_Recuperacion * Estres_Acumulado * Horas_Sueno / Sueno_Referencia',
    unidades: 'Punto/Semana',
    concordancia: 'Punto/Semana = (1/Semana · Punto) · (Hora/Noche) / (Hora/Noche)',
  },
  {
    grupo: 'Flujo',
    nombre: 'Deficit_Sueno (Def)',
    formula: 'Def(t) = Noches_Por_Semana · (S_ref − S(t))',
    vensim: 'Noches_Por_Semana * (Sueno_Referencia - Horas_Sueno)',
    unidades: 'Hora/Semana',
    concordancia: 'Hora/Semana = (Noche/Semana) · (Hora/Noche − Hora/Noche)',
  },
  {
    grupo: 'Flujo',
    nombre: 'Recuperacion_Deuda (RD)',
    formula: 'RD(t) = δ · D(t)',
    vensim: 'Tasa_Eliminacion_Deuda * Deuda_Sueno',
    unidades: 'Hora/Semana',
    concordancia: 'Hora/Semana = (1/Semana) · Hora',
  },
  {
    grupo: 'Flujo',
    nombre: 'Aprendizaje (A)',
    formula: 'A(t) = κ · H(t) · f(E) · [1 − K(t)/100] / [1 + D(t)/D*]',
    vensim: 'Tasa_Aprendizaje * Horas_Estudio * Eficiencia_Retencion * (1 - Conocimiento / Conocimiento_Maximo) / (1 + Deuda_Sueno / Escala_Deuda)',
    unidades: 'Punto/Semana',
    concordancia: 'Punto/Semana = (Punto/Hora · Hora/Semana) · 1 · [1 − Pto/Pto] / [1 + Hora/Hora]',
  },
  {
    grupo: 'Auxiliar',
    nombre: 'Generacion_Bruta (Gb)',
    formula: 'Gb(t) = α · C(t) · [1 + β · D(t)] + λ · H(t)',
    vensim: 'Estres_Por_Evaluacion * Carga_Academica * (1 + Amplificacion_Deuda * Deuda_Sueno) + Estres_Por_Hora_Estudio * Horas_Estudio',
    unidades: 'Punto/Semana',
    concordancia: 'Punto/Semana = (Punto/Eval · Eval/Semana)·[1 + (1/Hora · Hora)] + (Punto/Hora · Hora/Semana)',
  },
  {
    grupo: 'Auxiliar',
    nombre: 'Horas_Sueno (S)',
    formula: 'S(t) = máx{ 4 ; 8 − γ · E(t) }',
    vensim: 'MAX(Sueno_Minimo, Sueno_Referencia - Perdida_Sueno_Por_Estres * Estres_Acumulado)',
    unidades: 'Hora/Noche',
    concordancia: 'Hora/Noche = máx{ Hora/Noche ; Hora/Noche − (Hora/Noche/Punto · Punto) }',
  },
  {
    grupo: 'Auxiliar',
    nombre: 'Horas_Estudio (H)',
    formula: 'H(t) = mín{ 45 ; H₀ + μ · (100 − K(t)) }',
    vensim: 'MIN(Estudio_Maximo, Estudio_Base + Esfuerzo_Compensatorio * (Conocimiento_Maximo - Conocimiento))',
    unidades: 'Hora/Semana',
    concordancia: 'Hora/Semana = mín{ Hora/Semana ; Hora/Semana + (Hora/Semana/Punto · Punto) }',
  },
  {
    grupo: 'Auxiliar',
    nombre: 'Eficiencia_Retencion (f)',
    formula: 'f(E) = máx{ 0 ; 1 − (E(t) / 100)² }',
    vensim: 'MAX(0, 1 - (Estres_Acumulado / Estres_Maximo) ^ 2)',
    unidades: 'Adimensional',
    concordancia: 'Adimensional = 1 − (Punto / Punto)²',
  },
];

export interface DefenseQA {
  pregunta: string;
  respuesta: string;
}

export const DEFENSE_QA: DefenseQA[] = [
  {
    pregunta: '¿Por qué el estrés inicial es 62,4 puntos y no cero?',
    respuesta:
      'Se ancla el estado inicial E(0) = 62,4 a la prevalencia de estrés académico de 62,4 % reportada en estudiantes universitarios por Sarmiento-Gomez y Philco-Lima (2025). En las tablas de validación se reconoce este supuesto simplificador y se plantea sustituirlo por el puntaje medio SISCO cuando se aplique la encuesta longitudinal.',
  },
  {
    pregunta: '¿Por qué en el escenario concentrado el estrés final (31,8) es menor que en el distribuido (40,7)?',
    respuesta:
      'Porque tras el pico en las semanas 7 y 8 (donde el 60 % de evaluaciones dispara el estrés a 86,4 y cruza el umbral de 75 durante 1,35 semanas), las semanas 9 a 16 tienen apenas 0,57 eval./semana. Sin embargo, el conocimiento final cae un 6,4 % (32,2 frente a 34,4) debido al daño acumulado durante el pico y la deuda de sueño de 30,1 h en la semana 10.',
  },
  {
    pregunta: '¿Cómo se garantiza matemáticamente que el estrés nunca supere 100 puntos ni sea negativo?',
    respuesta:
      'La cota superior se impone en el flujo de entrada mediante el bucle B3: G = mín{ Gb ; R + (E_máx − E)/Δt }. Al sustituir en Euler E_next = E + Δt·(G − R), si G toma la segunda rama se obtiene exactamente E_next = E + Δt·((E_máx − E)/Δt) = E_máx = 100. Además, como R = ρ·E·(S/8) es proporcional a E y Δt = 0,05 < 1/ρ, E tampoco se vuelve negativo.',
  },
  {
    pregunta: '¿Qué parámetros dominan el comportamiento del sistema y deben priorizarse al calibrar?',
    respuesta:
      'El análisis de sensibilidad (±10 % y variación estructural) demuestra que el pico de estrés es más sensible a α, ρ y γ, mientras que el conocimiento final responde principalmente a ρ, κ, α y γ. Con ρ = 0,40 el sistema absorbe el pico sin cruzar 75 pts, probando que políticas de recuperación pesan tanto como el calendario.',
  },
  {
    pregunta: '¿Por qué es estable la integración numérica con TIME STEP = 0,05 semanas?',
    respuesta:
      'La constante de tiempo más rápida del modelo corresponde a Tasa_Eliminacion_Deuda (δ = 0,35/sem, τ ≈ 2,86 sem) y Tasa_Recuperacion (ρ = 0,30/sem, τ ≈ 3,33 sem). Con Δt = 0,05 ≪ τ/4, la diferencia frente a Δt = 0,0125 y Δt = 0,1 es menor a 0,2 puntos en toda la trayectoria.',
  },
];

export const PROJECT_META = {
  titulo: 'Impacto de la Carga Académica en el Rendimiento y Estrés Estudiantil',
  enfoque: 'Modelo de Dinámica de Sistemas · Bucle de Agotamiento',
  descripcion:
    'Análisis cuantitativo de cómo la acumulación y distribución temporal de las evaluaciones durante un semestre de 16 semanas afecta el estrés acumulado (E), la deuda de sueño (D), el conocimiento adquirido (K) y el punto de quiebre (≥ 75 puntos).',
  pilares: [
    '3 Niveles: Estrés (E), Deuda de Sueño (D) y Conocimiento (K)',
    'Punto de Quiebre: Umbral de agotamiento en 75 puntos',
    '6+1 Bucles: 4 de refuerzo (agotamiento) y 3 de balance',
  ],
};

