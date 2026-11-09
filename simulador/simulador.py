"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT) 2.0
MÓDULO: Motor de Simulación Unificado de 5 Zonas Térmicas, Sensores y Actuadores (SG90 + MOSFET)
UNIVERSIDAD: Universidad Nacional de Trujillo (UNT)
=========================================================================================

DESCRIPCIÓN:
Simulador físico-térmico coherente para las 5 computadoras del laboratorio (PC 1 a PC 5)
cuando aún no se dispone del circuito físico conectado:
1. Modela de forma continua e independiente las 5 zonas:
   - zona1 (PC 1): Emula sensor DHT11 (0°)
   - zona2 (PC 2): Emula sensor DS18B20 1-Wire (45°)
   - zona3 (PC 3): Nodo térmico central (90°)
   - zona4 (PC 4): Nodo térmico de alto desempeño (135°)
   - zona5 (PC 5): Nodo térmico extremo derecho (180°)
2. Implementa dinámica termodinámica de primer orden (Ley de enfriamiento/calentamiento de Newton):
   - T(t + dt) = T(t) + [ Q_carga(zona, escenario) - Q_ventilador(fan, servo) - k_amb*(T - T_amb) ] * dt + ruido_suave
3. Soporta 5 escenarios seleccionables en vivo sin reiniciar contenedores ni editar código:
   - `normal`: Carga moderada estable con intervenciones puntuales.
   - `sobrecalentamiento`: Incremento térmico progresivo en PC 2 y PC 4 que supera 35.0 °C.
   - `carga_extrema`: Estrés térmico simultáneo en múltiples estaciones (PC 1, PC 3, PC 4, PC 5).
   - `demostracion`: Secuencia guiada reproducible por fases para exposición académica.
   - `fallo_sensor`: La zona seleccionada (por defecto PC 2 / DS18B20) deja de emitir telemetría para comprobar que el sistema detecta datos no disponibles sin inventar lecturas.
4. Ejecuta órdenes recibidas en `lab/piloto/accion`, actualiza el estado del ventilador y del servomotor,
   y emite un mensaje de confirmación ACK correlacionado (`comando_id`) en `lab/piloto/ack`.
=========================================================================================
"""

import os
import sys
import time
import json
import math
import random
import logging
import paho.mqtt.client as mqtt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SIMULADOR-5Z] %(message)s"
)
logger = logging.getLogger("simulador_iot_v2")

# ================= PARÁMETROS DE CONEXIÓN =================
BROKER = os.getenv("MQTT_BROKER", "127.0.0.1")
PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "sensor_iot")
MQTT_PASS = os.getenv("MQTT_PASS", "marck124M")
MODO_SIMULACION = os.getenv("SIMULATION_MODE", "5_zonas")  # "5_zonas" (demo completa) o "3_zonas" (híbrido con circuito físico)
CLIENT_ID = os.getenv("CLIENT_ID", f"simulador_smart_cooling_v2_{random.randint(1000, 9999)}")

TOPIC_BASE = "lab/piloto/"
TOPIC_ACCION = "lab/piloto/accion"
TOPIC_ACK = "lab/piloto/ack"
TOPIC_SIM_CONTROL = "lab/piloto/simulador/control"
TOPIC_SIM_ESTADO = "lab/piloto/simulador/estado"

# ================= DEFINICIÓN DE ESCENARIOS =================
ESCENARIOS_DISPONIBLES = {
    "normal": {
        "id": "normal",
        "nombre": "Operación Normal",
        "descripcion": "Carga térmica moderada de laboratorio (28°C - 33.5°C) con picos suaves ocasionales."
    },
    "sobrecalentamiento": {
        "id": "sobrecalentamiento",
        "nombre": "Sobrecalentamiento Focalizado",
        "descripcion": "Incremento sostenido en PC 4 y PC 2 por encima de 35.5°C que dispara alertas y refrigeración activa."
    },
    "carga_extrema": {
        "id": "carga_extrema",
        "nombre": "Carga Térmica Extrema Multi-Zona",
        "descripcion": "Varias computadoras superan el umbral crítico simultáneamente; el algoritmo prioriza la más crítica."
    },
    "demostracion": {
        "id": "demostracion",
        "nombre": "Secuencia de Exposición Guiada",
        "descripcion": "Ciclo reproducible automático: calentamiento en PC 4 -> enfriamiento -> pico en PC 1 -> estabilización."
    },
    "fallo_sensor": {
        "id": "fallo_sensor",
        "nombre": "Fallo de Sensor (PC 2 Sin Señal)",
        "descripcion": "Simula desconexión del sensor DS18B20 en PC 2; deja de enviar datos y la plataforma reporta 'Sin Señal'."
    }
}

# ================= ESTADO GLOBAL DEL SIMULADOR =================
TEMPERATURAS_INICIALES = {
    "zona1": {"temp": 29.8, "sensor": "DHT11 (Simulado)", "angulo": 0},
    "zona2": {"temp": 30.4, "sensor": "DS18B20 (Simulado)", "angulo": 45},
    "zona3": {"temp": 31.1, "sensor": "Sonda Virtual", "angulo": 90},
    "zona4": {"temp": 32.6, "sensor": "Sonda Virtual", "angulo": 135},
    "zona5": {"temp": 29.5, "sensor": "Sonda Virtual", "angulo": 180},
}

estado_simulador = {
    "escenario": os.getenv("DEFAULT_SCENARIO", "demostracion"),
    "pausado": False,
    "fan_state": 0,
    "servo_angle": 90,
    "zona_objetivo": "zona3",
    "zona_fallo_sensor": "zona2",
    "inicio_escenario_ts": time.time(),
    "ciclo_actual": 0,
    "ultimo_comando_id": None,
    "zonas": {}
}

def inicializar_zonas(escenario: str = None):
    if escenario and escenario in ESCENARIOS_DISPONIBLES:
        estado_simulador["escenario"] = escenario
    estado_simulador["inicio_escenario_ts"] = time.time()
    estado_simulador["ciclo_actual"] = 0

    esc = estado_simulador["escenario"]
    zonas_nuevas = {}
    for z_id, base in TEMPERATURAS_INICIALES.items():
        temp_ini = base["temp"]
        if esc == "normal":
            temp_ini = base["temp"] - 0.6
        elif esc == "sobrecalentamiento":
            if z_id == "zona4":
                temp_ini = 34.4
            elif z_id == "zona2":
                temp_ini = 33.6
        elif esc == "carga_extrema":
            if z_id in ("zona4", "zona1", "zona3"):
                temp_ini = 34.6 + (0.5 if z_id == "zona4" else 0.0)
        elif esc == "demostracion":
            if z_id == "zona4":
                temp_ini = 33.9
            elif z_id == "zona1":
                temp_ini = 32.4

        zonas_nuevas[z_id] = {
            "temp": round(temp_ini, 2),
            "sensor": base["sensor"],
            "angulo": base["angulo"],
            "enfriando": False,
            "activa": not (esc == "fallo_sensor" and z_id == estado_simulador["zona_fallo_sensor"]),
            "carga_termica": 0.15
        }
    estado_simulador["zonas"] = zonas_nuevas
    actualizar_enfriamiento_zonas()
    logger.info(f"🔄 Simulador inicializado en escenario: [{estado_simulador['escenario'].upper()}]")

def actualizar_enfriamiento_zonas():
    """Determina qué zona recibe el flujo de aire según el ángulo del servomotor y el estado del ventilador"""
    fan_on = estado_simulador["fan_state"] == 1
    servo = estado_simulador["servo_angle"]
    for z_id, info in estado_simulador["zonas"].items():
        # Si el ventilador está encendido y el servomotor apunta dentro de ±22° del ángulo de la estación
        recibe_flujo = fan_on and (abs(servo - info["angulo"]) <= 22)
        info["enfriando"] = recibe_flujo

inicializar_zonas()
contador_msg = 5000

# ================= MODELO FÍSICO DE EVOLUCIÓN TÉRMICA =================

def calcular_temperatura_objetivo_sin_cooler(zona: str, escenario: str, seg_transcurridos: float) -> float:
    """
    Define la temperatura de equilibrio hacia la cual tiende cada PC según su carga de CPU
    y el escenario activo, produciendo curvas suaves y físicamente coherentes.
    """
    onda = math.sin((seg_transcurridos / 45.0) + int(zona[-1]) * 1.1) * 0.7

    if escenario == "normal":
        equilibrios = {"zona1": 30.2, "zona2": 31.0, "zona3": 31.6, "zona4": 32.8, "zona5": 30.0}
        return equilibrios.get(zona, 31.0) + onda

    elif escenario == "sobrecalentamiento":
        equilibrios = {"zona1": 31.4, "zona2": 36.6, "zona3": 32.5, "zona4": 38.4, "zona5": 31.0}
        return equilibrios.get(zona, 32.0) + onda

    elif escenario == "carga_extrema":
        equilibrios = {"zona1": 37.8, "zona2": 35.9, "zona3": 37.2, "zona4": 39.2, "zona5": 36.4}
        return equilibrios.get(zona, 36.5) + onda

    elif escenario == "fallo_sensor":
        equilibrios = {"zona1": 31.8, "zona2": 33.0, "zona3": 32.4, "zona4": 36.8, "zona5": 31.2}
        return equilibrios.get(zona, 32.0) + onda

    else:  # "demostracion" (ciclo dinámico reproducible cada 180 segundos)
        fase = seg_transcurridos % 180.0
        if fase < 60.0:
            # Fase 1: PC 4 se calienta por encima de 35°C para disparar la acción automática
            equilibrios = {"zona1": 31.5, "zona2": 30.8, "zona3": 32.0, "zona4": 38.2, "zona5": 30.5}
        elif fase < 120.0:
            # Fase 2: PC 1 sube de carga mientras PC 4 modera su carga
            equilibrios = {"zona1": 37.9, "zona2": 31.5, "zona3": 32.6, "zona4": 33.5, "zona5": 31.0}
        else:
            # Fase 3: PC 2 entra en estrés térmico
            equilibrios = {"zona1": 31.8, "zona2": 37.5, "zona3": 33.0, "zona4": 32.8, "zona5": 31.4}
        return equilibrios.get(zona, 32.0) + onda

def paso_termico(zona: str) -> float:
    """Evolución térmica gradual en cada intervalo de 5 segundos"""
    info = estado_simulador["zonas"][zona]
    temp_actual = info["temp"]
    escenario = estado_simulador["escenario"]
    seg = time.time() - estado_simulador["inicio_escenario_ts"]

    temp_meta_carga = calcular_temperatura_objetivo_sin_cooler(zona, escenario, seg)

    if info["enfriando"]:
        # Cuando el ventilador apunta a esta zona y está encendido, la temperatura converge hacia ~27.8°C
        temp_equilibrio_refrigerado = 27.6
        # Disipación convectiva forzada progresiva (-0.28°C a -0.58°C por ciclo de 5s)
        delta_enfriamiento = -max(0.24, min(0.62, (temp_actual - temp_equilibrio_refrigerado) * 0.085))
        ruido = random.uniform(-0.04, 0.03)
        nueva_temp = max(27.2, temp_actual + delta_enfriamiento + ruido)
    else:
        # Evolución gradual hacia la temperatura de equilibrio de carga térmica (inercia térmica)
        diferencia = temp_meta_carga - temp_actual
        # Paso máximo por ciclo de 5s acotado a [-0.32°C, +0.48°C] para evitar saltos irreales
        paso_inercia = max(-0.30, min(0.45, diferencia * 0.14))
        ruido = random.uniform(-0.05, 0.05)
        nueva_temp = min(42.5, max(25.5, temp_actual + paso_inercia + ruido))

    info["temp"] = round(nueva_temp, 2)
    return info["temp"]

# ================= PUBLICACIÓN DE ESTADO DEL SIMULADOR =================

def publicar_estado_simulador(client):
    payload_estado = {
        "modo_operacion": "simulacion",
        "escenario_activo": estado_simulador["escenario"],
        "escenarios_disponibles": list(ESCENARIOS_DISPONIBLES.values()),
        "fan_state": estado_simulador["fan_state"],
        "servo_angle": estado_simulador["servo_angle"],
        "zona_objetivo": estado_simulador["zona_objetivo"],
        "zona_fallo_sensor": estado_simulador["zona_fallo_sensor"] if estado_simulador["escenario"] == "fallo_sensor" else None,
        "ciclo_actual": estado_simulador["ciclo_actual"],
        "timestamp": time.time()
    }
    client.publish(TOPIC_SIM_ESTADO, json.dumps(payload_estado), retain=True)

# ================= CALLBACKS MQTT =================

def on_connect(client, userdata, flags, rc, *args):
    if rc == 0 or (hasattr(rc, "value") and rc.value == 0):
        logger.info(f"✅ Conectado a Broker EMQX ({BROKER}:{PORT}) en MODO SIMULACIÓN ({MODO_SIMULACION})")
        client.subscribe(TOPIC_ACCION)
        client.subscribe(TOPIC_SIM_CONTROL)
        publicar_estado_simulador(client)
    else:
        logger.error(f"❌ Fallo de conexión MQTT rc={rc}")

def on_message(client, userdata, msg):
    try:
        topico = msg.topic
        payload = json.loads(msg.payload.decode("utf-8"))

        # 1. Orden de actuación sobre Ventilador y Servomotor (desde Backend FastAPI)
        if topico == TOPIC_ACCION:
            t_recepcion = time.time()
            zona_obj = payload.get("zona_objetivo", estado_simulador["zona_objetivo"])
            fan_state = int(payload.get("fan_state", 0))
            servo_angle = int(payload.get("servo_angle", 90))
            ts_decision = float(payload.get("timestamp_decision", t_recepcion))
            comando_id = payload.get("comando_id")
            modo_origen = payload.get("modo", "autonomo")

            # Simular tiempo realista de transmisión UART + posicionamiento de actuador (24 ms a 46 ms)
            retardo_simulado_s = random.uniform(0.024, 0.046)
            time.sleep(retardo_simulado_s)

            estado_simulador["fan_state"] = 1 if fan_state > 0 else 0
            estado_simulador["servo_angle"] = max(0, min(180, servo_angle))
            estado_simulador["zona_objetivo"] = zona_obj
            estado_simulador["ultimo_comando_id"] = comando_id
            actualizar_enfriamiento_zonas()

            t_ack_emitido = time.time()
            latencia_sim_ms = round((t_ack_emitido - ts_decision) * 1000.0, 2)
            if latencia_sim_ms <= 0 or latencia_sim_ms > 5000:
                latencia_sim_ms = round(retardo_simulado_s * 1000.0, 2)

            ack_payload = {
                "tipo": "ack",
                "status": "EJECUTADO_SIMULACION",
                "origen_ack": "simulacion",
                "comando_id": comando_id,
                "modo": modo_origen,
                "zona_objetivo": zona_obj,
                "fan_state": estado_simulador["fan_state"],
                "servo_angle": estado_simulador["servo_angle"],
                "timestamp_decision": ts_decision,
                "timestamp_ack": t_ack_emitido,
                "latencia_simulacion_ms": latencia_sim_ms
            }

            client.publish(TOPIC_ACK, json.dumps(ack_payload))
            publicar_estado_simulador(client)
            logger.info(
                f"⚙️ [ACTUADOR SIMULADO] Cmd={comando_id} | Zona={zona_obj} | "
                f"Fan={'ON' if estado_simulador['fan_state'] else 'OFF'} | "
                f"Servo={estado_simulador['servo_angle']}° | Latencia Sim={latencia_sim_ms} ms"
            )

        # 2. Control de escenarios o reinicio de simulación (desde Backend FastAPI)
        elif topico == TOPIC_SIM_CONTROL:
            accion = payload.get("accion")
            if accion == "cambiar_escenario":
                nuevo_esc = payload.get("escenario", "normal")
                zona_fallo = payload.get("zona_fallo_sensor", "zona2")
                estado_simulador["zona_fallo_sensor"] = zona_fallo
                inicializar_zonas(nuevo_esc)
                publicar_estado_simulador(client)
            elif accion == "reiniciar":
                esc_actual = payload.get("escenario") or estado_simulador["escenario"]
                estado_simulador["fan_state"] = 0
                estado_simulador["servo_angle"] = 90
                inicializar_zonas(esc_actual)
                publicar_estado_simulador(client)

    except Exception as e:
        logger.warning(f"Error procesando mensaje en {msg.topic}: {e}")

# ================= BUCLE PRINCIPAL =================

def main():
    global contador_msg
    logger.info("=" * 72)
    logger.info(" SMART COOLING IoT 2.0 — MOTOR DE SIMULACIÓN DE 5 ZONAS (MODO DEMO)")
    logger.info("=" * 72)

    try:
        cliente = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=CLIENT_ID)
    except (AttributeError, TypeError):
        cliente = mqtt.Client(client_id=CLIENT_ID)

    if MQTT_USER and MQTT_PASS:
        cliente.username_pw_set(MQTT_USER, MQTT_PASS)

    cliente.on_connect = on_connect
    cliente.on_message = on_message

    conectado = False
    for intento in range(1, 15):
        try:
            cliente.connect(BROKER, PORT, keepalive=60)
            cliente.loop_start()
            conectado = True
            break
        except Exception as e:
            logger.warning(f"[Intento {intento}/15] Esperando Broker EMQX en {BROKER}:{PORT}... ({e})")
            time.sleep(2)

    if not conectado:
        logger.error("❌ No se pudo conectar al Broker EMQX.")
        sys.exit(1)

    time.sleep(1.0)

    # Determinar zonas gestionadas por el simulador (las 5 en modo demo)
    zonas_activas = ["zona1", "zona2", "zona3", "zona4", "zona5"] if MODO_SIMULACION == "5_zonas" else ["zona3", "zona4", "zona5"]

    try:
        while True:
            ahora_epoch = time.time()
            estado_simulador["ciclo_actual"] += 1
            esc = estado_simulador["escenario"]

            for zona in zonas_activas:
                info_z = estado_simulador["zonas"][zona]
                # En escenario fallo_sensor, la zona afectada no publica telemetría
                if esc == "fallo_sensor" and zona == estado_simulador["zona_fallo_sensor"]:
                    info_z["activa"] = False
                    logger.info(f"⚠️ [{zona}] Sensor en estado SIN SEÑAL (Escenario fallo_sensor)")
                    continue

                info_z["activa"] = True
                contador_msg += 1
                temp = paso_termico(zona)

                payload = {
                    "msg_id": contador_msg,
                    "zona": zona,
                    "temperatura": temp,
                    "origen": "virtual",
                    "modo_simulacion": True,
                    "sensor": info_z["sensor"],
                    "escenario": esc,
                    "enfriando": info_z["enfriando"],
                    "timestamp_origen": round(ahora_epoch, 3)
                }

                topico_pub = f"{TOPIC_BASE}{zona}/temp"
                cliente.publish(topico_pub, json.dumps(payload))

            publicar_estado_simulador(cliente)
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("🛑 Simulador detenido.")
    finally:
        cliente.loop_stop()
        cliente.disconnect()

if __name__ == "__main__":
    main()
