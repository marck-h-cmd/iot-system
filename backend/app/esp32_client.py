import time
import json
import logging
import threading
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from app.config import settings
from app.database import db_manager
from app.ml_model import LinearRegressionPredictor
from app.control_nano import control_nano

logger = logging.getLogger("backend.esp32_client")

class ESP32ClientService:
    """
    Servicio centralizado de adquisición para el Gateway ESP32 (Hardware Real).
    Consulta periódicamente GET http://<ESP32_IP>/datos sin bloquear los endpoints REST.
    Gestiona reconexiones automáticas, validación de contrato JSON, detección de desconexión,
    lecturas antiguas (edad > 15s) y persistencia en MySQL etiquetada como 'real'.
    """

    def __init__(self):
        self.esp32_url: str = settings.ESP32_URL
        self.poll_interval: float = settings.ESP32_POLL_INTERVAL_S
        self.timeout: float = settings.ESP32_TIMEOUT_S
        self.mapping_ds18b20: str = settings.HW_MAPPING_DS18B20
        self.mapping_dht11: str = settings.HW_MAPPING_DHT11

        self._running: bool = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.RLock()

        # Métricas y estado del enlace físico
        self.conectado: bool = False
        self.ultimo_exito_ts: float = 0.0
        self.ultimo_intento_ts: float = 0.0
        self.latencia_ms: Optional[float] = None
        self.total_intentos: int = 0
        self.total_exitosos: int = 0
        self.total_fallos: int = 0
        self.ultimo_error_msg: Optional[str] = None
        self.estado_enlace: str = "DESCONECTADO"  # CONECTADO, DESCONECTADO, TELEMETRIA_ANTIGUA, ERROR_SENSOR

        # Última telemetría física validada
        self.datos_crudos: Dict[str, Any] = {
            "temp": None,
            "tdht": None,
            "hum": None,
            "ventilador": False,
            "error": False,
            "edad": -1
        }
        self.predictor = LinearRegressionPredictor()
        self.predicciones: Dict[str, Optional[float]] = {}
        self._ultimo_ts_insercion: float = 0.0

    def iniciar(self):
        with self._lock:
            if self._running:
                return
            self._running = True
            self._thread = threading.Thread(target=self._loop_adquisicion, name="ESP32-Polling-Worker", daemon=True)
            self._thread.start()
            logger.info(f"🔌 Servicio ESP32 Client iniciado. Sondeando {self.esp32_url} cada {self.poll_interval}s")

    def detener(self):
        with self._lock:
            self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        logger.info("🛑 Servicio ESP32 Client detenido.")

    def actualizar_configuracion(self, url: Optional[str] = None,
                                poll_interval: Optional[float] = None,
                                mapping_ds18b20: Optional[str] = None,
                                mapping_dht11: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            origen_anterior = (self.esp32_url, self.mapping_ds18b20, self.mapping_dht11)
            if url:
                clean_url = url.strip()
                if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
                    clean_url = f"http://{clean_url}"
                if not clean_url.endswith("/datos"):
                    clean_url = clean_url.rstrip("/") + "/datos"
                self.esp32_url = clean_url
            if poll_interval and poll_interval >= 0.5:
                self.poll_interval = float(poll_interval)
            if mapping_ds18b20 and mapping_ds18b20 in settings.ZONAS_METADATOS:
                self.mapping_ds18b20 = mapping_ds18b20
            if mapping_dht11 and mapping_dht11 in settings.ZONAS_METADATOS:
                self.mapping_dht11 = mapping_dht11
            if origen_anterior != (self.esp32_url, self.mapping_ds18b20, self.mapping_dht11):
                self.predictor.reiniciar_historial()
                self.predicciones.clear()

            return self.obtener_estado()

    def _loop_adquisicion(self):
        while self._running:
            try:
                self._consultar_esp32()
            except Exception as e:
                logger.error(f"Error inesperado en loop de adquisición ESP32: {e}")
            time.sleep(self.poll_interval)

    def _consultar_esp32(self):
        ahora = time.time()
        self.ultimo_intento_ts = ahora
        self.total_intentos += 1

        req = urllib.request.Request(
            self.esp32_url,
            headers={"User-Agent": "SmartCooling-FastAPI/2.0", "Accept": "application/json"}
        )

        t_inicio = time.time()
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                t_fin = time.time()
                self.latencia_ms = round((t_fin - t_inicio) * 1000.0, 1)

                if response.status == 200:
                    payload_bytes = response.read()
                    payload_str = payload_bytes.decode("utf-8")
                    datos_json = json.loads(payload_str)

                    self._procesar_datos_exitosos(datos_json)
                else:
                    self._marcar_fallo(f"HTTP {response.status}")
        except urllib.error.HTTPError as e:
            self._marcar_fallo(f"HTTP Error {e.code}: {e.reason}")
        except urllib.error.URLError as e:
            self._marcar_fallo(f"Fallo de conexión ({e.reason})")
        except json.JSONDecodeError as e:
            self._marcar_fallo(f"JSON inválido recibido del ESP32: {e}")
        except TimeoutError:
            self._marcar_fallo("Timeout de red al consultar ESP32")
        except Exception as e:
            self._marcar_fallo(f"Error de red: {str(e)}")

    def _procesar_datos_exitosos(self, d: Dict[str, Any]):
        """Valida rigurosamente los campos del contrato del firmware real"""
        with self._lock:
            self.conectado = True
            ahora = time.time()
            if ahora - self.ultimo_exito_ts > 30:
                self.predictor.reiniciar_historial()
                self.predicciones.clear()
            self.ultimo_exito_ts = ahora
            self.total_exitosos += 1
            self.ultimo_error_msg = None

            # Normalización y validación de tipos
            temp_ds = float(d["temp"]) if d.get("temp") is not None and float(d["temp"]) > -900.0 else None
            temp_dht = float(d["tdht"]) if d.get("tdht") is not None and float(d["tdht"]) > -900.0 else None
            hum = float(d["hum"]) if d.get("hum") is not None and float(d["hum"]) > -900.0 else None
            fan = bool(d.get("ventilador", False))
            error_ds = bool(d.get("error", False))
            edad = int(d.get("edad", -1))
            angulo = d.get("angulo")
            if type(angulo) is not int or not 0 <= angulo <= 180:
                angulo = None
            direccion = d.get("direccion")
            if direccion not in ("ds18b20", "dht11", "reposo"):
                direccion = None
            modo_hardware = str(d.get("modo", "autonomo"))
            trama_vigente = 0 <= edad <= 15

            # Determinar estado cualitativo del enlace
            if not trama_vigente:
                self.estado_enlace = "TELEMETRIA_ANTIGUA"
            elif error_ds or temp_ds is None or temp_dht is None:
                self.estado_enlace = "ERROR_SENSOR"
            else:
                self.estado_enlace = "CONECTADO"

            self.datos_crudos = {
                "temp": temp_ds,
                "tdht": temp_dht,
                "hum": hum,
                "ventilador": fan,
                "error": error_ds,
                "edad": edad,
                "direccion": direccion,
                "modo_hardware": modo_hardware,
                "timestamp_lectura": self.ultimo_exito_ts
            }
            if angulo is not None:
                self.datos_crudos["angulo"] = angulo

            if not trama_vigente:
                self.predictor.reiniciar_historial()
                self.predicciones.clear()
            elif ahora - self._ultimo_ts_insercion >= 3.0:
                self._ultimo_ts_insercion = ahora
                mediciones = self._preparar_mediciones(
                    None if error_ds else temp_ds, temp_dht, fan, angulo, ahora - edad
                )
            else:
                mediciones = []

        if trama_vigente:
            for medicion in mediciones:
                db_manager.insertar_registro_termico(medicion)

    def _marcar_fallo(self, mensaje_error: str):
        with self._lock:
            self.conectado = False
            self.total_fallos += 1
            self.ultimo_error_msg = mensaje_error
            self.estado_enlace = "DESCONECTADO"
            logger.debug(f"⚠️ [ESP32 Client] {mensaje_error} ({self.esp32_url})")

    def _preparar_mediciones(self, temp_ds: Optional[float], temp_dht: Optional[float],
                            fan: bool, angulo: Optional[int], timestamp: float):
        mediciones = []
        for zona, temperatura in ((self.mapping_ds18b20, temp_ds), (self.mapping_dht11, temp_dht)):
            if temperatura is None:
                self.predicciones.pop(zona, None)
                self.predictor.historial_zonas[zona].clear()
                continue
            prediccion = self.predictor.predecir_futuro(
                zona, temperatura,
                horizonte_segundos=settings.VENTANA_PREDICCION_SEGUNDOS,
                timestamp=timestamp,
                permitir_estimacion_inicial=False,
            )
            self.predicciones[zona] = prediccion
            mediciones.append({
                "msg_id": int(timestamp),
                "zona": zona,
                "temperatura_actual": round(temperatura, 2),
                "temperatura_predicha": prediccion,
                "estado_ventilador": int(fan),
                "angulo_servo": angulo if angulo is not None else 90,
                "origen": "real",
                "timestamp_origen": timestamp,
            })
        return mediciones

    def obtener_estado(self) -> Dict[str, Any]:
        with self._lock:
            tasa_exito = round((self.total_exitosos / self.total_intentos * 100.0), 1) if self.total_intentos > 0 else 0.0
            return {
                "esp32_url": self.esp32_url,
                "poll_interval_s": self.poll_interval,
                "timeout_s": self.timeout,
                "conectado": self.conectado,
                "estado_enlace": self.estado_enlace,
                "latencia_ms": self.latencia_ms,
                "edad_trama_s": self.datos_crudos.get("edad", -1),
                "total_intentos": self.total_intentos,
                "total_exitosos": self.total_exitosos,
                "total_fallos": self.total_fallos,
                "tasa_exito_pct": tasa_exito,
                "ultimo_exito_ts": self.ultimo_exito_ts,
                "ultimo_error": self.ultimo_error_msg,
                "mapeo_sensores": {
                    "ds18b20": self.mapping_ds18b20,
                    "dht11": self.mapping_dht11
                },
                "datos_actuales": dict(self.datos_crudos),
                "control_usb": control_nano.estado(),
            }

    def obtener_lecturas_para_zonas(self) -> Dict[str, Dict[str, Any]]:
        """
        Retorna las lecturas físicas estructuradas por zona para ser integradas
        en el estado unificado de telemetría de FastAPI.
        Nunca reemplaza lecturas físicas ausentes o antiguas con datos sintéticos.
        """
        with self._lock:
            lecturas: Dict[str, Dict[str, Any]] = {}
            ahora_str = time.strftime("%Y-%m-%d %H:%M:%S")
            edad = self.datos_crudos.get("edad", -1)
            fan = bool(self.datos_crudos.get("ventilador", False))
            angulo = int(self.datos_crudos.get("angulo", 90))
            hum_dht = self.datos_crudos.get("hum")
            t_ds = self.datos_crudos.get("temp")
            t_dht = self.datos_crudos.get("tdht")
            err_ds = bool(self.datos_crudos.get("error", False))

            # Caso 1: ESP32 desconectado
            if not self.conectado or self.estado_enlace == "DESCONECTADO":
                for z_map, sensor_nom, ultima_val in [
                    (self.mapping_dht11, "DHT11 Físico (ESP32 Desconectado)", t_dht),
                    (self.mapping_ds18b20, "DS18B20 Físico (ESP32 Desconectado)", t_ds)
                ]:
                    meta = settings.ZONAS_METADATOS.get(z_map, {})
                    lecturas[z_map] = {
                        "zona": z_map,
                        "nombre": meta.get("nombre", z_map.upper()),
                        "etiqueta": meta.get("etiqueta", z_map),
                        "sensor": sensor_nom,
                        "angulo_servo_zona": meta.get("angulo", 90),
                        "temperatura_actual": None,
                        "temperatura_predicha": None,
                        "ultima_temperatura_valida": ultima_val,
                        "humedad": None,
                        "origen": "real",
                        "modo_simulacion": False,
                        "estado_ventilador": 0,
                        "angulo_servo": 90,
                        "enfriando": False,
                        "disponible": False,
                        "estado_telemetria": "DESCONECTADO",
                        "nivel_termico": "sin_senal",
                        "timestamp": ahora_str,
                        "edad_trama_s": -1
                    }
                return lecturas

            # Caso 2: Telemetría antigua (edad > 15s o < 0)
            es_antigua = (edad > 15 or edad < 0)

            # Zona DHT11
            meta_dht = settings.ZONAS_METADATOS.get(self.mapping_dht11, {})
            if t_dht is not None and not es_antigua:
                lecturas[self.mapping_dht11] = {
                    "zona": self.mapping_dht11,
                    "nombre": meta_dht.get("nombre", "PC 1"),
                    "etiqueta": meta_dht.get("etiqueta", "Zona Ambiental / DHT11"),
                    "sensor": "DHT11 Físico (Temp + Humedad)",
                    "angulo_servo_zona": meta_dht.get("angulo", 20),
                    "temperatura_actual": t_dht,
                    "temperatura_predicha": self.predicciones.get(self.mapping_dht11),
                    "ultima_temperatura_valida": t_dht,
                    "humedad": hum_dht,
                    "origen": "real",
                    "modo_simulacion": False,
                    "estado_ventilador": 1 if fan else 0,
                    "angulo_servo": angulo,
                    "enfriando": fan,
                    "disponible": True,
                    "estado_telemetria": "ACTUAL",
                    "nivel_termico": "critico" if t_dht >= 35.0 else "advertencia" if t_dht >= 30.0 else "normal",
                    "timestamp": ahora_str,
                    "edad_trama_s": edad
                }
            else:
                lecturas[self.mapping_dht11] = {
                    "zona": self.mapping_dht11,
                    "nombre": meta_dht.get("nombre", "PC 1"),
                    "etiqueta": meta_dht.get("etiqueta", "Zona Ambiental / DHT11"),
                    "sensor": "DHT11 Físico (Lectura Antigua)" if es_antigua else "DHT11 Físico (Sin Lectura)",
                    "angulo_servo_zona": meta_dht.get("angulo", 20),
                    "temperatura_actual": None,
                    "temperatura_predicha": None,
                    "ultima_temperatura_valida": t_dht,
                    "humedad": hum_dht if not es_antigua else None,
                    "origen": "real",
                    "modo_simulacion": False,
                    "estado_ventilador": 1 if fan else 0,
                    "angulo_servo": angulo,
                    "enfriando": fan,
                    "disponible": False,
                    "estado_telemetria": "TELEMETRIA_ANTIGUA" if es_antigua else "ERROR_SENSOR",
                    "nivel_termico": "sin_senal",
                    "timestamp": ahora_str,
                    "edad_trama_s": edad
                }

            # Zona DS18B20
            meta_ds = settings.ZONAS_METADATOS.get(self.mapping_ds18b20, {})
            if t_ds is not None and not err_ds and not es_antigua:
                lecturas[self.mapping_ds18b20] = {
                    "zona": self.mapping_ds18b20,
                    "nombre": meta_ds.get("nombre", "PC 2"),
                    "etiqueta": meta_ds.get("etiqueta", "Sonda Térmica / DS18B20"),
                    "sensor": "DS18B20 1-Wire Físico",
                    "angulo_servo_zona": meta_ds.get("angulo", 55),
                    "temperatura_actual": t_ds,
                    "temperatura_predicha": self.predicciones.get(self.mapping_ds18b20),
                    "ultima_temperatura_valida": t_ds,
                    "humedad": None,
                    "origen": "real",
                    "modo_simulacion": False,
                    "estado_ventilador": 1 if fan else 0,
                    "angulo_servo": angulo,
                    "enfriando": fan,
                    "disponible": True,
                    "estado_telemetria": "ACTUAL",
                    "nivel_termico": "critico" if t_ds >= 35.0 else "advertencia" if t_ds >= 30.0 else "normal",
                    "timestamp": ahora_str,
                    "edad_trama_s": edad
                }
            else:
                motivo = "ERROR_SENSOR" if err_ds else ("TELEMETRIA_ANTIGUA" if es_antigua else "SIN_LECTURA")
                lecturas[self.mapping_ds18b20] = {
                    "zona": self.mapping_ds18b20,
                    "nombre": meta_ds.get("nombre", "PC 2"),
                    "etiqueta": meta_ds.get("etiqueta", "Sonda Térmica / DS18B20"),
                    "sensor": f"DS18B20 1-Wire ({motivo})",
                    "angulo_servo_zona": meta_ds.get("angulo", 55),
                    "temperatura_actual": None,
                    "temperatura_predicha": None,
                    "ultima_temperatura_valida": t_ds,
                    "humedad": None,
                    "origen": "real",
                    "modo_simulacion": False,
                    "estado_ventilador": 1 if fan else 0,
                    "angulo_servo": angulo,
                    "enfriando": fan,
                    "disponible": False,
                    "estado_telemetria": motivo,
                    "nivel_termico": "sin_senal",
                    "timestamp": ahora_str,
                    "edad_trama_s": edad
                }

            return lecturas

esp32_client = ESP32ClientService()
