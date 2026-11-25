import { useState } from "react";
import { ConfirmacionNano, TelemetriaNano } from "../types/iot";
import { enviarOrdenNano } from "../services/api";
import { ANGULO_MAXIMO, ANGULO_MINIMO, DialPaleta, PASO_ANGULAR } from "./DialPaleta";
import styles from "./DialPaleta.module.css";

export function ControlFisicoNano({
  telemetria,
  cardClass,
  alConfirmar,
}: {
  telemetria: TelemetriaNano | null;
  cardClass: string;
  alConfirmar: () => void;
}) {
  const [angulo, setAngulo] = useState(90);
  const [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionNano | null>(null);
  const [ultimaOrden, setUltimaOrden] = useState<Parameters<typeof enviarOrdenNano>[0]["modo"]>("autonomo");
  const [error, setError] = useState("");
  const disponible = Boolean(telemetria) && !ocupado;

  async function enviar(orden: Parameters<typeof enviarOrdenNano>[0]) {
    setOcupado(true);
    setError("");
    setConfirmacion(null);
    setUltimaOrden(orden.modo);
    try {
      setConfirmacion(await enviarOrdenNano(orden));
      alConfirmar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error enviando la orden física.");
    } finally {
      setOcupado(false);
    }
  }

  const boton = "rounded-lg border border-slate-500/40 px-3 py-2 text-xs font-medium hover:border-sky-500 disabled:opacity-50";

  return (
    <section aria-labelledby="control-nano" className={`${cardClass} space-y-4 rounded-xl p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="control-nano" className="text-sm font-semibold">Control físico del Nano</h2>
          <p className="mt-1 text-xs opacity-80">
            {telemetria ? "Conectado por USB" : "Esperando enlace USB"} · Las órdenes manuales duran 30 s.
          </p>
        </div>
        <p aria-live="polite" className="text-xs tabular-nums">
          {telemetria
            ? `${!telemetria.servo_activo ? "En pausa" : telemetria.manual ? "Manual" : "Automático"} · Ventilador ${telemetria.ventilador ? "encendido" : "apagado"} · ${telemetria.servo_activo ? `Servo ${telemetria.angulo}°` : "Servo detenido"}`
            : "Sin confirmación del Nano"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={boton} disabled={!disponible} onClick={() => void enviar({modo: "manual", ventilador: true, angulo: telemetria?.angulo ?? 90})}>
          Encender ventilador físico
        </button>
        <button className={boton} disabled={!disponible} onClick={() => void enviar({modo: "pausa"})}>
          Pausar ventilador y servo (30 s)
        </button>
        <button className={boton} disabled={!disponible} onClick={() => void enviar({modo: "autonomo"})}>
          Volver a automático
        </button>
      </div>
      <div className={`${styles.panel} rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 sm:p-4`}>
        <DialPaleta anguloReportado={telemetria?.angulo ?? null} anguloElegido={angulo} alElegir={setAngulo} />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Orientación de la paleta</h3>
          <dl className="grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
            <div className="border-l-2 border-[var(--accent-primary)] pl-2.5">
              <dt>Reportado por el Nano</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {telemetria ? `${telemetria.angulo}°` : "—"}
              </dd>
            </div>
            <div className="border-l-2 border-dashed border-[var(--status-warning)] pl-2.5">
              <dt>Ángulo elegido</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{angulo}°</dd>
            </div>
          </dl>
          <label className="block text-xs text-[var(--text-secondary)]">
            Ajustar ángulo
            <input
              type="range"
              dir="rtl"
              min={ANGULO_MINIMO}
              max={ANGULO_MAXIMO}
              step={PASO_ANGULAR}
              value={angulo}
              onChange={(e) => setAngulo(Number(e.target.value))}
              aria-valuetext={`${angulo} grados`}
              className="mt-1 block h-6 w-full accent-[var(--status-warning)]"
            />
          </label>
          <button
            className="rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--bg-main)] enabled:hover:brightness-110 disabled:opacity-50"
            disabled={!disponible}
            onClick={() => void enviar({modo: "manual", ventilador: telemetria?.ventilador ?? false, angulo})}
          >
            Mover paleta física
          </button>
        </div>
      </div>
      <p role="status" className="text-xs">
        {ocupado ? "Esperando confirmación del Nano…" : error || (confirmacion && (
          confirmacion.proteccion
            ? ultimaOrden === "pausa"
              ? "El Nano mantuvo la ventilación por una lectura de sensor inválida."
              : "El Nano confirmó la orden con protección térmica activa."
            : !confirmacion.servo_activo
              ? "Pausa confirmada · ventilador apagado y señal del servo detenida."
              : `Confirmado por el Nano · ventilador ${confirmacion.ventilador ? "encendido" : "apagado"} · objetivo del servo ${confirmacion.angulo_objetivo}°`
        ))}
      </p>
    </section>
  );
}
