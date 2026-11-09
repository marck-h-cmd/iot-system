import React from "react";

interface BrandLogoProps {
  compact?: boolean;
  darkMode?: boolean;
}

export function BrandLogo({ compact = false, darkMode = true }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
          darkMode
            ? "bg-[#19263B] border-slate-700"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
          <path
            d="M12 40 A20 20 0 0 1 52 40"
            stroke="#38BDF8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <path
            d="M32 14 C37 14 40 20 35 26 C39 24 46 27 45 33 C44 38 37 38 33 34 C35 39 31 46 26 45 C21 44 21 37 25 33 C20 35 14 31 16 25 C17 20 24 21 28 25 C26 19 28 14 32 14 Z"
            fill="#38BDF8"
          />
          <line
            x1="32"
            y1="31"
            x2="46"
            y2="18"
            stroke="#F59E0B"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="31" r="4.5" fill="#0B1220" stroke="#38BDF8" strokeWidth="2.5" />
        </svg>
      </div>

      {!compact && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-semibold text-sm tracking-tight ${
                darkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Smart Cooling
            </span>
          </div>
          <p
            className={`text-[11px] truncate ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Control Térmico IoT
          </p>
        </div>
      )}
    </div>
  );
}
