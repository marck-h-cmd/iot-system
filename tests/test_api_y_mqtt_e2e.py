"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
PRUEBAS DE INTEGRACIÓN END-TO-END: FastAPI REST API + EMQX Broker MQTT Real
=========================================================================================
"""

import sys
import os
import time
import json
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.mqtt_service import mqtt_service
import paho.mqtt.client as mqtt

class TestApiYMqttEndToEnd(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n" + "=" * 70)
        print(" INICIANDO PRUEBAS E2E DE FASTAPI Y BROKER EMQX MQTT")
        print("=" * 70)
        cls.client = TestClient(app)
        # Iniciar servicio MQTT si no estaba iniciado
        mqtt_service.iniciar()
        time.sleep(1.0)

    @classmethod
    def tearDownClass(cls):
        mqtt_service.detener()

    def test_01_endpoint_health(self):
        """Verifica salud del sistema y conexión a MySQL / MQTT"""
        print("\n[E2E 1] Probando GET /api/health...")
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"  [OK] Respuesta Health: {data}")
        self.assertTrue(data["database_connected"], "MySQL debería estar conectado")

    def test_02_endpoint_telemetria_actual(self):
        """Verifica telemetría actual de las 5 zonas"""
        print("\n[E2E 2] Probando GET /api/telemetria/actual...")
        response = self.client.get("/api/telemetria/actual")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        print(f"  [OK] Total zonas con telemetría actual: {len(data)}")

    def test_03_endpoint_metricas_ml(self):
        """Verifica cálculo de MAE, RMSE y R² (Dimensión 2)"""
        print("\n[E2E 3] Probando GET /api/metricas...")
        response = self.client.get("/api/metricas?zona=todas")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"  [OK] Métricas ML: MAE={data['mae']} C, RMSE={data['rmse']} C, R2={data['r2']}")
        self.assertIn("mae", data)
        self.assertIn("rmse", data)
        self.assertIn("r2", data)
        self.assertIn("interpretacion", data)

    def test_04_endpoint_indicadores_4_dimensiones(self):
        """Verifica consolidado de las 4 dimensiones del proyecto de investigación"""
        print("\n[E2E 4] Probando GET /api/indicadores...")
        response = self.client.get("/api/indicadores")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("dimension_1", data)
        self.assertIn("dimension_2", data)
        self.assertIn("dimension_3", data)
        self.assertIn("dimension_4", data)
        print(f"  [OK] Indicadores consolidados retornados exitosamente.")

    def test_05_endpoint_control_manual(self):
        """Verifica comando de control manual de servomotor y ventilador"""
        print("\n[E2E 5] Probando POST /api/control/manual...")
        payload = {"zona": "zona4", "fan_state": 1, "servo_angle": 135}
        response = self.client.post("/api/control/manual", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["zona"], "zona4")
        self.assertEqual(data["fan_state"], 1)
        self.assertEqual(data["servo_angle"], 135)
        print(f"  [OK] Comando manual aceptado: {data['mensaje']}")

    def test_06_flujo_completo_mqtt_trigger_y_ack(self):
        """
        Verifica el ciclo completo:
        1. Publica telemetría crítica en MQTT (> 35°C en Zona 4).
        2. Backend detecta alerta y emite orden de acción a `lab/piloto/accion`.
        3. Simulador de hardware recibe la orden y retorna ACK a `lab/piloto/ack`.
        4. Backend recibe ACK y registra latencia en base de datos.
        """
        print("\n[E2E 6] Probando flujo completo MQTT: Telemetría >35 C -> Decisión -> ACK -> Latencia...")
        
        ordenes_recibidas = []

        def on_sub_message(client, userdata, msg):
            try:
                p = json.loads(msg.payload.decode("utf-8"))
                ordenes_recibidas.append(p)
                # Simular respuesta inmediata de ACK desde Arduino Nano
                ack_resp = {
                    "tipo": "ack",
                    "status": "OK",
                    "zona_objetivo": p.get("zona_objetivo"),
                    "fan_state": p.get("fan_state"),
                    "servo_angle": p.get("servo_angle"),
                    "timestamp_decision": p.get("timestamp_decision")
                }
                client.publish("lab/piloto/ack", json.dumps(ack_resp))
            except Exception as e:
                pass

        # Cliente de prueba conectado al broker EMQX
        test_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="tester_sensor_hw")
        test_client.username_pw_set("sensor_iot", "marck124M")
        test_client.on_message = on_sub_message
        test_client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
        test_client.subscribe("lab/piloto/accion")
        test_client.loop_start()

        time.sleep(0.5)

        # 1. Enviar telemetría de Zona 4 con temperatura crítica (36.5°C > 35°C)
        ts_pub = time.time()
        tele_critica = {
            "msg_id": 8881,
            "zona": "zona4",
            "temperatura": 36.5,
            "origen": "virtual",
            "timestamp_origen": ts_pub
        }
        test_client.publish("lab/piloto/zona4/temp", json.dumps(tele_critica))
        print("  [OK] Telemetría crítica de 36.5 C publicada en lab/piloto/zona4/temp")

        # Esperar a que el backend procese, prediga, emita orden y reciba el ACK
        time.sleep(2.0)

        test_client.loop_stop()
        test_client.disconnect()

        # Verificar que el backend registró la orden y la latencia
        res_eventos = self.client.get("/api/control/eventos?limit=5")
        self.assertEqual(res_eventos.status_code, 200)
        eventos = res_eventos.json()
        self.assertGreater(len(eventos), 0)

        ev_critico = next((e for e in eventos if e["zona_objetivo"] == "zona4"), None)
        self.assertIsNotNone(ev_critico, "No se encontró el evento para la zona crítica")
        self.assertEqual(ev_critico["fan_state"], 1, "El ventilador debió activarse")
        self.assertEqual(ev_critico["servo_angle"], 135, "El ángulo debió orientarse a 135°")
        print(f"  [OK] Flujo verificado: Zona crítica atendida={ev_critico['zona_objetivo']}, Fan={ev_critico['fan_state']}, Servo={ev_critico['servo_angle']} , Latencia={ev_critico['latencia_ms']} ms")

if __name__ == "__main__":
    unittest.main()
