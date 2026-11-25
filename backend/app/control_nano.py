from threading import Condition
from time import monotonic
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


class OrdenNano(BaseModel):
    modo: Literal["autonomo", "manual", "pausa"]
    ventilador: bool | None = None
    angulo: int | None = Field(None, ge=45, le=135)

    @model_validator(mode="after")
    def validar_manual(self):
        if self.modo == "manual" and (self.ventilador is None or self.angulo is None):
            raise ValueError("El modo manual requiere estado del ventilador y ángulo.")
        return self


class TelemetriaNano(BaseModel):
    ventilador: bool
    angulo: int = Field(ge=45, le=135)
    direccion: Literal[0, 1, 2]
    manual: bool
    proteccion: bool
    servo_activo: bool = True


class AckNano(BaseModel):
    id: str = Field(pattern=r"^[0-9a-f]{12}$")
    ventilador: bool
    angulo_objetivo: int = Field(ge=45, le=135)
    manual: bool
    proteccion: bool
    servo_activo: bool = True


class IntercambioNano(BaseModel):
    telemetria: TelemetriaNano | None = None
    ack: AckNano | None = None


class ControlNano:
    def __init__(self):
        self._cambio = Condition()
        self._telemetria = None
        self._ultima_lectura = 0.0
        self._orden = None
        self._entregada = False
        self._ack = None

    def estado(self):
        with self._cambio:
            disponible = self._telemetria is not None and monotonic() - self._ultima_lectura < 7
            return {
                "disponible": disponible,
                "telemetria": self._telemetria.model_dump() if disponible else None,
            }

    def intercambiar(self, mensaje: IntercambioNano):
        with self._cambio:
            if mensaje.telemetria is not None:
                self._telemetria = mensaje.telemetria
                self._ultima_lectura = monotonic()
            if self._orden and self._entregada and mensaje.ack and mensaje.ack.id == self._orden["id"]:
                self._ack = mensaje.ack
                self._cambio.notify_all()
            if not self._orden or self._entregada:
                return {"orden": None}
            self._entregada = True
            return {"orden": self._orden}

    def ejecutar(self, orden: OrdenNano):
        with self._cambio:
            if not self.estado()["disponible"]:
                raise ConnectionError("El Nano no tiene un enlace USB activo.")
            if self._orden is not None:
                raise ValueError("Ya hay una orden física pendiente.")
            self._orden = {"id": uuid4().hex[:12], **orden.model_dump()}
            self._entregada = False
            self._ack = None
            try:
                if not self._cambio.wait_for(lambda: self._ack is not None, timeout=3.0):
                    raise TimeoutError("El Nano no confirmó la orden.")
                return self._ack.model_dump()
            finally:
                self._orden = None
                self._ack = None


control_nano = ControlNano()
