"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
SUITE DE PRUEBAS AUTOMATIZADA: Verificación Integral del Sistema
=========================================================================================
"""

import sys
import os
import time
import json
import unittest

# Asegurar que el backend esté en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.config import settings
from app.database import db_manager
from app.ml_model import ml_predictor, LinearRegressionPredictor
import paho.mqtt.client as mqtt

class TestSistemaEnfriamientoIoT(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n" + "=" * 70)
        print(" INICIANDO BATERÍA DE PRUEBAS DEL SISTEMA DE ENFRIAMIENTO IOT")
        print("=" * 70)

    def test_01_conexion_mysql_y_tablas(self):
        """Prueba 1: Verificar conectividad a MySQL y existencia de tablas operativas"""
        print("\n[TEST 1] Verificando conexión a MySQL y esquema de base de datos...")
        conn = db_manager.get_connection()
        self.assertTrue(conn.is_connected(), "La conexión a MySQL falló")

        cursor = conn.cursor()
        cursor.execute("SHOW TABLES LIKE 'registro_termico'")
        self.assertIsNotNone(cursor.fetchone(), "Tabla registro_termico no existe")

        cursor.execute("SHOW TABLES LIKE 'control_eventos'")
        self.assertIsNotNone(cursor.fetchone(), "Tabla control_eventos no existe")

        cursor.execute("SHOW TABLES LIKE 'mqtt_user'")
        self.assertIsNotNone(cursor.fetchone(), "Tabla mqtt_user no existe")

        cursor.close()
        conn.close()
        print("  [OK] Conexión MySQL exitosa y tablas validadas.")

    def test_02_insercion_telemetria_y_consulta(self):
        """Prueba 2: Inserción de telemetría y consulta en registro_termico"""
        print("\n[TEST 2] Probando inserción y recuperación de telemetría...")
        nuevo_id = db_manager.insertar_registro_termico({
            "msg_id": 9999,
            "zona": "zona1",
            "temperatura_actual": 34.2,
            "temperatura_predicha": 35.8,
            "estado_ventilador": 1,
            "angulo_servo": 0,
            "origen": "real",
            "timestamp_origen": time.time()
        })
        self.assertIsNotNone(nuevo_id, "No se pudo insertar en registro_termico")
        self.assertGreater(nuevo_id, 0)

        # Consultar telemetría actual
        tele = db_manager.obtener_telemetria_actual()
        self.assertIsInstance(tele, list)
        self.assertGreater(len(tele), 0, "No se retornó telemetría")
        print(f"  [OK] Registro insertado con ID: {nuevo_id} y telemetría consultada.")

    def test_03_modelo_machine_learning_regresion_lineal(self):
        """Prueba 3: Predicción dinámica con Regresión Lineal de scikit-learn a +10 min"""
        print("\n[TEST 3] Evaluando algoritmo de Regresión Lineal (scikit-learn)...")
        predictor = LinearRegressionPredictor()

        # Inyectar serie temporal ascendente (simulando aumento de calor en 15 minutos)
        t_base = time.time() - 900
        predictor.agregar_muestra("zona4", 31.0, t_base)
        predictor.agregar_muestra("zona4", 32.2, t_base + 300)
        predictor.agregar_muestra("zona4", 33.5, t_base + 600)
        predictor.agregar_muestra("zona4", 34.8, t_base + 900)

        # Predecir a +10 minutos (600 segundos en el futuro)
        prediccion = predictor.predecir_futuro("zona4", 34.8, horizonte_segundos=600)
        print(f"  [OK] Temp Actual: 34.8 C -> Predicción a +10 min: {prediccion} C")
        self.assertGreater(prediccion, 34.8, "La predicción para una tendencia creciente debe superar el valor actual")
        self.assertLessEqual(prediccion, 50.0, "La predicción no debe sobrepasar límites térmicos físicos")

    def test_04_calculo_matematico_metricas_ml(self):
        """Prueba 4: Validación matemática de MAE, RMSE y R² (Dimensión 2)"""
        print("\n[TEST 4] Validando cálculo de MAE, RMSE y R²...")
        # Pares sintéticos conocidos de (predicho, real_10m_despues)
        pares_prueba = [
            (35.0, 35.2), # error = 0.2
            (36.1, 35.9), # error = 0.2
            (34.5, 34.8), # error = 0.3
            (37.0, 36.7), # error = 0.3
            (33.0, 33.4)  # error = 0.4
        ]
        metricas = LinearRegressionPredictor.calcular_metricas(pares_prueba)
        print(f"  [OK] Métricas calculadas: MAE={metricas['mae']} C, RMSE={metricas['rmse']} C, R2={metricas['r2']}")

        self.assertAlmostEqual(metricas["mae"], 0.28, delta=0.05, msg="Cálculo incorrecto de MAE")
        self.assertAlmostEqual(metricas["rmse"], 0.29, delta=0.05, msg="Cálculo incorrecto de RMSE")
        self.assertGreater(metricas["r2"], 0.85, "El valor de R² debe reflejar alto coeficiente de ajuste")

    def test_05_evento_control_y_latencia_ack(self):
        """Prueba 5: Registro de orden de control y cálculo de latencia de ACK (Dimensión 3)"""
        print("\n[TEST 5] Probando registro de evento de control y retorno de ACK con latencia...")
        ts_decision = time.time()
        ev_id = db_manager.insertar_evento_control(
            zona="zona4",
            temp_disparo=35.5,
            temp_pred=37.1,
            fan_state=1,
            servo_angle=135,
            ts_decision=ts_decision
        )
        self.assertIsNotNone(ev_id)

        # Simular llegada de ACK tras 42 milisegundos
        ts_ack = ts_decision + 0.042
        actualizado = db_manager.registrar_ack_control(
            zona="zona4",
            fan_state=1,
            servo_angle=135,
            ts_decision=ts_decision,
            ts_ack=ts_ack
        )
        self.assertTrue(actualizado, "No se actualizó el ACK en la base de datos")

        # Verificar en los eventos de control
        eventos = db_manager.obtener_eventos_control(limit=1)
        self.assertGreater(len(eventos), 0)
        ev_reciente = eventos[0]
        self.assertEqual(ev_reciente["zona_objetivo"], "zona4")
        self.assertEqual(ev_reciente["ack_recibido"], 1)
        self.assertAlmostEqual(ev_reciente["latencia_ms"], 42.0, delta=5.0)
        print(f"  [OK] Evento registrado. Latencia de ACK: {ev_reciente['latencia_ms']} ms")

    def test_06_resumen_indicadores_4_dimensiones(self):
        """Prueba 6: Operacionalización de las 4 dimensiones de la investigación"""
        print("\n[TEST 6] Verificando reporte de las 4 dimensiones...")
        resumen = db_manager.obtener_resumen_indicadores()
        self.assertIn("dimension_1", resumen)
        self.assertIn("dimension_2", resumen)
        self.assertIn("dimension_3", resumen)
        self.assertIn("dimension_4", resumen)

        print(f"  [OK] Dim 1 (Transmisión): Intervalo={resumen['dimension_1']['intervalo_adquisicion_seg']}s, Total={resumen['dimension_1']['total_mensajes']} msgs")
        print(f"  [OK] Dim 3 (Control): Latencia Promedio={resumen['dimension_3']['latencia_promedio_ms']} ms, Tasa ACK={resumen['dimension_3']['tasa_ack_pct']}%")
        print(f"  [OK] Dim 4 (Térmica): Delta T={resumen['dimension_4']['delta_termico_c']} C, Fracción Fan={resumen['dimension_4']['fraccion_tiempo_fan_pct']}%")

if __name__ == "__main__":
    unittest.main()
