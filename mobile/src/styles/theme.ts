export interface ThemePalette {
  dark: boolean;
  bgMain: string;
  bgElevated: string;
  bgCard: string;
  bgSubCard: string;
  borderCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSoft: string;
  primaryBlue: string;
  primaryBlueSoft: string;
  cyan: string;
  cyanSoft: string;
  indigo: string;
  emerald: string;
  emeraldSoft: string;
  amber: string;
  amberSoft: string;
  rose: string;
  roseSoft: string;
}

export const DARK_THEME: ThemePalette = {
  dark: true,
  bgMain: "#0B1220",
  bgElevated: "#111C2E",
  bgCard: "#111C2E",
  bgSubCard: "#19263B",
  borderCard: "#334155",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  accentPrimary: "#38BDF8",
  accentSoft: "rgba(56, 189, 248, 0.15)",
  primaryBlue: "#38BDF8",
  primaryBlueSoft: "rgba(56, 189, 248, 0.15)",
  cyan: "#38BDF8",
  cyanSoft: "rgba(56, 189, 248, 0.15)",
  indigo: "#818CF8",
  emerald: "#22C55E",
  emeraldSoft: "rgba(34, 197, 94, 0.16)",
  amber: "#F59E0B",
  amberSoft: "rgba(245, 158, 11, 0.16)",
  rose: "#F87171",
  roseSoft: "rgba(248, 113, 113, 0.16)",
};

export const LIGHT_THEME: ThemePalette = {
  dark: false,
  bgMain: "#F8FAFC",
  bgElevated: "#FFFFFF",
  bgCard: "#FFFFFF",
  bgSubCard: "#F1F5F9",
  borderCard: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  accentPrimary: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.10)",
  primaryBlue: "#2563EB",
  primaryBlueSoft: "rgba(37, 99, 235, 0.10)",
  cyan: "#0891B2",
  cyanSoft: "rgba(8, 145, 178, 0.10)",
  indigo: "#4F46E5",
  emerald: "#15803D",
  emeraldSoft: "rgba(21, 128, 61, 0.10)",
  amber: "#B45309",
  amberSoft: "rgba(180, 83, 9, 0.10)",
  rose: "#DC2626",
  roseSoft: "rgba(220, 38, 38, 0.10)",
};

export const ZONAS_CONFIG = [
  { id: "zona1", pc: "PC 1", nombre: "PC 1", angulo: 0, sensor: "DHT11 (Simulado)" },
  { id: "zona2", pc: "PC 2", nombre: "PC 2", angulo: 45, sensor: "DS18B20 (Simulado)" },
  { id: "zona3", pc: "PC 3", nombre: "PC 3", angulo: 90, sensor: "Sonda Virtual (Simulado)" },
  { id: "zona4", pc: "PC 4", nombre: "PC 4", angulo: 135, sensor: "Sonda Virtual (Simulado)" },
  { id: "zona5", pc: "PC 5", nombre: "PC 5", angulo: 180, sensor: "Sonda Virtual (Simulado)" },
];

// Compatibilidad hacia atrás para módulos legacy v1
export const colors = {
  background: "#0B1220",
  surface: "#111C2E",
  surfaceElevated: "#19263B",
  surfaceBorder: "#334155",
  border: "#334155",
  primary: "#38BDF8",
  secondary: "#6366F1",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#F87171",
  cyan: "#38BDF8",
  emerald: "#22C55E",
  amber: "#F59E0B",
  rose: "#F87171",
  purple: "#A855F7",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
};

export const zoneConfigurations: Record<
  string,
  {
    name: string;
    nombre: string;
    angle: number;
    angulo: number;
    sensor: string;
    tipo: string;
    description: string;
  }
> = {
  zona1: {
    name: "PC 1",
    nombre: "PC 1",
    angle: 0,
    angulo: 0,
    sensor: "DHT11 (Simulado)",
    tipo: "SIMULADO",
    description: "Estación 1",
  },
  zona2: {
    name: "PC 2",
    nombre: "PC 2",
    angle: 45,
    angulo: 45,
    sensor: "DS18B20 (Simulado)",
    tipo: "SIMULADO",
    description: "Estación 2",
  },
  zona3: {
    name: "PC 3",
    nombre: "PC 3",
    angle: 90,
    angulo: 90,
    sensor: "Sonda Virtual (Simulado)",
    tipo: "SIMULADO",
    description: "Estación 3",
  },
  zona4: {
    name: "PC 4",
    nombre: "PC 4",
    angle: 135,
    angulo: 135,
    sensor: "Sonda Virtual (Simulado)",
    tipo: "SIMULADO",
    description: "Estación 4",
  },
  zona5: {
    name: "PC 5",
    nombre: "PC 5",
    angle: 180,
    angulo: 180,
    sensor: "Sonda Virtual (Simulado)",
    tipo: "SIMULADO",
    description: "Estación 5",
  },
};
