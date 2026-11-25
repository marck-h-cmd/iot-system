import styles from "./DialPaleta.module.css";

export const ANGULO_MINIMO = 45;
export const ANGULO_MAXIMO = 135;
export const PASO_ANGULAR = 5;

const marcas = Array.from(
  { length: (ANGULO_MAXIMO - ANGULO_MINIMO) / PASO_ANGULAR + 1 },
  (_, indice) => ANGULO_MAXIMO - indice * PASO_ANGULAR,
);
const accesos = [45, 90, 135];

function giroVisual(angulo: number) {
  return 90 - angulo;
}

function posicion(angulo: number, radio: number) {
  const radianes = (giroVisual(angulo) * Math.PI) / 180;
  return {
    left: `${((160 + Math.sin(radianes) * radio) / 320) * 100}%`,
    top: `${((156 - Math.cos(radianes) * radio) / 184) * 100}%`,
  };
}

export function DialPaleta({
  anguloReportado,
  anguloElegido,
  alElegir,
}: {
  anguloReportado: number | null;
  anguloElegido: number;
  alElegir: (angulo: number) => void;
}) {
  return (
    <div className={styles.dial} role="group" aria-label="Dial de orientación de la paleta">
      <span className={styles.arco} aria-hidden="true" />

      {marcas.map((marca) => {
        const principal = marca % 15 === 0;
        return (
          <span
            key={marca}
            aria-hidden="true"
            className={principal ? styles.marcaPrincipal : styles.marca}
            style={{ ...posicion(marca, 117), rotate: `${giroVisual(marca)}deg` }}
          />
        );
      })}

      {marcas.filter((marca) => marca % 15 === 0).map((marca) => (
        accesos.includes(marca) ? (
          <button
            key={marca}
            type="button"
            className={styles.acceso}
            style={posicion(marca, 143)}
            aria-label={`Elegir ${marca} grados`}
            aria-pressed={anguloElegido === marca}
            onClick={() => alElegir(marca)}
          >
            {marca}°
          </button>
        ) : (
          <span key={marca} className={styles.etiqueta} style={posicion(marca, 143)} aria-hidden="true">
            {marca}°
          </span>
        )
      ))}

      <span
        aria-hidden="true"
        className={styles.agujaElegida}
        style={{ rotate: `${giroVisual(anguloElegido)}deg` }}
      />
      {anguloReportado !== null && (
        <span
          aria-hidden="true"
          className={styles.agujaReportada}
          style={{ rotate: `${giroVisual(anguloReportado)}deg` }}
        />
      )}
      <span className={styles.eje} aria-hidden="true" />
    </div>
  );
}
