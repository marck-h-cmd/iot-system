"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
UTILIDAD DE PRUEBAS: Simulador de Puente Hardware (Arduino Nano CH340G + ESP32 Gateway)
=========================================================================================
Este script emula el comportamiento físico exacto de la Fase 1:
1. Publica telemetría de Zona 1 (DHT11) y Zona 2 (DS18B20) cada 5 segundos.
2. Escucha las órdenes de control en `lab/piloto/accion`.
3. Al recibir una orden, emula el movimiento del SG90 y la activación del MOSFET,
   y responde con el mensaje JSON de ACK en `lab/piloto/ack` para medición de latencia.
"""

import time
import json
import random
import logging
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [HW-BRIDGE] %(message)s")
logger = logging.getLogger("hw_bridge")

BROKER = "127.0.0.1"
PORT = 1883
USER = "sensor_iot"
PASS = "marck124M"

msg_id = 100
ultimo_fan = 0
ultimo_servo = 90

def on_connect(client, userdata, flags, rc, *args):
    if rc == 0 or (hasattr(rc, "value") and rc.value == 0):
        logger.info("✅ Conectado al Broker MQTT emulando ESP32 + Nano")
        client.subscribe("lab/piloto/accion")
        logger.info("📡 Suscrito a lab/piloto/accion")
    else:
        logger.error(f"Error conectando: {rc}")

def on_message(client, userdata, msg):
    global ultimo_fan, ultimo_servo
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        logger.info(f"📥 [NANO EMULADO] Recibido comando de acción: {payload}")

        zona = payload.get("zona_objetivo", "zona1")
        fan = payload.get("fan_state", 0)
        servo = payload.get("servo_angle", 90)
        ts_decision = payload.get("timestamp_decision", time.time())

        # Simular retardo físico de accionamiento de actuadores (30ms a 50ms)
        time.sleep(0.040)

        ultimo_fan = fan
        ultimo_servo = servo

        # Retornar mensaje ACK
        ack_payload = {
            "tipo": "ack",
            "status": "OK",
            "zona_objetivo": zona,
            "fan_state": fan,
            "servo_angle": servo,
            "timestamp_decision": ts_decision
        }

        client.publish("lab/piloto/ack", json.dumps(ack_payload))
        logger.info(f"📤 [NANO EMULADO -> ACK] Emitido ACK: {ack_payload}")

    except Exception as e:
        logger.error(f"Error procesando mensaje: {e}")

def main():
    global msg_id
    try:
        cliente = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="hw_bridge_nano_esp32")
    except Exception:
        cliente = mqtt.Client(client_id="hw_bridge_nano_esp32")

    cliente.username_pw_set(USER, PASS)
    cliente.on_connect = on_connect
    cliente.on_message = on_message

    cliente.connect(BROKER, PORT, 60)
    cliente.loop_start()

    logger.info("🚀 Puente hardware iniciado emulando DHT11 y DS18B20...")
    try:
        while True:
            ahora = time.time()
            msg_id += 1

            # Telemetría Zona 1 (DHT11 - PC 1)
            t1 = round(random.uniform(30.0, 32.5), 2)
            p1 = {
                "msg_id": msg_id,
                "zona": "zona1",
                "temperatura": t1,
                "origen": "real",
                "sensor": "DHT11",
                "timestamp_origen": ahora
            }
            cliente.publish("lab/piloto/zona1/temp", json.dumps(p1))

            # Telemetría Zona 2 (DS18B20 - PC 2)
            t2 = round(random.uniform(29.5, 31.8), 2)
            p2 = {
                "msg_id": msg_id + 1,
                "zona": "zona2",
                "temperatura": t2,
                "origen": "real",
                "sensor": "DS18B20",
                "timestamp_origen": ahora
            }
            cliente.publish("lab/piloto/zona2/temp", json.dumps(p2))

            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Detenido.")
    finally:
        cliente.loop_stop()
        cliente.disconnect()

if __name__ == "__main__":
    main()
