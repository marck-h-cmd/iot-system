import json
import time
import uuid
import logging
import threading
from typing import Dict, Any, Optional, List
import paho.mqtt.client as mqtt
from app.config import settings
from app.database import db_manager
from app.ml_model import ml_predictor

logger = logging.getLogger("backend.mqtt")

ESCENARIOS_CATALOGO = [
    {
        "id": "normal",
        "nombre": "Operación Normal",
        "descripcion": "Carga térmica moderada de laboratorio (28°C - 33.5°C) con intervenciones ocasionales."
    },
    {
        "id": "sobrecalentamiento",
        "nombre": "Sobrecalentamiento Focalizado",
        "descripcion": "Incremento térmico progresivo en PC 4 y PC 2 por encima de 35.5°C que dispara alertas y enfriamiento."
    },
    {
        "id": "carga_extrema",
        "nombre": "Carga Térmica Extrema Multi-Zona",
        "descripcion": "Varias computadoras superan el umbral crítico simultáneamente; el sistema selecciona la zona prioritaria."
    },
    {
        "id": "demostracion",
        "nombre": "Secuencia de Exposición Guiada",
        "descripcion": "Ciclo reproducible automático que muestra calentamiento, alerta, orientación del servo y enfriamiento."
    },
    {
        "id": "fallo_sensor",
        "nombre": "Fallo de Sensor (PC 2 Sin Señal)",
        "descripcion": "PC 2 deja de enviar telemetría; las interfaces muestran 'Sin Señal' sin inventar temperaturas."
    }
]

class MQTTService:
    def __init__(self):
        self.cliente = None
        self._conectado = False
        self._lock = threading.Lock()

        # Estado operacional unificado del sistema de enfriamiento (Fuente única de verdad)
        self.estado_sistema: Dict[str, Any] = {
            "modo_operacion_sistema": settings.OPERATION_MODE,  # "simulacion" o "hardware_real"
            "modo_control": "autonomo",                         # "autonomo" o "manual"
            "escenario_simulacion": "demostracion",
            "zona_fallo_sensor": None,
            "estado_ventilador": 0,
            "angulo_servo": 90,
            "zona_activa": "zona3",
            "temperatura_maxima_detectada": 31.0,
            "temperatura_maxima_predicha": 31.8,
            "temperatura_promedio": 30.8,
            "ultimo_cambio_control": time.time(),
            "ultima_actualizacion_telemetria": time.time(),
            "ultima_latencia_ms": None,
            "ultimo_comando_id": None,
            "ultimo_estado_comando": "EN_ESPERA",
            "total_mensajes_recibidos": 0,
            "total_acks_recibidos": 0
        }

        # Caché de últimas lecturas por zona con metadatos completos
        self.ultimas_temperaturas: Dict[str, Dict[str, Any]] = {}
        self._inicializar_zonas_base()
        self._inicializar_cliente()

    def _inicializar_zonas_base(self):
        ahora = time.time()
        temps_base = {"zona1": 29.8, "zona2": 30.4, "zona3": 31.1, "zona4": 33.8, "zona5": 29.5}
        for z_id, meta in settings.ZONAS_METADATOS.items():
            t_b = temps_base.get(z_id, 30.5)
            self.ultimas_temperaturas[z_id] = {
                "zona": z_id,
                "nombre": meta["nombre"],
                "etiqueta": meta["etiqueta"],
                "sensor": meta["sensor_modelo"],
                "angulo_servo_zona": meta["angulo"],
                "temperatura_actual": t_b,
                "temperatura_predicha": round(t_b + 0.6, 2),
                "origen": "virtual",
                "modo_simulacion": True,
                "estado_ventilador": 0,
                "angulo_servo": 90,
                "enfriando": False,
                "disponible": True,
                "nivel_termico": "normal",
                "timestamp_origen": ahora,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }

    def _inicializar_cliente(self):
        try:
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
            logger.info(f"✅ Conectado a Broker EMQX ({settings.MQTT_BROKER}:{settings.MQTT_PORT})")
            client.subscribe(settings.TOPIC_SENSORES)
            client.subscribe(settings.TOPIC_ACK)
            client.subscribe(settings.TOPIC_SIMULADOR_ESTADO)
            logger.info(f"📡 Suscrito a: [{settings.TOPIC_SENSORES}], [{settings.TOPIC_ACK}], [{settings.TOPIC_SIMULADOR_ESTADO}]")
        else:
            logger.error(f"❌ Error de conexión MQTT rc={rc}")

    def _on_disconnect(self, client, userdata, rc, *args):
        self._conectado = False
        logger.warning(f"⚠️ Cliente MQTT desconectado (rc={rc})")

    def _on_message(self, client, userdata, msg):
        try:
            topico = msg.topic
            payload_str = msg.payload.decode("utf-8")
            datos = json.loads(payload_str)

            if "lab/piloto/" in topico and "/temp" in topico:
                self._procesar_telemetria_sensor(topico, datos)
            elif topico == settings.TOPIC_ACK:
                self._procesar_ack_hardware(datos)
            elif topico == settings.TOPIC_SIMULADOR_ESTADO:
                self._procesar_estado_simulador(datos)

        except json.JSONDecodeError:
            logger.warning(f"Mensaje no JSON ignorado en {msg.topic}")
        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT en {msg.topic}: {e}")

    def _procesar_estado_simulador(self, datos: Dict[str, Any]):
        with self._lock:
            esc = datos.get("escenario_activo")
            if esc:
                self.estado_sistema["escenario_simulacion"] = esc
            self.estado_sistema["zona_fallo_sensor"] = datos.get("zona_fallo_sensor")
            if esc == "fallo_sensor" and datos.get("zona_fallo_sensor"):
                z_fallo = datos["zona_fallo_sensor"]
                if z_fallo in self.ultimas_temperaturas:
                    self.ultimas_temperaturas[z_fallo]["disponible"] = False
                    self.ultimas_temperaturas[z_fallo]["nivel_termico"] = "sin_senal"
                    self.ultimas_temperaturas[z_fallo]["temperatura_actual"] = None
                    self.ultimas_temperaturas[z_fallo]["temperatura_predicha"] = None

    @staticmethod
    def _clasificar_nivel_termico(temp: Optional[float]) -> str:
        if temp is None:
            return "sin_senal"
        if temp >= settings.UMBRAL_TEMPERATURA_CRITICA:
            return "critico"
        if temp >= settings.UMBRAL_TEMPERATURA_ADVERTENCIA:
            return "advertencia"
        return "normal"

    def _verificar_disponibilidad_sensores(self):
        """Detecta si alguna zona dejó de transmitir por más de 14 segundos (ej. escenario fallo_sensor)"""
        ahora = time.time()
        esc = self.estado_sistema["escenario_simulacion"]
        z_fallo = self.estado_sistema.get("zona_fallo_sensor")
        for z_id, info in self.ultimas_temperaturas.items():
            ts_orig = info.get("timestamp_origen") or 0.0
            if (esc == "fallo_sensor" and z_id == (z_fallo or "zona2")) or (ahora - ts_orig > 16.0 and self.estado_sistema["total_mensajes_recibidos"] >= 5):
                info["disponible"] = False
                info["nivel_termico"] = "sin_senal"
                info["temperatura_actual"] = None
                info["temperatura_predicha"] = None

    def _procesar_telemetria_sensor(self, topico: str, datos: Dict[str, Any]):
        """Procesa la llegada de lecturas térmicas y ejecuta predicción + lazo de control"""
        zona = datos.get("zona")
        if not zona:
            partes = topico.split("/")
            zona = partes[2] if len(partes) >= 3 else "zona1"

        if datos.get("temperatura") is None:
            return

        temp_actual = float(datos["temperatura"])
        origen = datos.get("origen", "virtual")
        modo_sim = bool(datos.get("modo_simulacion", True if origen == "virtual" else False))
        meta = settings.ZONAS_METADATOS.get(zona, {"nombre": zona.upper(), "etiqueta": zona, "sensor_modelo": "Sensor", "angulo": 90})
        sensor_label = datos.get("sensor") or meta["sensor_modelo"]
        ahora = time.time()
        ts_origen = float(datos.get("timestamp_origen", ahora))

        with self._lock:
            self.estado_sistema["total_mensajes_recibidos"] += 1
            self.estado_sistema["ultima_actualizacion_telemetria"] = ahora
            if datos.get("escenario"):
                self.estado_sistema["escenario_simulacion"] = datos["escenario"]

            msg_id = datos.get("msg_id", self.estado_sistema["total_mensajes_recibidos"])

            # 1. Predicción ML con Regresión Lineal para T + 10 minutos
            temp_predicha = ml_predictor.predecir_futuro(
                zona, temp_actual,
                horizonte_segundos=settings.VENTANA_PREDICCION_SEGUNDOS,
                timestamp=ts_origen
            )

            fan_on = self.estado_sistema["estado_ventilador"] == 1
            angulo_sys = self.estado_sistema["angulo_servo"]
            angulo_zona = meta["angulo"]
            esta_enfriando = fan_on and (abs(angulo_sys - angulo_zona) <= 22)

            self.ultimas_temperaturas[zona] = {
                "zona": zona,
                "nombre": meta["nombre"],
                "etiqueta": meta["etiqueta"],
                "sensor": sensor_label,
                "angulo_servo_zona": angulo_zona,
                "temperatura_actual": temp_actual,
                "temperatura_predicha": temp_predicha,
                "origen": origen,
                "modo_simulacion": modo_sim,
                "estado_ventilador": self.estado_sistema["estado_ventilador"],
                "angulo_servo": angulo_sys,
                "enfriando": esta_enfriando,
                "disponible": True,
                "nivel_termico": self._clasificar_nivel_termico(temp_actual),
                "timestamp_origen": ts_origen,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            self._verificar_disponibilidad_sensores()
            self._actualizar_metricas_agregadas()

            # 2. Evaluar reglas de control autónomo SOLO si el sistema está en modo "autonomo"
            if self.estado_sistema["modo_control"] == "autonomo":
                self._evaluar_logica_control()

            # Refrescar bandera de enfriamiento en todas las zonas tras posible decisión
            for z_k, z_val in self.ultimas_temperaturas.items():
                z_val["estado_ventilador"] = self.estado_sistema["estado_ventilador"]
                z_val["angulo_servo"] = self.estado_sistema["angulo_servo"]
                z_val["enfriando"] = (self.estado_sistema["estado_ventilador"] == 1) and (
                    abs(self.estado_sistema["angulo_servo"] - z_val["angulo_servo_zona"]) <= 22
                )

        # 3. Almacenar registro en MySQL
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

    def _actualizar_metricas_agregadas(self):
        zonas_validas = [
            z for z in self.ultimas_temperaturas.values()
            if z.get("disponible") and z.get("temperatura_actual") is not None
        ]
        if not zonas_validas:
            return
        temps_act = [float(z["temperatura_actual"]) for z in zonas_validas]
        temps_pred = [float(z["temperatura_predicha"] or z["temperatura_actual"]) for z in zonas_validas]
        self.estado_sistema["temperatura_maxima_detectada"] = round(max(temps_act), 2)
        self.estado_sistema["temperatura_maxima_predicha"] = round(max(temps_pred), 2)
        self.estado_sistema["temperatura_promedio"] = round(sum(temps_act) / len(temps_act), 2)

    def _evaluar_logica_control(self):
        """
        Algoritmo de control autónomo:
        Monitorea las zonas con señal activa. Si la temperatura predicha o actual supera 35.0°C,
        orienta el servomotor hacia la zona más crítica y enciende el ventilador.
        Cuando todas las zonas descienden bajo 32.0°C, apaga el ventilador por histéresis.
        """
        zonas_disponibles = {
            k: v for k, v in self.ultimas_temperaturas.items()
            if v.get("disponible") and v.get("temperatura_actual") is not None
        }
        if not zonas_disponibles:
            return

        # Seleccionar zona de mayor estrés térmico (priorizando mayor temperatura actual/predicha)
        zona_critica = None
        max_score = -100.0
        max_temp_pred = -100.0
        max_temp_act = -100.0

        for z, info in zonas_disponibles.items():
            t_act = float(info["temperatura_actual"])
            t_pred = float(info.get("temperatura_predicha") or t_act)
            score = max(t_act, t_pred)
            if score > max_score:
                max_score = score
                max_temp_act = t_act
                max_temp_pred = t_pred
                zona_critica = z

        if not zona_critica:
            return

        nuevo_estado_fan = self.estado_sistema["estado_ventilador"]
        nuevo_angulo_servo = self.estado_sistema["angulo_servo"]
        cambio_necesario = False

        if max_temp_pred >= settings.UMBRAL_TEMPERATURA_CRITICA or max_temp_act >= settings.UMBRAL_TEMPERATURA_CRITICA:
            nuevo_estado_fan = 1
            nuevo_angulo_servo = settings.ZONAS_ANGULOS.get(zona_critica, 90)

            if (self.estado_sistema["estado_ventilador"] != 1 or
                self.estado_sistema["zona_activa"] != zona_critica or
                self.estado_sistema["angulo_servo"] != nuevo_angulo_servo):
                cambio_necesario = True
                self.estado_sistema["zona_activa"] = zona_critica

        elif all(float(info["temperatura_actual"]) < settings.UMBRAL_HISTERESIS_APAGADO for info in zonas_disponibles.values()):
            if self.estado_sistema["estado_ventilador"] == 1:
                nuevo_estado_fan = 0
                cambio_necesario = True

        ahora = time.time()
        tiempo_desde_ultimo_envio = ahora - self.estado_sistema["ultimo_cambio_control"]

        if cambio_necesario or (nuevo_estado_fan == 1 and tiempo_desde_ultimo_envio > 30):
            self.estado_sistema["estado_ventilador"] = nuevo_estado_fan
            self.estado_sistema["angulo_servo"] = nuevo_angulo_servo
            self.estado_sistema["ultimo_cambio_control"] = ahora

            self._emitir_orden_control(
                zona=zona_critica,
                fan_state=nuevo_estado_fan,
                servo_angle=nuevo_angulo_servo,
                temp_act=max_temp_act,
                temp_pred=max_temp_pred,
                timestamp_decision=ahora,
                modo="autonomo"
            )

    def _emitir_orden_control(self, zona: str, fan_state: int, servo_angle: int,
                              temp_act: float, temp_pred: float, timestamp_decision: float,
                              modo: str = "autonomo") -> str:
        """Publica el comando con identificador único `comando_id` en MQTT y lo registra en MySQL"""
        comando_id = f"cmd_{int(timestamp_decision * 1000)}_{uuid.uuid4().hex[:6]}"
        self.estado_sistema["ultimo_comando_id"] = comando_id
        self.estado_sistema["ultimo_estado_comando"] = "PENDIENTE"

        payload_accion = {
            "comando_id": comando_id,
            "modo": modo,
            "zona_objetivo": zona,
            "fan_state": fan_state,
            "servo_angle": servo_angle,
            "timestamp_decision": timestamp_decision
        }

        db_manager.insertar_evento_control(
            zona=zona,
            temp_disparo=round(float(temp_act), 2),
            temp_pred=round(float(temp_pred), 2),
            fan_state=fan_state,
            servo_angle=servo_angle,
            ts_decision=timestamp_decision,
            comando_id=comando_id,
            modo_operacion=modo,
            origen_ejecucion=settings.OPERATION_MODE
        )

        if self.cliente and self._conectado:
            cadena_json = json.dumps(payload_accion)
            self.cliente.publish(settings.TOPIC_ACCION, cadena_json)
            logger.info(f"🚀 [ORDEN {modo.upper()} EMITIDA] [{comando_id}] -> {zona} | Fan={fan_state} | Servo={servo_angle}°")
        else:
            self.estado_sistema["ultimo_estado_comando"] = "ERROR_CONEXION_MQTT"
            logger.warning(f"⚠️ Sin conexión MQTT para publicar comando {comando_id}")

        return comando_id

    def _procesar_ack_hardware(self, datos: Dict[str, Any]):
        """Procesa el ACK correlacionado del simulador o hardware sin inventar latencias constantes"""
        ts_ack = time.time()
        ts_decision = float(datos.get("timestamp_decision", ts_ack))
        comando_id = datos.get("comando_id")
        zona = datos.get("zona_objetivo", self.estado_sistema["zona_activa"])
        fan_state = int(datos.get("fan_state", self.estado_sistema["estado_ventilador"]))
        servo_angle = int(datos.get("servo_angle", self.estado_sistema["angulo_servo"]))
        status_ack = datos.get("status", "EJECUTADO_SIMULACION")
        origen_ack = datos.get("origen_ack", "simulacion")

        latencia_reportada = datos.get("latencia_simulacion_ms")
        delta_ms = round((ts_ack - ts_decision) * 1000.0, 2)
        if delta_ms > 0 and delta_ms < 30000:
            latencia_ms = delta_ms
        elif latencia_reportada is not None and float(latencia_reportada) > 0:
            latencia_ms = round(float(latencia_reportada), 2)
        else:
            latencia_ms = None

        with self._lock:
            self.estado_sistema["total_acks_recibidos"] += 1
            self.estado_sistema["ultima_latencia_ms"] = latencia_ms
            self.estado_sistema["ultimo_estado_comando"] = status_ack

        logger.info(
            f"✅ [ACK SIMULADO/HW RECIBIDO] Cmd={comando_id} | Zona={zona} | "
            f"Fan={fan_state} | Servo={servo_angle}° | Latencia={latencia_ms} ms"
        )

        db_manager.registrar_ack_control(
            zona=zona,
            fan_state=fan_state,
            servo_angle=servo_angle,
            ts_decision=ts_decision,
            ts_ack=ts_ack,
            comando_id=comando_id,
            latencia_medida_ms=latencia_ms,
            estado_comando=status_ack,
            origen_ack=origen_ack
        )

    def cambiar_modo_control(self, nuevo_modo: str) -> Dict[str, Any]:
        """Cambia entre modo 'autonomo' y 'manual' de forma persistente en el estado del backend"""
        modo_norm = "manual" if nuevo_modo.lower() == "manual" else "autonomo"
        with self._lock:
            self.estado_sistema["modo_control"] = modo_norm
            self.estado_sistema["ultimo_cambio_control"] = time.time()
            if modo_norm == "autonomo":
                self._evaluar_logica_control()
        logger.info(f"🔀 Modo de control cambiado a: [{modo_norm.upper()}]")
        return {
            "modo_control": self.estado_sistema["modo_control"],
            "estado_ventilador": self.estado_sistema["estado_ventilador"],
            "angulo_servo": self.estado_sistema["angulo_servo"],
            "zona_activa": self.estado_sistema["zona_activa"],
            "mensaje": f"Sistema operando ahora en modo {modo_norm.upper()}."
        }

    def ejecutar_control_manual(self, zona: str, fan_state: int, servo_angle: Optional[int] = None,
                                activar_modo_manual: bool = True) -> Dict[str, Any]:
        """
        Ejecuta una orden manual desde la Web o la App Móvil.
        Cambia automáticamente a modo 'manual' para evitar que el algoritmo autónomo
        sobrescriba el comando del usuario en el siguiente ciclo.
        """
        angulo = servo_angle if servo_angle is not None else settings.ZONAS_ANGULOS.get(zona, 90)
        angulo = max(0, min(180, int(angulo)))
        ahora = time.time()

        with self._lock:
            if activar_modo_manual:
                self.estado_sistema["modo_control"] = "manual"
            self.estado_sistema["estado_ventilador"] = 1 if fan_state > 0 else 0
            self.estado_sistema["angulo_servo"] = angulo
            self.estado_sistema["zona_activa"] = zona
            self.estado_sistema["ultimo_cambio_control"] = ahora

            info_z = self.ultimas_temperaturas.get(zona, {})
            t_act = float(info_z.get("temperatura_actual") or 32.0)
            t_pred = float(info_z.get("temperatura_predicha") or t_act)

            for z_k, z_val in self.ultimas_temperaturas.items():
                z_val["estado_ventilador"] = self.estado_sistema["estado_ventilador"]
                z_val["angulo_servo"] = angulo
                z_val["enfriando"] = (self.estado_sistema["estado_ventilador"] == 1) and (
                    abs(angulo - z_val["angulo_servo_zona"]) <= 22
                )

            comando_id = self._emitir_orden_control(
                zona=zona,
                fan_state=self.estado_sistema["estado_ventilador"],
                servo_angle=angulo,
                temp_act=t_act,
                temp_pred=t_pred,
                timestamp_decision=ahora,
                modo="manual"
            )

        return {
            "mensaje": "Comando manual emitido al simulador y registrado en el backend.",
            "comando_id": comando_id,
            "estado_comando": "PENDIENTE",
            "modo_control": self.estado_sistema["modo_control"],
            "zona": zona,
            "fan_state": self.estado_sistema["estado_ventilador"],
            "servo_angle": angulo,
            "timestamp": ahora
        }

    def cambiar_escenario_simulacion(self, escenario: str, zona_fallo_sensor: str = "zona2") -> Dict[str, Any]:
        """Envía orden MQTT al simulador para cambiar el escenario térmico en vivo"""
        ids_validos = [e["id"] for e in ESCENARIOS_CATALOGO]
        if escenario not in ids_validos:
            raise ValueError(f"Escenario inválido. Opciones: {ids_validos}")

        with self._lock:
            self.estado_sistema["escenario_simulacion"] = escenario
            self.estado_sistema["zona_fallo_sensor"] = zona_fallo_sensor if escenario == "fallo_sensor" else None
            ml_predictor.reiniciar_historial()
            if escenario == "fallo_sensor" and zona_fallo_sensor in self.ultimas_temperaturas:
                self.ultimas_temperaturas[zona_fallo_sensor]["disponible"] = False
                self.ultimas_temperaturas[zona_fallo_sensor]["nivel_termico"] = "sin_senal"
                self.ultimas_temperaturas[zona_fallo_sensor]["temperatura_actual"] = None
                self.ultimas_temperaturas[zona_fallo_sensor]["temperatura_predicha"] = None
            else:
                for z_val in self.ultimas_temperaturas.values():
                    z_val["disponible"] = True

        payload = {
            "accion": "cambiar_escenario",
            "escenario": escenario,
            "zona_fallo_sensor": zona_fallo_sensor,
            "timestamp": time.time()
        }
        if self.cliente and self._conectado:
            self.cliente.publish(settings.TOPIC_SIMULADOR_CONTROL, json.dumps(payload))

        return {
            "mensaje": f"Escenario de simulación actualizado a '{escenario}'.",
            "escenario_activo": escenario,
            "zona_fallo_sensor": self.estado_sistema["zona_fallo_sensor"],
            "modo_operacion": self.estado_sistema["modo_operacion_sistema"]
        }

    def reiniciar_simulacion(self, escenario: Optional[str] = None) -> Dict[str, Any]:
        """Reinicia las temperaturas del simulador, el predictor ML y restablece actuadores"""
        esc_destino = escenario or self.estado_sistema["escenario_simulacion"]
        with self._lock:
            ml_predictor.reiniciar_historial()
            self._inicializar_zonas_base()
            self.estado_sistema["estado_ventilador"] = 0
            self.estado_sistema["angulo_servo"] = 90
            self.estado_sistema["zona_activa"] = "zona3"
            self.estado_sistema["escenario_simulacion"] = esc_destino

        payload = {
            "accion": "reiniciar",
            "escenario": esc_destino,
            "timestamp": time.time()
        }
        if self.cliente and self._conectado:
            self.cliente.publish(settings.TOPIC_SIMULADOR_CONTROL, json.dumps(payload))

        return {
            "mensaje": "Simulación térmica reiniciada correctamente.",
            "escenario_activo": esc_destino,
            "estado_ventilador": 0,
            "angulo_servo": 90
        }

    def obtener_alertas_activas(self) -> List[Dict[str, Any]]:
        """Genera la lista estructurada de alertas térmicas y de sensores en tiempo real"""
        alertas: List[Dict[str, Any]] = []
        ahora_str = time.strftime("%H:%M:%S")
        with self._lock:
            for z_id in sorted(self.ultimas_temperaturas.keys()):
                info = self.ultimas_temperaturas[z_id]
                nombre = info.get("nombre", z_id.upper())
                if not info.get("disponible") or info.get("temperatura_actual") is None:
                    alertas.append({
                        "id": f"alerta_sin_senal_{z_id}",
                        "zona": z_id,
                        "nombre_zona": nombre,
                        "severidad": "error",
                        "tipo": "FALLO_SENSOR",
                        "titulo": f"{nombre}: Sensor Sin Señal",
                        "mensaje": f"No se reciben paquetes de telemetría desde {info.get('sensor', 'el sensor')}. El sistema no inventa lecturas.",
                        "temperatura_actual": None,
                        "temperatura_predicha": None,
                        "hora": ahora_str
                    })
                    continue

                t_act = float(info["temperatura_actual"])
                t_pred = float(info.get("temperatura_predicha") or t_act)

                if t_act >= settings.UMBRAL_TEMPERATURA_CRITICA:
                    alertas.append({
                        "id": f"alerta_critica_{z_id}",
                        "zona": z_id,
                        "nombre_zona": nombre,
                        "severidad": "critica",
                        "tipo": "SOBRECALENTAMIENTO_ACTUAL",
                        "titulo": f"{nombre}: Umbral Crítico Superado ({t_act:.1f}°C)",
                        "mensaje": f"Temperatura actual ({t_act:.1f}°C) >= 35.0°C. Refrigeración {'activa' if info.get('enfriando') else 'requerida'}.",
                        "temperatura_actual": t_act,
                        "temperatura_predicha": t_pred,
                        "hora": ahora_str
                    })
                elif t_pred >= settings.UMBRAL_TEMPERATURA_CRITICA:
                    alertas.append({
                        "id": f"alerta_predictiva_{z_id}",
                        "zona": z_id,
                        "nombre_zona": nombre,
                        "severidad": "advertencia",
                        "tipo": "PREDICCION_CRITICA_10M",
                        "titulo": f"{nombre}: Alerta Predictiva a +10 min ({t_pred:.1f}°C)",
                        "mensaje": f"El modelo Scikit-Learn proyecta {t_pred:.1f}°C en 10 minutos (actual: {t_act:.1f}°C).",
                        "temperatura_actual": t_act,
                        "temperatura_predicha": t_pred,
                        "hora": ahora_str
                    })
                elif t_act >= settings.UMBRAL_TEMPERATURA_ADVERTENCIA:
                    alertas.append({
                        "id": f"alerta_precaucion_{z_id}",
                        "zona": z_id,
                        "nombre_zona": nombre,
                        "severidad": "advertencia",
                        "tipo": "PRECAUCION_TERMICA",
                        "titulo": f"{nombre}: Temperatura Elevada ({t_act:.1f}°C)",
                        "mensaje": f"Acercándose al umbral crítico de 35.0°C (proyección +10m: {t_pred:.1f}°C).",
                        "temperatura_actual": t_act,
                        "temperatura_predicha": t_pred,
                        "hora": ahora_str
                    })
        return alertas

    def obtener_estado_actual(self) -> Dict[str, Any]:
        with self._lock:
            self._verificar_disponibilidad_sensores()
            self._actualizar_metricas_agregadas()
            zonas_ordenadas = [
                self.ultimas_temperaturas[k]
                for k in sorted(self.ultimas_temperaturas.keys())
            ]
            return {
                "sistema": dict(self.estado_sistema),
                "zonas": zonas_ordenadas,
                "escenarios_disponibles": ESCENARIOS_CATALOGO,
                "broker_conectado": self._conectado
            }

mqtt_service = MQTTService()
