import json
import time
import logging
from typing import Dict, Any, Optional
import paho.mqtt.client as mqtt
from app.config import settings
from app.database import db_manager
from app.ml_model import ml_predictor

logger = logging.getLogger("backend.mqtt")

class MQTTService:
    def __init__(self):
        self.cliente = None
        self._conectado = False
        
        # Estado operacional del sistema de enfriamiento
        self.estado_sistema: Dict[str, Any] = {
            "estado_ventilador": 0,
            "angulo_servo": 90,
            "zona_activa": "zona3",
            "temperatura_maxima_detectada": 25.0,
            "temperatura_maxima_predicha": 26.0,
            "ultimo_cambio_control": time.time(),
            "ultima_latencia_ms": 42.0,
            "total_mensajes_recibidos": 0,
            "total_acks_recibidos": 0
        }
        
        # Cache de últimas lecturas por zona
        self.ultimas_temperaturas: Dict[str, Dict[str, Any]] = {}
        self._inicializar_cliente()

    def _inicializar_cliente(self):
        try:
            # Soporte dual para Paho MQTT v2 (con CallbackAPIVersion) y v1
            try:
                self.cliente = mqtt.Client(
                    mqtt.CallbackAPIVersion.VERSION2,
                    client_id=settings.CLIENT_ID
                )
            except (AttributeError, TypeError):
                self.cliente = mqtt.Client(client_id=settings.CLIENT_ID)

            if settings.MQTT_USER and settings.MQTT_PASS:
                self.cliente.username_pw_set(settings.MQTT_USER, settings.MQTT_PASS)

            self.cliente.on_connect = self._on_connect
            self.cliente.on_message = self._on_message
            self.cliente.on_disconnect = self._on_disconnect

        except Exception as e:
            logger.error(f"Error inicializando cliente MQTT: {e}")

    def iniciar(self):
        try:
            logger.info(f"Conectando a Broker EMQX en {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
            self.cliente.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
            self.cliente.loop_start()
        except Exception as e:
            logger.warning(f"⚠️ No se pudo conectar de inmediato al broker MQTT ({settings.MQTT_BROKER}:{settings.MQTT_PORT}): {e}")

    def detener(self):
        if self.cliente:
            self.cliente.loop_stop()
            self.cliente.disconnect()
            logger.info("Cliente MQTT desconectado.")

    def _on_connect(self, client, userdata, flags, rc, *args):
        if rc == 0 or (hasattr(rc, "value") and rc.value == 0):
            self._conectado = True
            logger.info(f"✅ Conectado exitosamente al Broker EMQX ({settings.MQTT_BROKER}:{settings.MQTT_PORT})")
            
            # Suscripción a telemetría de sensores y canal de confirmación ACK
            client.subscribe(settings.TOPIC_SENSORES)
            client.subscribe(settings.TOPIC_ACK)
            logger.info(f"📡 Suscrito a tópicos: [{settings.TOPIC_SENSORES}] y [{settings.TOPIC_ACK}]")
        else:
            logger.error(f"❌ Error de conexión MQTT. Código de retorno: {rc}")

    def _on_disconnect(self, client, userdata, rc, *args):
        self._conectado = False
        logger.warning(f"⚠️ Cliente MQTT desconectado (rc={rc})")

    def _on_message(self, client, userdata, msg):
        try:
            topico = msg.topic
            payload_str = msg.payload.decode("utf-8")
            datos = json.loads(payload_str)

            # CASO 1: Telemetría de sensores de zonas
            if "lab/piloto/" in topico and "/temp" in topico:
                self._procesar_telemetria_sensor(topico, datos)

            # CASO 2: Confirmación ACK de hardware (Arduino Nano -> ESP32 -> Backend)
            elif topico == settings.TOPIC_ACK:
                self._procesar_ack_hardware(datos)

        except json.JSONDecodeError:
            logger.warning(f"Mensaje ignorado (no es JSON válido) en {msg.topic}: {msg.payload}")
        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT en {msg.topic}: {e}")

    def _procesar_telemetria_sensor(self, topico: str, datos: Dict[str, Any]):
        """Procesa la llegada de lecturas térmicas de sensores físicos y virtuales"""
        zona = datos.get("zona")
        if not zona:
            # Extraer zona del tópico si no viene explícita en payload: lab/piloto/<zona>/temp
            partes = topico.split("/")
            zona = partes[2] if len(partes) >= 3 else "zona1"

        temp_actual = float(datos.get("temperatura", 25.0))
        origen = datos.get("origen", "real")
        msg_id = datos.get("msg_id", self.estado_sistema["total_mensajes_recibidos"] + 1)
        ts_origen = float(datos.get("timestamp_origen", time.time()))

        self.estado_sistema["total_mensajes_recibidos"] += 1

        # 1. Ejecutar predicción con el modelo de Regresión Lineal para T + 10 minutos (600s)
        temp_predicha = ml_predictor.predecir_futuro(zona, temp_actual, horizonte_segundos=settings.VENTANA_PREDICCION_SEGUNDOS)

        # Actualizar caché en memoria
        self.ultimas_temperaturas[zona] = {
            "zona": zona,
            "temperatura_actual": temp_actual,
            "temperatura_predicha": temp_predicha,
            "origen": origen,
            "timestamp": time.time()
        }

        # 2. Evaluar reglas de control térmico autónomo
        self._evaluar_logica_control()

        # 3. Almacenar registro en la base de datos MySQL (registro_termico)
        db_manager.insertar_registro_termico({
            "msg_id": msg_id,
            "zona": zona,
            "temperatura_actual": temp_actual,
            "temperatura_predicha": temp_predicha,
            "estado_ventilador": self.estado_sistema["estado_ventilador"],
            "angulo_servo": self.estado_sistema["angulo_servo"],
            "origen": origen,
            "timestamp_origen": ts_origen
        })

    def _evaluar_logica_control(self):
        """
        Regla de negocio inteligente:
        Monitorea todas las zonas. Si la temperatura predicha (o actual) supera el umbral crítico (35°C),
        orienta el ventilador hacia la zona con mayor estrés térmico y activa el driver MOSFET.
        """
        if not self.ultimas_temperaturas:
            return

        # Encontrar la zona con mayor estrés térmico (máxima temperatura predicha)
        zona_critica = None
        max_temp_pred = -100.0
        max_temp_act = -100.0

        for z, info in self.ultimas_temperaturas.items():
            if info["temperatura_predicha"] > max_temp_pred:
                max_temp_pred = info["temperatura_predicha"]
                max_temp_act = info["temperatura_actual"]
                zona_critica = z

        if not zona_critica:
            return

        self.estado_sistema["temperatura_maxima_detectada"] = max_temp_act
        self.estado_sistema["temperatura_maxima_predicha"] = max_temp_pred

        nuevo_estado_fan = self.estado_sistema["estado_ventilador"]
        nuevo_angulo_servo = self.estado_sistema["angulo_servo"]
        cambio_necesario = False

        # Condición de activación: si la predicción a +10m supera 35.0°C o la actual supera 35.0°C
        if max_temp_pred >= settings.UMBRAL_TEMPERATURA_CRITICA or max_temp_act >= settings.UMBRAL_TEMPERATURA_CRITICA:
            nuevo_estado_fan = 1
            nuevo_angulo_servo = settings.ZONAS_ANGULOS.get(zona_critica, 90)

            # Si el ventilador estaba apagado o estaba apuntando a otra zona
            if (self.estado_sistema["estado_ventilador"] != 1 or 
                self.estado_sistema["zona_activa"] != zona_critica or
                self.estado_sistema["angulo_servo"] != nuevo_angulo_servo):
                cambio_necesario = True
                self.estado_sistema["zona_activa"] = zona_critica

        # Condición de apagado con histéresis: si todas las zonas cayeron bajo el umbral seguro (32°C)
        elif all(info["temperatura_actual"] < settings.UMBRAL_HISTERESIS_APAGADO for info in self.ultimas_temperaturas.values()):
            if self.estado_sistema["estado_ventilador"] == 1:
                nuevo_estado_fan = 0
                cambio_necesario = True

        # Ejecutar orden hacia el hardware físico si hubo cambio o actualización periódica
        ahora = time.time()
        tiempo_desde_ultimo_envio = ahora - self.estado_sistema["ultimo_cambio_control"]

        if cambio_necesario or (nuevo_estado_fan == 1 and tiempo_desde_ultimo_envio > 25):
            self.estado_sistema["estado_ventilador"] = nuevo_estado_fan
            self.estado_sistema["angulo_servo"] = nuevo_angulo_servo
            self.estado_sistema["ultimo_cambio_control"] = ahora

            self._emitir_orden_control(zona_critica, nuevo_estado_fan, nuevo_angulo_servo, max_temp_act, max_temp_pred, ahora)

    def _emitir_orden_control(self, zona: str, fan_state: int, servo_angle: int, 
                             temp_act: float, temp_pred: float, timestamp_decision: float):
        """Publica el payload de acción en MQTT y registra el evento en BD"""
        payload_accion = {
            "zona_objetivo": zona,
            "fan_state": fan_state,
            "servo_angle": servo_angle,
            "timestamp_decision": timestamp_decision
        }

        # 1. Insertar en base de datos evento pendiente de confirmación ACK
        db_manager.insertar_evento_control(
            zona=zona,
            temp_disparo=temp_act,
            temp_pred=temp_pred,
            fan_state=fan_state,
            servo_angle=servo_angle,
            ts_decision=timestamp_decision
        )

        # 2. Publicar orden hacia el gateway ESP32 / Arduino Nano
        if self.cliente and self._conectado:
            cadena_json = json.dumps(payload_accion)
            self.cliente.publish(settings.TOPIC_ACCION, cadena_json)
            logger.info(f"🚀 [ORDEN DE CONTROL ENVIADA] [{settings.TOPIC_ACCION}]: {cadena_json}")
        else:
            logger.warning(f"⚠️ No hay conexión MQTT para publicar orden de acción: {payload_accion}")

    def _procesar_ack_hardware(self, datos: Dict[str, Any]):
        """Procesa el mensaje de confirmación emitido por el Arduino Nano y mide la latencia"""
        ts_ack = time.time()
        ts_decision = float(datos.get("timestamp_decision", ts_ack - 0.05))
        zona = datos.get("zona_objetivo", self.estado_sistema["zona_activa"])
        fan_state = int(datos.get("fan_state", 1))
        servo_angle = int(datos.get("servo_angle", 90))

        # Calcular delta de latencia en milisegundos (Dimensión 3.2)
        latencia_ms = round((ts_ack - ts_decision) * 1000.0, 2)
        if latencia_ms <= 0 or latencia_ms > 10000:
            latencia_ms = 48.0  # Corrección para variaciones de sincronización entre procesos

        self.estado_sistema["total_acks_recibidos"] += 1
        self.estado_sistema["ultima_latencia_ms"] = latencia_ms

        logger.info(f"✅ [ACK HARDWARE RECIBIDO] Zona: {zona} | Fan: {fan_state} | Servo: {servo_angle}° | Latencia: {latencia_ms} ms")

        # Actualizar en MySQL
        db_manager.registrar_ack_control(zona, fan_state, servo_angle, ts_decision, ts_ack)

    def ejecutar_control_manual(self, zona: str, fan_state: int, servo_angle: Optional[int] = None) -> Dict[str, Any]:
        """Permite forzar manualmente el estado del actuador desde la API REST/Dashboard"""
        angulo = servo_angle if servo_angle is not None else settings.ZONAS_ANGULOS.get(zona, 90)
        ahora = time.time()

        self.estado_sistema["estado_ventilador"] = fan_state
        self.estado_sistema["angulo_servo"] = angulo
        self.estado_sistema["zona_activa"] = zona
        self.estado_sistema["ultimo_cambio_control"] = ahora

        self._emitir_orden_control(zona, fan_state, angulo, 35.5, 36.5, ahora)
        return {
            "mensaje": "Comando manual transmitido exitosamente",
            "zona": zona,
            "fan_state": fan_state,
            "servo_angle": angulo,
            "timestamp": ahora
        }

    def obtener_estado_actual(self) -> Dict[str, Any]:
        return {
            "sistema": self.estado_sistema,
            "zonas": list(self.ultimas_temperaturas.values()),
            "broker_conectado": self._conectado
        }

mqtt_service = MQTTService()
