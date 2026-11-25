import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import mysql.connector
from mysql.connector import Error, pooling
from app.config import settings

logger = logging.getLogger("backend.database")

class DatabaseManager:
    def __init__(self):
        self.pool: Optional[pooling.MySQLConnectionPool] = None
        self._inicializar_pool(max_reintentos=2, espera=1)

    def _inicializar_pool(self, max_reintentos: int = 3, espera: int = 1):
        for intento in range(1, max_reintentos + 1):
            try:
                self.pool = pooling.MySQLConnectionPool(
                    pool_name="iot_db_pool",
                    pool_size=12,
                    pool_reset_session=True,
                    host=settings.DB_HOST,
                    port=settings.DB_PORT,
                    user=settings.DB_USER,
                    password=settings.DB_PASS,
                    database=settings.DB_NAME
                )
                logger.info(f"✅ Pool de conexiones a MySQL inicializado ({settings.DB_HOST}:{settings.DB_PORT})")
                self.verificar_tablas()
                return
            except Error as e:
                logger.warning(f"⚠️ [Intento {intento}/{max_reintentos}] Esperando MySQL ({settings.DB_HOST}:{settings.DB_PORT}): {e}")
                if intento < max_reintentos:
                    time.sleep(espera)
        logger.warning("⚠️ Pool MySQL no disponible de inmediato; se reintentará bajo demanda.")

    def get_connection(self):
        if self.pool is None:
            self._inicializar_pool(max_reintentos=2, espera=1)
        if self.pool:
            return self.pool.get_connection()
        raise RuntimeError("No hay conexión activa a MySQL")

    def verificar_tablas(self):
        """Asegura la existencia de las tablas operacionales y columnas extendidas para v2.0"""
        queries = [
            """
            CREATE TABLE IF NOT EXISTS registro_termico (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                msg_id BIGINT DEFAULT NULL,
                zona VARCHAR(20) NOT NULL,
                temperatura_actual FLOAT NOT NULL,
                temperatura_predicha FLOAT DEFAULT NULL,
                estado_ventilador TINYINT(1) DEFAULT 0,
                angulo_servo INT DEFAULT 90,
                origen ENUM('real', 'virtual') NOT NULL DEFAULT 'virtual',
                timestamp_origen DOUBLE DEFAULT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_zona_timestamp (zona, timestamp),
                INDEX idx_timestamp (timestamp),
                INDEX idx_zona (zona)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            """
            CREATE TABLE IF NOT EXISTS control_eventos (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                comando_id VARCHAR(64) DEFAULT NULL,
                modo_operacion VARCHAR(20) DEFAULT 'autonomo',
                estado_comando VARCHAR(32) DEFAULT 'PENDIENTE',
                origen_ejecucion VARCHAR(20) DEFAULT 'simulacion',
                zona_objetivo VARCHAR(20) NOT NULL,
                temperatura_disparo FLOAT NOT NULL,
                temperatura_predicha FLOAT NOT NULL,
                fan_state TINYINT(1) NOT NULL,
                servo_angle INT NOT NULL,
                timestamp_decision DOUBLE NOT NULL,
                timestamp_ack DOUBLE DEFAULT NULL,
                latencia_ms FLOAT DEFAULT NULL,
                ack_recibido TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_zona_objetivo (zona_objetivo),
                INDEX idx_created_at (created_at),
                INDEX idx_comando_id (comando_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            """
            CREATE TABLE IF NOT EXISTS metricas_modelo (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                fecha_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
                zona VARCHAR(20) NOT NULL,
                mae FLOAT NOT NULL,
                rmse FLOAT NOT NULL,
                r2 FLOAT NOT NULL,
                muestras_evaluadas INT NOT NULL,
                INDEX idx_metricas_zona (zona, fecha_calculo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
        ]
        alter_columns = [
            "ALTER TABLE control_eventos ADD COLUMN comando_id VARCHAR(64) DEFAULT NULL;",
            "ALTER TABLE control_eventos ADD COLUMN modo_operacion VARCHAR(20) DEFAULT 'autonomo';",
            "ALTER TABLE control_eventos ADD COLUMN estado_comando VARCHAR(32) DEFAULT 'PENDIENTE';",
            "ALTER TABLE control_eventos ADD COLUMN origen_ejecucion VARCHAR(20) DEFAULT 'simulacion';"
        ]
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            for q in queries:
                cursor.execute(q)
            for alt in alter_columns:
                try:
                    cursor.execute(alt)
                except Error:
                    pass
            conn.commit()
            cursor.close()
            conn.close()
            logger.info("✅ Esquema de tablas MySQL v2.0 verificado.")
        except Error as e:
            logger.error(f"Error verificando tablas: {e}")

    def insertar_registro_termico(self, datos: Dict[str, Any]) -> Optional[int]:
        """Guarda telemetría de sensor con predicción ML y estado de actuadores"""
        sql = """
            INSERT INTO registro_termico 
            (msg_id, zona, temperatura_actual, temperatura_predicha, estado_ventilador, angulo_servo, origen, timestamp_origen)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            origen_val = "real" if datos.get("origen") == "real" else "virtual"
            cursor.execute(sql, (
                datos.get("msg_id"),
                datos.get("zona"),
                datos.get("temperatura_actual"),
                datos.get("temperatura_predicha"),
                datos.get("estado_ventilador", 0),
                datos.get("angulo_servo", 90),
                origen_val,
                datos.get("timestamp_origen", time.time())
            ))
            conn.commit()
            nuevo_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return nuevo_id
        except Error as e:
            logger.error(f"Error insertando registro térmico: {e}")
            return None

    def insertar_evento_control(self, zona: str, temp_disparo: float, temp_pred: float,
                                fan_state: int, servo_angle: int, ts_decision: float,
                                comando_id: Optional[str] = None,
                                modo_operacion: str = "autonomo",
                                origen_ejecucion: str = "simulacion") -> Optional[int]:
        """Registra la emisión de una orden de control hacia el simulador o hardware"""
        sql = """
            INSERT INTO control_eventos 
            (comando_id, modo_operacion, estado_comando, origen_ejecucion, zona_objetivo,
             temperatura_disparo, temperatura_predicha, fan_state, servo_angle, timestamp_decision, ack_recibido)
            VALUES (%s, %s, 'PENDIENTE', %s, %s, %s, %s, %s, %s, %s, 0)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, (
                comando_id, modo_operacion, origen_ejecucion,
                zona, temp_disparo, temp_pred, fan_state, servo_angle, ts_decision
            ))
            conn.commit()
            evento_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return evento_id
        except Error as e:
            logger.error(f"Error insertando evento de control: {e}")
            return None

    def registrar_ack_control(self, zona: str, fan_state: int, servo_angle: int,
                              ts_decision: float, ts_ack: float,
                              comando_id: Optional[str] = None,
                              latencia_medida_ms: Optional[float] = None,
                              estado_comando: str = "EJECUTADO_SIMULACION",
                              origen_ack: str = "simulacion") -> bool:
        """Actualiza el evento de control con el timestamp de confirmación y la latencia real medida"""
        if latencia_medida_ms is not None and latencia_medida_ms > 0:
            latencia_ms = round(float(latencia_medida_ms), 2)
        else:
            delta_calc = (ts_ack - ts_decision) * 1000.0
            latencia_ms = round(delta_calc, 2) if 0 < delta_calc < 60000 else None

        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if comando_id:
                sql = """
                    UPDATE control_eventos 
                    SET timestamp_ack = %s, latencia_ms = %s, ack_recibido = 1,
                        estado_comando = %s, origen_ejecucion = %s
                    WHERE comando_id = %s
                    LIMIT 1
                """
                cursor.execute(sql, (ts_ack, latencia_ms, estado_comando, origen_ack, comando_id))
                if cursor.rowcount == 0:
                    sql_fallback = """
                        UPDATE control_eventos 
                        SET timestamp_ack = %s, latencia_ms = %s, ack_recibido = 1,
                            estado_comando = %s, origen_ejecucion = %s
                        WHERE zona_objetivo = %s AND ack_recibido = 0
                        ORDER BY id DESC LIMIT 1
                    """
                    cursor.execute(sql_fallback, (ts_ack, latencia_ms, estado_comando, origen_ack, zona))
            else:
                sql = """
                    UPDATE control_eventos 
                    SET timestamp_ack = %s, latencia_ms = %s, ack_recibido = 1,
                        estado_comando = %s, origen_ejecucion = %s
                    WHERE zona_objetivo = %s AND ack_recibido = 0
                    ORDER BY id DESC LIMIT 1
                """
                cursor.execute(sql, (ts_ack, latencia_ms, estado_comando, origen_ack, zona))

            conn.commit()
            actualizados = cursor.rowcount
            cursor.close()
            conn.close()
            return actualizados > 0
        except Error as e:
            logger.error(f"Error actualizando ACK de control: {e}")
            return False

    def marcar_comandos_expirados(self, timeout_segundos: float = 10.0) -> int:
        """Marca como TIMEOUT aquellos comandos pendientes que superaron el tiempo máximo sin ACK"""
        umbral_ts = time.time() - timeout_segundos
        sql = """
            UPDATE control_eventos
            SET estado_comando = 'TIMEOUT'
            WHERE ack_recibido = 0 AND estado_comando = 'PENDIENTE' AND timestamp_decision < %s
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, (umbral_ts,))
            conn.commit()
            afectados = cursor.rowcount
            cursor.close()
            conn.close()
            return afectados
        except Error:
            return 0

    def obtener_telemetria_actual(self, origen: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retorna el último valor registrado para cada una de las 5 zonas"""
        filtro_origen = "WHERE origen = %s" if origen else ""
        sql = f"""
            SELECT r.id, r.msg_id, r.zona, r.temperatura_actual, r.temperatura_predicha, 
                   r.estado_ventilador, r.angulo_servo, r.origen, r.timestamp_origen, r.timestamp
            FROM registro_termico r
            INNER JOIN (
                SELECT zona, MAX(id) as max_id
                FROM registro_termico
                {filtro_origen}
                GROUP BY zona
            ) ult ON r.id = ult.max_id
            ORDER BY r.zona ASC
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, (origen,) if origen else ())
            filas = cursor.fetchall()
            cursor.close()
            conn.close()
            for f in filas:
                if f.get("timestamp"):
                    f["timestamp"] = str(f["timestamp"])
            return filas
        except Error as e:
            logger.error(f"Error obteniendo telemetría actual: {e}")
            return []

    def obtener_historial_zona(self, zona: Optional[str] = None, limit: int = 60,
                               origen: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retorna series de tiempo para gráficos de temperatura actual vs predicha"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            filtros, params = [], []
            if zona and zona.lower() != "todas":
                filtros.append("zona = %s")
                params.append(zona)
            if origen:
                filtros.append("origen = %s")
                params.append(origen)
            where = "WHERE " + " AND ".join(filtros) if filtros else ""
            cursor.execute(f"""
                SELECT id, msg_id, zona, temperatura_actual, temperatura_predicha,
                       estado_ventilador, angulo_servo, origen, timestamp_origen, timestamp
                FROM registro_termico
                {where}
                ORDER BY id DESC LIMIT %s
            """, (*params, limit))
            filas = cursor.fetchall()
            cursor.close()
            conn.close()
            filas.reverse()
            for f in filas:
                if f.get("timestamp"):
                    f["timestamp"] = str(f["timestamp"])
            return filas
        except Error as e:
            logger.error(f"Error obteniendo historial: {e}")
            return []

    def obtener_eventos_control(self, limit: int = 25, zona: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retorna el registro reciente de órdenes, su estado de ejecución y latencias medidas"""
        self.marcar_comandos_expirados(timeout_segundos=12.0)
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            if zona and zona.lower() != "todas":
                sql = """
                    SELECT id, comando_id, modo_operacion, estado_comando, origen_ejecucion,
                           zona_objetivo, temperatura_disparo, temperatura_predicha,
                           fan_state, servo_angle, timestamp_decision, timestamp_ack,
                           latencia_ms, ack_recibido, created_at
                    FROM control_eventos
                    WHERE zona_objetivo = %s
                    ORDER BY id DESC LIMIT %s
                """
                cursor.execute(sql, (zona, limit))
            else:
                sql = """
                    SELECT id, comando_id, modo_operacion, estado_comando, origen_ejecucion,
                           zona_objetivo, temperatura_disparo, temperatura_predicha,
                           fan_state, servo_angle, timestamp_decision, timestamp_ack,
                           latencia_ms, ack_recibido, created_at
                    FROM control_eventos
                    ORDER BY id DESC LIMIT %s
                """
                cursor.execute(sql, (limit,))
            filas = cursor.fetchall()
            cursor.close()
            conn.close()
            for f in filas:
                if f.get("created_at"):
                    f["created_at"] = str(f["created_at"])
                if not f.get("estado_comando"):
                    f["estado_comando"] = "EJECUTADO_SIMULACION" if f.get("ack_recibido") == 1 else "PENDIENTE"
                if not f.get("modo_operacion"):
                    f["modo_operacion"] = "autonomo"
                if not f.get("origen_ejecucion"):
                    f["origen_ejecucion"] = "simulacion"
            return filas
        except Error as e:
            logger.error(f"Error obteniendo eventos de control: {e}")
            return []

    def obtener_pares_para_metricas(self, zona: Optional[str] = None, ventana_segundos: int = 600,
                                   tolerancia: int = 30, origen: str = "virtual") -> List[Tuple[float, float]]:
        """
        DIMENSIÓN 2: Busca pares únicos (1 a 1) de (temperatura_predicha en T, temperatura_actual en T + 10 min).
        Evita emparejamientos múltiples usando una ventana estrecha o subconsulta de emparejamiento más cercano.
        """
        pares = []
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            filtro_zona = "AND p.zona = %s" if (zona and zona.lower() != "todas") else ""
            sql = f"""
                WITH predicciones AS (
                    SELECT p.id, p.zona, p.origen, p.temperatura_predicha, p.timestamp
                    FROM registro_termico p
                    WHERE p.origen = %s AND p.temperatura_predicha IS NOT NULL
                      AND p.timestamp <= NOW() - INTERVAL %s SECOND
                      {filtro_zona}
                      AND EXISTS (
                        SELECT 1 FROM registro_termico r
                        WHERE r.zona = p.zona AND r.origen = p.origen
                          AND r.timestamp BETWEEN p.timestamp + INTERVAL %s SECOND
                                              AND p.timestamp + INTERVAL %s SECOND
                      )
                    ORDER BY p.id DESC LIMIT 240
                ), candidatos AS (
                    SELECT p.id AS id_pred, r.id AS id_obs, p.temperatura_predicha AS pred,
                           r.temperatura_actual AS real_val,
                           ABS(TIMESTAMPDIFF(SECOND, p.timestamp, r.timestamp) - %s) AS distancia
                    FROM predicciones p
                    JOIN registro_termico r
                      ON p.zona = r.zona AND p.origen = r.origen
                     AND r.timestamp BETWEEN p.timestamp + INTERVAL %s SECOND
                                         AND p.timestamp + INTERVAL %s SECOND
                ), cercanos AS (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY id_pred ORDER BY distancia, id_obs) AS fila
                    FROM candidatos
                ), unicos AS (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY id_obs ORDER BY distancia, id_pred DESC) AS uso
                    FROM cercanos WHERE fila = 1
                )
                SELECT pred, real_val FROM unicos WHERE uso = 1 ORDER BY id_pred DESC LIMIT 120
            """
            params = [origen, ventana_segundos]
            if filtro_zona:
                params.append(zona)
            minimo, maximo = ventana_segundos - tolerancia, ventana_segundos + tolerancia
            params.extend((minimo, maximo, ventana_segundos, minimo, maximo))

            cursor.execute(sql, tuple(params))
            for fila in cursor.fetchall():
                if fila["pred"] is not None and fila["real_val"] is not None:
                    pares.append((float(fila["pred"]), float(fila["real_val"])))

            cursor.close()
            conn.close()
        except Error as e:
            logger.error(f"Error obteniendo pares para métricas: {e}")
        return pares

    def obtener_resumen_indicadores(self) -> Dict[str, Any]:
        """Calcula el consolidado de las 4 dimensiones de la investigación a partir de datos reales en BD"""
        resumen = {
            "modo_datos": "simulacion",
            "dimension_1": {"intervalo_adquisicion_seg": None, "tasa_entrega_pct": None, "total_mensajes": 0},
            "dimension_2": {"mae": None, "rmse": None, "r2": None, "muestras": 0},
            "dimension_3": {"exactitud_seleccion_pct": None, "latencia_promedio_ms": None, "tasa_ack_pct": None, "total_eventos": 0},
            "dimension_4": {"delta_termico_c": None, "fraccion_tiempo_fan_pct": None, "minutos_fan_on": 0.0}
        }
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)

            # Dimensión 1: Total registros y cálculo de intervalo real sobre timestamp_origen
            cursor.execute("SELECT COUNT(*) AS total FROM registro_termico WHERE origen = 'virtual'")
            res_total = cursor.fetchone()
            total_reg = int(res_total["total"]) if res_total and res_total["total"] else 0
            resumen["dimension_1"]["total_mensajes"] = total_reg

            if total_reg >= 2:
                cursor.execute("""
                    SELECT AVG(dif_seg) AS intervalo_prom, STDDEV_SAMP(dif_seg) AS intervalo_std
                    FROM (
                        SELECT (timestamp_origen - LAG(timestamp_origen) OVER (PARTITION BY zona ORDER BY id)) AS dif_seg
                        FROM (
                            SELECT id, zona, timestamp_origen
                            FROM registro_termico
                            WHERE origen = 'virtual' AND timestamp_origen IS NOT NULL
                            ORDER BY id DESC
                            LIMIT 150
                        ) recientes
                    ) sub
                    WHERE dif_seg IS NOT NULL AND dif_seg >= 1.0 AND dif_seg <= 20.0
                """)
                row_int = cursor.fetchone()
                if row_int and row_int["intervalo_prom"] is not None:
                    resumen["dimension_1"]["intervalo_adquisicion_seg"] = round(float(row_int["intervalo_prom"]), 2)
                    if row_int["intervalo_std"] is not None:
                        resumen["dimension_1"]["desviacion_intervalo_seg"] = round(float(row_int["intervalo_std"]), 3)

            # Dimensión 3: Latencia promedio y tasa de ACKs reales en la BD (sin números mágicos)
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_eventos,
                    SUM(CASE WHEN ack_recibido = 1 THEN 1 ELSE 0 END) as acks_ok,
                    AVG(CASE WHEN ack_recibido = 1 AND latencia_ms IS NOT NULL THEN latencia_ms ELSE NULL END) as lat_prom
                FROM control_eventos
                WHERE origen_ejecucion = 'simulacion'
            """)
            row_ctrl = cursor.fetchone()
            if row_ctrl and row_ctrl["total_eventos"] and int(row_ctrl["total_eventos"]) > 0:
                total_ev = int(row_ctrl["total_eventos"])
                acks = int(row_ctrl["acks_ok"] or 0)
                resumen["dimension_3"]["total_eventos"] = total_ev
                resumen["dimension_3"]["tasa_ack_pct"] = round((acks / total_ev) * 100.0, 1)
                if row_ctrl["lat_prom"] is not None:
                    resumen["dimension_3"]["latencia_promedio_ms"] = round(float(row_ctrl["lat_prom"]), 2)
            # La fracción de lecturas con ventilador activo es una aproximación, no una medición de energía.
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_filas,
                    SUM(CASE WHEN estado_ventilador = 1 THEN 1 ELSE 0 END) as fan_on
                FROM registro_termico
                WHERE origen = 'virtual' AND timestamp >= NOW() - INTERVAL 1 HOUR
            """)
            row_dim4 = cursor.fetchone()
            if row_dim4 and row_dim4["total_filas"] and int(row_dim4["total_filas"]) > 0:
                total_f = float(row_dim4["total_filas"])
                fan_on_count = float(row_dim4["fan_on"] or 0.0)
                fraccion = (fan_on_count / total_f) * 100.0
                resumen["dimension_4"]["fraccion_lecturas_fan_pct"] = round(fraccion, 1)

            cursor.close()
            conn.close()
        except Error as e:
            logger.error(f"Error generando resumen de indicadores: {e}")

        return resumen

    def limpiar_y_sembrar_datos_demo(self) -> bool:
        """
        Reinicia los registros de demostración insertando una serie histórica sintética etiquetada
        para que la sesión de exposición tenga curvas iniciales e historial reproducible.
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            ahora = time.time()
            # Insertar pares sintéticos claramente etiquetados como 'virtual' si hay menos de 10 registros
            cursor.execute("SELECT COUNT(*) FROM registro_termico")
            cnt = cursor.fetchone()[0]
            if cnt < 10:
                semillas = [
                    (1001, "zona1", 30.2, 31.0, 0, 90, "virtual", ahora - 1200),
                    (1002, "zona1", 31.1, 31.8, 0, 90, "virtual", ahora - 600),
                    (1003, "zona1", 31.6, 32.1, 0, 90, "virtual", ahora - 15),
                    (2001, "zona4", 32.4, 34.2, 0, 90, "virtual", ahora - 1200),
                    (2002, "zona4", 34.4, 36.1, 1, 135, "virtual", ahora - 600),
                    (2003, "zona4", 35.8, 36.6, 1, 135, "virtual", ahora - 15),
                ]
                for m_id, z, ta, tp, fv, ang, orig, ts_o in semillas:
                    cursor.execute(
                        """
                        INSERT INTO registro_termico 
                        (msg_id, zona, temperatura_actual, temperatura_predicha, estado_ventilador, angulo_servo, origen, timestamp_origen, timestamp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, FROM_UNIXTIME(%s))
                        """,
                        (m_id, z, ta, tp, fv, ang, orig, ts_o, ts_o)
                    )
                conn.commit()
            cursor.close()
            conn.close()
            return True
        except Error as e:
            logger.error(f"Error sembrando datos demo: {e}")
            return False

db_manager = DatabaseManager()
