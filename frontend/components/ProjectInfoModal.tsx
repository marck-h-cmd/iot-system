import React from "react";
import { X, Cpu, Server, Compass } from "lucide-react";

interface ProjectInfoModalProps {
  open: boolean;
  darkMode: boolean;
  onClose: () => void;
}

export function ProjectInfoModal({ open, darkMode, onClose }: ProjectInfoModalProps) {
  if (!open) return null;

  const textMuted = darkMode ? "text-slate-300" : "text-slate-600";
  const boxClass = darkMode
    ? "bg-[#19263B] border-slate-700"
    : "bg-slate-50 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-xl rounded-xl border p-6 shadow-xl ${
          darkMode
            ? "bg-[#111C2E] border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-500/20">
          <div>
            <span
              className={`text-xs font-medium ${
                darkMode ? "text-sky-400" : "text-blue-700"
              }`}
            >
              Información del proyecto
            </span>
            <h3 className="text-base font-semibold mt-0.5">
              Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
            </h3>
            <p className={`text-xs mt-1 ${textMuted}`}>
              Universidad Nacional de Trujillo (UNT) • Escuela de Ingeniería de Sistemas
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                : "border-slate-200 hover:bg-slate-100 text-slate-600"
            }`}
            aria-label="Cerrar información del proyecto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 my-4 text-sm">
          <div className={`p-3.5 rounded-lg border ${boxClass}`}>
            <div className="flex items-center gap-2 font-medium mb-1">
              <Cpu className="w-4 h-4 text-sky-500" />
              <span>Estado de operación actual: Simulación de 5 zonas</span>
            </div>
            <p className={`text-xs leading-relaxed ${textMuted}`}>
              El circuito físico (Arduino Nano, ESP32, sensores DHT11/DS18B20, ventilador MOSFET y servomotor SG90) se encuentra modelado por el simulador termodinámico Python conectado vía MQTT EMQX.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-lg border ${boxClass}`}>
              <div className="flex items-center gap-1.5 font-medium mb-1">
                <Server className="w-3.5 h-3.5 text-sky-500" />
                <span>Arquitectura de software</span>
              </div>
              <p className={textMuted}>
                FastAPI + Scikit-Learn (regresión lineal a +10 min), MySQL 8.0, broker MQTT EMQX, Next.js 14 y React Native / Expo.
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${boxClass}`}>
              <div className="flex items-center gap-1.5 font-medium mb-1">
                <Compass className="w-3.5 h-3.5 text-sky-500" />
                <span>Distribución angular (SG90)</span>
              </div>
              <p className={textMuted}>
                PC 1: 0° (DHT11) • PC 2: 45° (DS18B20) • PC 3: 90° • PC 4: 135° • PC 5: 180°.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-500/20">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              darkMode
                ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

