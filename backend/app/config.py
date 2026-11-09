import os
from pydantic import BaseModel

class Settings(BaseModel):
    # Base de Datos MySQL
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: int = int(os.getenv("DB_PORT", "3308"))  # 3308 en host, 3306 en Docker
    DB_USER: str = os.getenv("DB_USER", "emqx_user")
    DB_PASS: str = os.getenv("DB_PASS", "emqx_pass")
    DB_NAME: str = os.getenv("DB_NAME", "emqx_db")

    # Broker MQTT
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "127.0.0.1")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USER: str = os.getenv("MQTT_USER", "sensor_iot")
    MQTT_PASS: str = os.getenv("MQTT_PASS", "marck124M")
    CLIENT_ID: str = os.getenv("CLIENT_ID", "backend_fastapi_server_v2")

    # Modo de Operación del Sistema: "simulacion" o "hardware_real"
    OPERATION_MODE: str = os.getenv("OPERATION_MODE", "simulacion")

    # Tópicos MQTT
    TOPIC_SENSORES: str = "lab/piloto/+/temp"
    TOPIC_ACCION: str = "lab/piloto/accion"
    TOPIC_ACK: str = "lab/piloto/ack"
    TOPIC_SIMULADOR_CONTROL: str = "lab/piloto/simulador/control"
    TOPIC_SIMULADOR_ESTADO: str = "lab/piloto/simulador/estado"

    # Reglas de negocio térmicas
    UMBRAL_TEMPERATURA_CRITICA: float = float(os.getenv("UMBRAL_TEMP_CRITICA", "35.0"))
    UMBRAL_TEMPERATURA_ADVERTENCIA: float = float(os.getenv("UMBRAL_TEMP_ADVERTENCIA", "33.0"))
    UMBRAL_HISTERESIS_APAGADO: float = float(os.getenv("UMBRAL_HISTERESIS", "32.0"))
    VENTANA_PREDICCION_SEGUNDOS: int = 600  # +10 minutos = 600 segundos

    # Mapeo de las 5 zonas a ángulos del servomotor SG90 y metadatos de sensores
    ZONAS_ANGULOS: dict = {
        "zona1": 0,    # PC 1 (Representa DHT11 - Extremo Izquierdo)
        "zona2": 45,   # PC 2 (Representa DS18B20 - Izquierda Central)
        "zona3": 90,   # PC 3 (Nodo Térmico - Centro)
        "zona4": 135,  # PC 4 (Nodo Térmico - Derecha Central)
        "zona5": 180   # PC 5 (Nodo Térmico - Extremo Derecho)
    }

    ZONAS_METADATOS: dict = {
        "zona1": {"nombre": "PC 1", "etiqueta": "Estación 01", "sensor_modelo": "DHT11 (Simulado)", "angulo": 0},
        "zona2": {"nombre": "PC 2", "etiqueta": "Estación 02", "sensor_modelo": "DS18B20 1-Wire (Simulado)", "angulo": 45},
        "zona3": {"nombre": "PC 3", "etiqueta": "Estación 03", "sensor_modelo": "Sonda Térmica Digital (Simulada)", "angulo": 90},
        "zona4": {"nombre": "PC 4", "etiqueta": "Estación 04", "sensor_modelo": "Sonda Térmica Digital (Simulada)", "angulo": 135},
        "zona5": {"nombre": "PC 5", "etiqueta": "Estación 05", "sensor_modelo": "Sonda Térmica Digital (Simulada)", "angulo": 180},
    }

settings = Settings()
