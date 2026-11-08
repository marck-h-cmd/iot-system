"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
ENTREGABLE: FASE 4 - Simulador Python de Zonas Virtuales (PC 3, PC 4, PC 5)
UNIVERSIDAD: Universidad Nacional de Trujillo
=========================================================================================

DESCRIPCIÓN:
Este script simula el comportamiento térmico de los equipos PC 3, PC 4 y PC 5 (zonas virtuales).
1. Publica cada 5 segundos telemetría térmica directamente al Broker MQTT (EMQX):
   - Tópico PC 3: `lab/piloto/zona3/temp`
   - Tópico PC 4: `lab/piloto/zona4/temp`
   - Tópico PC 5: `lab/piloto/zona5/temp`
2. Genera datos con tendencia térmica ascendente (simulando carga de cómputo en laboratorio)
   y ruido gaussiano realista.
3. Se suscribe a `lab/piloto/accion` para implementar un lazo cerrado: si el ventilador apunta a la
   zona y está activo (`fan_state == 1`), la temperatura de esa zona desciende progresivamente.
=========================================================================================
"""

import os
import sys
import time
import json
import random
import logging
import paho.mqtt.client as mqtt

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SIMULADOR] %(message)s"
)
logger = logging.getLogger("simulador_zonas")

# ================= PARÁMETROS DE CONFIGURACIÓN =================
BROKER    = os.getenv("MQTT_BROKER", "127.0.0.1")
PORT      = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "sensor_iot")
MQTT_PASS = os.getenv("MQTT_PASS", "marck124M")
CLIENT_ID = os.getenv("CLIENT_ID", f"simulador_virtual_{random.randint(1000, 9999)}")

TOPIC_BASE = "lab/piloto/"
TOPIC_ACCION = "lab/piloto/accion"

# Estado térmico base de las 3 zonas virtuales
estado_zonas = {
    "zona3": {"temp": 31.5, "origen": "virtual", "enfriando": False},
    "zona4": {"temp": 33.2, "origen": "virtual", "enfriando": False},  # Zona propensa a superar 35°C
    "zona5": {"temp": 30.8, "origen": "virtual", "enfriando": False}
}

contador_msg = 3000

# ================= CALLBACKS MQTT =================

def on_connect(client, userdata, flags, rc, *args):
    if rc == 0 or (hasattr(rc, "value") and rc.value == 0):
        logger.info(f"✅ Conectado exitosamente al Broker EMQX en {BROKER}:{PORT}")
        # Suscripción al canal de control para respuesta en lazo cerrado
        client.subscribe(TOPIC_ACCION)
        logger.info(f"📡 Suscrito a [{TOPIC_ACCION}] para feedback térmico en lazo cerrado.")
    else:
        logger.error(f"❌ Falló conexión al Broker MQTT con código: {rc}")

def on_message(client, userdata, msg):
    """Detecta si el ventilador fue activado hacia alguna de las zonas simuladas"""
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        zona_obj = payload.get("zona_objetivo")
        fan_state = payload.get("fan_state", 0)

        for z in estado_zonas.keys():
            if z == zona_obj and fan_state == 1:
                estado_zonas[z]["enfriando"] = True
                logger.info(f"❄️ [EFECTO TÉRMICO] {z} ahora está recibiendo flujo de aire frío del ventilador.")
            else:
                estado_zonas[z]["enfriando"] = False

    except Exception as e:
        logger.warning(f"Error procesando mensaje de control: {e}")

# ================= DINÁMICA TÉRMICA =================

def actualizar_temperatura(zona: str) -> float:
    """Calcula el siguiente paso térmico: subida por carga de CPU o bajada por ventilación"""
    info = estado_zonas[zona]
    temp_actual = info["temp"]

    if info["enfriando"]:
        # Tasa de disipación forzada por el ventilador (-0.35°C a -0.6°C por ciclo)
        delta = -random.uniform(0.35, 0.65)
        limite_inferior = 27.5
        nueva_temp = max(limite_inferior, temp_actual + delta)
    else:
        # Generación de calor con ligera deriva ascendente y ruido (+0.1°C a +0.45°C)
        ruido = random.uniform(-0.08, 0.08)
        tendencia_subida = random.uniform(0.12, 0.38)
        
        # En la zona 4 simulamos picos de carga para provocar el cruce de 35°C
        if zona == "zona4" and temp_actual < 37.5:
            tendencia_subida += 0.20

        nueva_temp = temp_actual + tendencia_subida + ruido
        # Límite superior térmico antes de thermal throttling
        nueva_temp = min(42.0, nueva_temp)

    info["temp"] = round(nueva_temp, 2)
    return info["temp"]

# ================= BUCLE PRINCIPAL =================

def main():
    global contador_msg
    logger.info("=" * 65)
    logger.info(" INICIANDO SIMULADOR DE ZONAS VIRTUALES (PC 3, PC 4, PC 5)")
    logger.info("=" * 65)

    # Inicializar cliente MQTT con compatibilidad v1/v2
    try:
        cliente = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=CLIENT_ID)
    except (AttributeError, TypeError):
        cliente = mqtt.Client(client_id=CLIENT_ID)

    if MQTT_USER and MQTT_PASS:
        cliente.username_pw_set(MQTT_USER, MQTT_PASS)

    cliente.on_connect = on_connect
    cliente.on_message = on_message

    logger.info(f"Conectando a {BROKER}:{PORT}...")
    try:
        cliente.connect(BROKER, PORT, keepalive=60)
        cliente.loop_start()
    except Exception as e:
        logger.error(f"❌ Error crítico de conexión al broker MQTT: {e}")
        sys.exit(1)

    time.sleep(1.5)

    try:
        ciclo = 1
        while True:
            ahora_epoch = time.time()
            logger.info(f"--- [Ciclo #{ciclo}] Publicando telemetría de zonas virtuales ---")

            for zona in ["zona3", "zona4", "zona5"]:
                contador_msg += 1
                temp = actualizar_temperatura(zona)
                
                # Payload con formato estandarizado según la sección 5 del requerimiento
                payload = {
                    "msg_id": contador_msg,
                    "zona": zona,
                    "temperatura": temp,
                    "origen": "virtual",
                    "timestamp_origen": round(ahora_epoch, 3)
                }

                topico_pub = f"{TOPIC_BASE}{zona}/temp"
                cliente.publish(topico_pub, json.dumps(payload))
                
                alerta = " 🔥 [ALERTA >35°C]" if temp >= 35.0 else ""
                logger.info(f"📤 [{topico_pub}] -> Temp: {temp}°C | Origen: virtual{alerta}")

            ciclo += 1
            # Intervalo de adquisición estricto de 5 segundos (Meta: cada 5s)
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("\n🛑 Simulador detenido por el usuario.")
    finally:
        cliente.loop_stop()
        cliente.disconnect()
        logger.info("Simulador desconectado.")

if __name__ == "__main__":
    main()
