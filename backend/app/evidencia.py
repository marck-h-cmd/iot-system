import csv
import os
from collections import Counter
from datetime import datetime
from pathlib import Path
from statistics import mean, median


DIRECTORIO_CSV = Path(os.getenv("EVIDENCIA_CSV_DIR", Path(__file__).resolve().parents[2]))


def _leer(nombre):
    with (DIRECTORIO_CSV / nombre).open(encoding="utf-8-sig", newline="") as archivo:
        return list(csv.DictReader(archivo))


def obtener_evidencia():
    hardware = _leer("datos_hardware_real.csv")
    simulacion = _leer("eventos_enfriamiento_antes_despues.csv")
    pares = _leer("analisis_reduccion_termica_antes_despues.csv")

    coincidencias = {
        (fila["estacion_pc"].casefold(), float(fila["temperatura_antes_disparo_c"]))
        for fila in simulacion
    }
    zonas = []
    transiciones = []
    for zona in sorted({fila["zona"] for fila in hardware}):
        lecturas = sorted(
            (fila for fila in hardware if fila["zona"] == zona),
            key=lambda fila: fila["fecha_hora"],
        )
        temperaturas = [float(fila["temperatura_actual_c"]) for fila in lecturas]
        zonas.append({
            "zona": zona, "sensor": lecturas[0]["sensor_tipo"], "lecturas": len(lecturas),
            "minima": min(temperaturas), "maxima": max(temperaturas),
        })
        for i, (antes, inicio) in enumerate(zip(lecturas, lecturas[1:]), start=1):
            if antes["ventilador_estado"] != "APAGADO" or inicio["ventilador_estado"] != "ENCENDIDO":
                continue
            posterior = lecturas[i + 1] if i + 1 < len(lecturas) else None
            if posterior and posterior["ventilador_estado"] != "ENCENDIDO":
                posterior = None
            transiciones.append({
                "zona": zona,
                "antes": float(antes["temperatura_actual_c"]),
                "inicio": float(inicio["temperatura_actual_c"]),
                "posterior": float(posterior["temperatura_actual_c"]) if posterior else None,
                "minutos_hasta_posterior": round(
                    (datetime.fromisoformat(posterior["fecha_hora"]) -
                     datetime.fromisoformat(inicio["fecha_hora"])).total_seconds() / 60, 1
                ) if posterior else None,
            })

    return {
        "hardware": {"lecturas": len(hardware), "zonas": zonas, "transiciones": transiciones},
        "simulacion": {
            "eventos": len(simulacion),
            "por_modo": dict(Counter(fila["modo_control"] for fila in simulacion)),
            "latencia_mediana_ms": round(median(float(fila["latencia_red_ms"]) for fila in simulacion), 2) if simulacion else None,
        },
        "pares": {
            "total": len(pares),
            "inicios_coincidentes": sum(
                (fila["estacion"].casefold(), float(fila["temperatura_inicial_antes_c"])) in coincidencias
                for fila in pares
            ),
            "caida_declarada_media_c": round(mean(
                float(fila["temperatura_inicial_antes_c"]) - float(fila["temperatura_final_despues_c"]) for fila in pares
            ), 2) if pares else None,
        },
    }
