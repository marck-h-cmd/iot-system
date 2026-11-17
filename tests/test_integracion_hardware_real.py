"""
Suite de Pruebas de Integración Contractual — Hardware Real (Arduino Nano + ESP32)
==================================================================================
Valida de extremo a extremo:
1. Contrato JSON exacto de `GET /datos` del ESP32 (`temp`, `tdht`, `hum`, `ventilador`, `error`, `edad`).
2. Transiciones de estado del enlace en `ESP32ClientService`:
   - CONECTADO (lectura fresca `edad <= 15`, sin error)
   - TELEMETRIA_ANTIGUA (`edad > 15`, no se muestra como lectura actual)
   - ERROR_SENSOR (`error: true` o `temp: null`, activa alerta y protección)
   - DESCONECTADO (timeout/rechazo de conexión cuando el servidor se apaga)
3. Modos operacionales del sistema en `MQTTService`:
   - MODO SIMULACIÓN (`simulacion`): 5 zonas simuladas (`origen='virtual'`).
   - MODO REAL (`real`): 2 zonas físicas (`zona1` DHT11, `zona2` DS18B20) con `origen='real'`,
     y 3 zonas (`zona3`, `zona4`, `zona5`) con `disponible=False` (`SIN_SENSOR_FISICO`), sin inventar temperaturas.
   - MODO HÍBRIDO (`hibrido`): 2 zonas físicas (`origen='real'`) + 3 zonas simuladas (`origen='virtual'`).
"""

import os
import sys
import types
import unittest
from unittest.mock import patch, MagicMock

# Agregar directorio backend al path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Si se ejecuta en host local sin dependencias de contenedor, proveer stubs ligeros para transporte/BD
try:
    import mysql.connector  # noqa: F401
except ImportError:
    mysql_mod = types.ModuleType("mysql")
    mysql_conn_mod = types.ModuleType("mysql.connector")
    mysql_conn_mod.connect = MagicMock()
    mysql_conn_mod.Error = Exception
    mysql_conn_mod.pooling = MagicMock()
    mysql_mod.connector = mysql_conn_mod
    sys.modules["mysql"] = mysql_mod
    sys.modules["mysql.connector"] = mysql_conn_mod

try:
    import paho.mqtt.client  # noqa: F401
except ImportError:
    paho_mod = types.ModuleType("paho")
    paho_mqtt_mod = types.ModuleType("paho.mqtt")
    paho_client_mod = types.ModuleType("paho.mqtt.client")
    paho_client_mod.Client = MagicMock()
    paho_client_mod.CallbackAPIVersion = MagicMock()
    paho_mqtt_mod.client = paho_client_mod
    paho_mod.mqtt = paho_mqtt_mod
    sys.modules["paho"] = paho_mod
    sys.modules["paho.mqtt"] = paho_mqtt_mod
    sys.modules["paho.mqtt.client"] = paho_client_mod

try:
    import numpy  # noqa: F401
    import sklearn  # noqa: F401
except ImportError:
    np_mod = types.ModuleType("numpy")
    np_mod.array = lambda x, *a, **k: x
    np_mod.mean = lambda x: sum(x) / len(x) if x else 0.0
    np_mod.sqrt = lambda x: x ** 0.5
    sys.modules["numpy"] = np_mod
    sk_mod = types.ModuleType("sklearn")
    sk_lm = types.ModuleType("sklearn.linear_model")
    sk_met = types.ModuleType("sklearn.metrics")
    sk_lm.LinearRegression = MagicMock()
    sk_met.mean_absolute_error = MagicMock(return_value=0.25)
    sk_met.mean_squared_error = MagicMock(return_value=0.09)
    sk_met.r2_score = MagicMock(return_value=0.92)
    sys.modules["sklearn"] = sk_mod
    sys.modules["sklearn.linear_model"] = sk_lm
    sys.modules["sklearn.metrics"] = sk_met

from tests.mock_esp32_server import MockESP32Server
from app.esp32_client import esp32_client
from app.mqtt_service import mqtt_service


class TestIntegracionHardwareReal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mock_server = MockESP32Server(host="127.0.0.1", port=18091)
        cls.mock_url = cls.mock_server.start()

    @classmethod
    def tearDownClass(cls):
        cls.mock_server.stop()

    def setUp(self):
        self.mock_server.set_escenario("normal")
        esp32_client.actualizar_configuracion(
            url=self.mock_url,
            poll_interval=1.0,
            mapping_dht11="zona1",
            mapping_ds18b20="zona2"
        )

    @patch("app.database.db_manager.insertar_registro_termico")
    def test_01_adquisicion_contrato_normal_conectado(self, mock_db_insert):
        """Verifica que el cliente parsea correctamente el JSON real de /datos en estado normal"""
        self.mock_server.set_escenario("normal")
        esp32_client._ultimo_ts_insercion = 0.0
        esp32_client._consultar_esp32()

        estado = esp32_client.obtener_estado()
        self.assertTrue(estado["conectado"])
        self.assertEqual(estado["estado_enlace"], "CONECTADO")
        self.assertEqual(estado["datos_actuales"]["temp"], 33.7)
        self.assertEqual(estado["datos_actuales"]["tdht"], 30.0)
        self.assertEqual(estado["datos_actuales"]["hum"], 71.0)
        self.assertTrue(estado["datos_actuales"]["ventilador"])
        self.assertFalse(estado["datos_actuales"]["error"])
        self.assertEqual(estado["datos_actuales"]["edad"], 1)

        # Verificar que persistió en MySQL etiquetado con origen='real'
        self.assertTrue(mock_db_insert.called)
        args_llamada = mock_db_insert.call_args[0][0]
        self.assertEqual(args_llamada["origen"], "real")

    @patch("app.database.db_manager.insertar_registro_termico")
    def test_02_deteccion_telemetria_antigua(self, mock_db_insert):
        """Verifica que si edad > 15s se clasifica como TELEMETRIA_ANTIGUA y no se expone como dato actual"""
        self.mock_server.set_escenario("telemetria_antigua")
        esp32_client._consultar_esp32()

        estado = esp32_client.obtener_estado()
        self.assertTrue(estado["conectado"])
        self.assertEqual(estado["estado_enlace"], "TELEMETRIA_ANTIGUA")

        zonas_hw = esp32_client.obtener_lecturas_para_zonas()
        self.assertFalse(zonas_hw["zona1"]["disponible"])
        self.assertIsNone(zonas_hw["zona1"]["temperatura_actual"])
        self.assertEqual(zonas_hw["zona1"]["ultima_temperatura_valida"], 29.0)
        self.assertEqual(zonas_hw["zona1"]["estado_telemetria"], "TELEMETRIA_ANTIGUA")

        self.assertFalse(zonas_hw["zona2"]["disponible"])
        self.assertIsNone(zonas_hw["zona2"]["temperatura_actual"])
        self.assertEqual(zonas_hw["zona2"]["ultima_temperatura_valida"], 31.2)

    @patch("app.database.db_manager.insertar_registro_termico")
    def test_03_deteccion_error_sensor_ds18b20(self, mock_db_insert):
        """Verifica que cuando error=true en DS18B20 se reporta ERROR_SENSOR pero DHT11 sigue disponible"""
        self.mock_server.set_escenario("error_sensor")
        esp32_client._consultar_esp32()

        estado = esp32_client.obtener_estado()
        self.assertEqual(estado["estado_enlace"], "ERROR_SENSOR")

        zonas_hw = esp32_client.obtener_lecturas_para_zonas()
        # DHT11 (zona1) sigue operativo
        self.assertTrue(zonas_hw["zona1"]["disponible"])
        self.assertEqual(zonas_hw["zona1"]["temperatura_actual"], 29.5)
        # DS18B20 (zona2) marca fallo sin inventar temperatura
        self.assertFalse(zonas_hw["zona2"]["disponible"])
        self.assertIsNone(zonas_hw["zona2"]["temperatura_actual"])
        self.assertEqual(zonas_hw["zona2"]["estado_telemetria"], "ERROR_SENSOR")

    @patch("app.database.db_manager.insertar_registro_termico")
    def test_04_modos_simulacion_real_hibrido(self, mock_db_insert):
        """Valida los 3 modos operacionales exigidos en la arquitectura: simulacion, real e hibrido"""
        self.mock_server.set_escenario("normal")
        esp32_client._consultar_esp32()

        # 1. MODO SIMULACIÓN
        est_sim = mqtt_service.cambiar_modo_operacion_sistema("simulacion")
        self.assertEqual(est_sim["sistema"]["modo_operacion_sistema"], "simulacion")
        for z in est_sim["zonas"]:
            self.assertEqual(z["origen"], "virtual")
            self.assertTrue(z["modo_simulacion"])

        # 2. MODO REAL (2 físicas, 3 sin sensor físico)
        est_real = mqtt_service.cambiar_modo_operacion_sistema("real")
        self.assertEqual(est_real["sistema"]["modo_operacion_sistema"], "real")
        zonas_dict_real = {z["zona"]: z for z in est_real["zonas"]}

        self.assertEqual(zonas_dict_real["zona1"]["origen"], "real")
        self.assertEqual(zonas_dict_real["zona1"]["temperatura_actual"], 30.0)
        self.assertEqual(zonas_dict_real["zona1"]["humedad"], 71.0)

        self.assertEqual(zonas_dict_real["zona2"]["origen"], "real")
        self.assertEqual(zonas_dict_real["zona2"]["temperatura_actual"], 33.7)

        for z_sin_sensor in ("zona3", "zona4", "zona5"):
            self.assertEqual(zonas_dict_real[z_sin_sensor]["origen"], "sin_sensor")
            self.assertFalse(zonas_dict_real[z_sin_sensor]["disponible"])
            self.assertIsNone(zonas_dict_real[z_sin_sensor]["temperatura_actual"])
            self.assertEqual(zonas_dict_real[z_sin_sensor]["estado_telemetria"], "SIN_SENSOR_FISICO")

        # 3. MODO HÍBRIDO (2 físicas reales + 3 simuladas)
        est_hib = mqtt_service.cambiar_modo_operacion_sistema("hibrido")
        self.assertEqual(est_hib["sistema"]["modo_operacion_sistema"], "hibrido")
        zonas_dict_hib = {z["zona"]: z for z in est_hib["zonas"]}

        self.assertEqual(zonas_dict_hib["zona1"]["origen"], "real")
        self.assertEqual(zonas_dict_hib["zona2"]["origen"], "real")
        for z_sim in ("zona3", "zona4", "zona5"):
            self.assertEqual(zonas_dict_hib[z_sim]["origen"], "virtual")
            self.assertTrue(zonas_dict_hib[z_sim]["modo_simulacion"])

        # Restaurar a modo simulación por defecto tras la prueba
        mqtt_service.cambiar_modo_operacion_sistema("simulacion")

    def test_05_deteccion_esp32_desconectado(self):
        """Verifica que cuando el ESP32 no responde por red se marca DESCONECTADO sin inventar datos"""
        esp32_client.actualizar_configuracion(url="http://127.0.0.1:18999/datos")
        esp32_client.timeout = 0.4
        esp32_client._consultar_esp32()

        estado = esp32_client.obtener_estado()
        self.assertFalse(estado["conectado"])
        self.assertEqual(estado["estado_enlace"], "DESCONECTADO")

        zonas_hw = esp32_client.obtener_lecturas_para_zonas()
        self.assertFalse(zonas_hw["zona1"]["disponible"])
        self.assertIsNone(zonas_hw["zona1"]["temperatura_actual"])
        self.assertEqual(zonas_hw["zona1"]["estado_telemetria"], "DESCONECTADO")


if __name__ == "__main__":
    unittest.main(verbosity=2)
