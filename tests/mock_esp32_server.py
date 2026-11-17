"""
Servidor Mock Contractual del Gateway ESP32 (Hardware Real)
============================================================
Reproduce de forma exacta el contrato HTTP del firmware real del ESP32:
Endpoint: GET http://localhost:<PORT>/datos

Contrato JSON oficial:
{
  "temp": 33.7,
  "tdht": 30.0,
  "hum": 71.0,
  "ventilador": true,
  "error": false,
  "edad": 1
}

Permite simular estados contractuales para pruebas automatizadas cuando el ESP32 físico
está apagado o fuera de alcance de red:
- 'normal': Lecturas físicas normales (temp=33.7, tdht=30.0, hum=71.0, ventilador=true, error=false, edad=1)
- 'enfriado': Lecturas bajo umbral (temp=28.4, tdht=27.5, hum=65.0, ventilador=false, error=false, edad=1)
- 'error_sensor': Fallo del DS18B20 (temp=null, tdht=29.5, hum=68.0, ventilador=true, error=true, edad=2)
- 'telemetria_antigua': El Arduino Nano dejó de enviar tramas UART (edad=28)
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, Any, Optional


ESCENARIOS_MOCK: Dict[str, Dict[str, Any]] = {
    "normal": {
        "temp": 33.7,
        "tdht": 30.0,
        "hum": 71.0,
        "ventilador": True,
        "error": False,
        "edad": 1
    },
    "enfriado": {
        "temp": 28.4,
        "tdht": 27.5,
        "hum": 65.0,
        "ventilador": False,
        "error": False,
        "edad": 1
    },
    "error_sensor": {
        "temp": None,
        "tdht": 29.5,
        "hum": 68.0,
        "ventilador": True,
        "error": True,
        "edad": 2
    },
    "telemetria_antigua": {
        "temp": 31.2,
        "tdht": 29.0,
        "hum": 70.0,
        "ventilador": True,
        "error": False,
        "edad": 28
    }
}


class MockESP32State:
    escenario_actual: str = "normal"
    payload_personalizado: Optional[Dict[str, Any]] = None


class MockESP32Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass  # Silenciar logs estándar durante pruebas automatizadas

    def do_GET(self) -> None:
        if self.path == "/datos" or self.path.startswith("/datos?"):
            if MockESP32State.payload_personalizado is not None:
                data = MockESP32State.payload_personalizado
            else:
                data = ESCENARIOS_MOCK.get(MockESP32State.escenario_actual, ESCENARIOS_MOCK["normal"])

            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/":
            html = b"<html><body><h1>ESP32 Smart Cooling Gateway (Mock Contractual)</h1></body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html)
        else:
            self.send_response(404)
            self.end_headers()


class MockESP32Server:
    def __init__(self, host: str = "127.0.0.1", port: int = 18089):
        self.host = host
        self.port = port
        self.server: Optional[HTTPServer] = None
        self.thread: Optional[threading.Thread] = None

    def start(self) -> str:
        self.server = HTTPServer((self.host, self.port), MockESP32Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return f"http://{self.host}:{self.port}/datos"

    def stop(self) -> None:
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.server = None

    @staticmethod
    def set_escenario(escenario: str) -> None:
        MockESP32State.payload_personalizado = None
        MockESP32State.escenario_actual = escenario


if __name__ == "__main__":
    srv = MockESP32Server(host="0.0.0.0", port=8089)
    url = srv.start()
    print(f"Servidor Mock Contractual ESP32 activo en: {url}")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        srv.stop()
