# Impacto de la Carga Académica en el Rendimiento y Estrés Estudiantil

Aplicación web interactiva de **Dinámica de Sistemas** basada en integración numérica por el **método de Euler** (`Δt = 0.05` semanas por defecto, horizonte de `16` semanas), diseñada para simular y analizar cómo la acumulación y distribución temporal de evaluaciones afecta el bienestar y aprendizaje estudiantil.

## Variables de Nivel (Stocks)

- **Estrés Acumulado (`E`):** escala de `0` a `100` puntos (`E(0) = 62.4`), con umbral de agotamiento en `75` puntos.
- **Deuda de Sueño (`D`):** déficit acumulado en horas respecto a `8 h/noche` (`D(0) = 0`).
- **Conocimiento Adquirido (`K`):** contenido asimilado del semestre de `0` a `100` puntos (`K(0) = 0`).

## Módulos de la Aplicación

1. **Simulador en Vivo:** Comparación Distribuido vs. Concentrado, escenarios preconfigurados (base, shocks extremos y sensibilidad), sliders de parámetros, reproducción animada semana a semana y 4 gráficas sincronizadas.
2. **Pruebas de Validación y Sensibilidad:** Figuras de shock, colapso, estabilidad numérica (`Δt = 0.0125, 0.05, 0.1`), sensibilidad estructural (`ρ` y `β`), análisis `±10 %`, contraste empírico SISCO y exportación CSV.
3. **Estructura del Modelo y Ecuaciones:** Diagrama Causal interactivo (7 bucles `R1–R4`, `B1–B3`), Diagrama de Forrester, demostración de la cota `0 ≤ E ≤ 100`, sistema de ecuaciones y tabla de magnitudes.
4. **Simulador de Mi Calendario:** Editor semanal de 16 semanas con detección automática de punto de quiebre y redistribución equilibrada.

## Ejecución Local

```bash
npm install
npm run dev
```

Para verificación matemática y compilación de producción:

```bash
node --experimental-strip-types scripts/verify-model.ts
npm run build
```

