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
    CLIENT_ID: str = os.getenv("CLIENT_ID", "backend_fastapi_server")

    # Tópicos MQTT
    TOPIC_SENSORES: str = "lab/piloto/+/temp"
    TOPIC_ACCION: str = "lab/piloto/accion"
    TOPIC_ACK: str = "lab/piloto/ack"

    # Reglas de negocio térmicas
    UMBRAL_TEMPERATURA_CRITICA: float = float(os.getenv("UMBRAL_TEMP_CRITICA", "35.0"))
    UMBRAL_HISTERESIS_APAGADO: float = float(os.getenv("UMBRAL_HISTERESIS", "32.0"))
    VENTANA_PREDICCION_SEGUNDOS: int = 600  # +10 minutos = 600 segundos

    # Mapeo físico de zonas a ángulos de servomotor SG90
    ZONAS_ANGULOS: dict = {
        "zona1": 0,    # PC 1 (Física DHT11 - Extremo Izquierdo)
        "zona2": 45,   # PC 2 (Física DS18B20 - Izquierda Central)
        "zona3": 90,   # PC 3 (Virtual - Centro)
        "zona4": 135,  # PC 4 (Virtual - Derecha Central)
        "zona5": 180   # PC 5 (Virtual - Extremo Derecho)
    }

settings = Settings()
