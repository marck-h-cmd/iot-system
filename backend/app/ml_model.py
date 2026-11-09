import logging
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any, Optional
from sklearn.linear_model import LinearRegression
from collections import deque
import time

logger = logging.getLogger("backend.ml")

class LinearRegressionPredictor:
    """
    Modelo de Machine Learning (Scikit-Learn LinearRegression) para proyección térmica a +10 minutos.
    Ajusta una regresión lineal sobre la ventana temporal reciente de cada zona con amortiguamiento
    físico de pendiente para evitar sobre-extrapolaciones ante ruidos de corto plazo.
    """
    def __init__(self, ventana_max_historial: int = 40):
        self.historial_zonas: Dict[str, deque] = {
            f"zona{i}": deque(maxlen=ventana_max_historial) for i in range(1, 6)
        }
        self.modelos: Dict[str, LinearRegression] = {
            f"zona{i}": LinearRegression() for i in range(1, 6)
        }

    def reiniciar_historial(self):
        for k in self.historial_zonas:
            self.historial_zonas[k].clear()

    def agregar_muestra(self, zona: str, temperatura: float, timestamp: Optional[float] = None):
        if zona not in self.historial_zonas:
            self.historial_zonas[zona] = deque(maxlen=40)
            self.modelos[zona] = LinearRegression()
        ts = timestamp if timestamp is not None else time.time()
        self.historial_zonas[zona].append((float(ts), float(temperatura)))

    def predecir_futuro(self, zona: str, temp_actual: float, horizonte_segundos: int = 600, timestamp: Optional[float] = None) -> float:
        """
        Calcula la temperatura estimada a +10 minutos (600 segundos).
        Utiliza LinearRegression de scikit-learn sobre las muestras acumuladas,
        acotando la tasa máxima de cambio proyectada según la ventana temporal observada.
        """
        ahora = timestamp if timestamp is not None else time.time()
        self.agregar_muestra(zona, temp_actual, ahora)
        historial = list(self.historial_zonas[zona])

        if len(historial) >= 3:
            df = pd.DataFrame(historial, columns=["tiempo", "temp"])
            t0 = df["tiempo"].min()
            span_observado = max(1.0, float(df["tiempo"].max() - t0))
            X = (df["tiempo"] - t0).values.reshape(-1, 1)
            y = df["temp"].values

            try:
                modelo = self.modelos[zona]
                modelo.fit(X, y)

                pendiente_por_seg = float(modelo.coef_[0])
                # Factor de confianza proporcional a la ventana observada (máx 180s) para no amplificar ruido de 10s
                factor_amortiguamiento = min(1.0, span_observado / 120.0)
                delta_bruto = pendiente_por_seg * horizonte_segundos * max(0.35, factor_amortiguamiento)

                # Acotar el cambio proyectado a 10 minutos dentro de un rango físicamente realista [-4.5°C, +5.5°C]
                delta_acotado = max(-4.5, min(5.5, delta_bruto))
                pred = float(temp_actual + delta_acotado)

                pred_acotada = max(20.0, min(48.0, pred))
                return round(pred_acotada, 2)
            except Exception as e:
                logger.warning(f"Error entrenando LinearRegression para {zona}: {e}")

        # Si aún hay menos de 3 muestras en la ventana recién iniciada, proyectar tendencia suave
        delta_inicial = 0.9 if temp_actual >= 33.5 else 0.4
        return round(temp_actual + delta_inicial, 2)

    @staticmethod
    def calcular_metricas(pares: List[Tuple[float, float]]) -> Dict[str, Any]:
        """
        DIMENSIÓN 2: Calcula MAE, RMSE y R² matemáticamente a partir de pares reales disponibles (y_pred, y_real).
        Si no existen pares suficientes, reporta explícitamente disponibilidad insuficiente sin inventar métricas.
        """
        n = len(pares) if pares else 0
        if n == 0:
            return {
                "mae": None,
                "rmse": None,
                "r2": None,
                "muestras": 0,
                "suficiente": False,
                "origen_datos": "simulacion",
                "estado": "muestras_insuficientes",
                "mensaje": "Aún no existen pares con desfase de +10 minutos en la sesión actual."
            }

        y_pred = np.array([p[0] for p in pares], dtype=float)
        y_true = np.array([p[1] for p in pares], dtype=float)

        mae = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

        varianza_total = float(np.sum((y_true - np.mean(y_true)) ** 2))
        if varianza_total > 1e-6 and n >= 2:
            suma_residuos = float(np.sum((y_true - y_pred) ** 2))
            r2 = float(1.0 - (suma_residuos / varianza_total))
            r2 = round(max(-1.0, min(1.0, r2)), 4)
        else:
            r2 = None

        return {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": r2,
            "muestras": n,
            "suficiente": n >= 2,
            "origen_datos": "simulacion",
            "estado": "calculado_con_datos_simulados" if n >= 2 else "muestras_parciales",
            "mensaje": f"Métricas calculadas sobre {n} pares (T_pred vs T_real a +10m) de simulación."
        }

ml_predictor = LinearRegressionPredictor()
