-- =========================================================================================
-- PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
-- ENTREGABLE: FASE 2 - Esquema de Base de Datos MySQL (init.sql)
-- UNIVERSIDAD: Universidad Nacional de Trujillo
-- =========================================================================================

CREATE DATABASE IF NOT EXISTS `emqx_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `emqx_db`;

-- -----------------------------------------------------------------------------------------
-- 1. TABLA DE USUARIOS MQTT PARA PLUGIN EMQX (emqx_auth_mysql)
-- -----------------------------------------------------------------------------------------
DROP TABLE IF EXISTS `mqtt_user`;
CREATE TABLE `mqtt_user` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password` VARCHAR(100) NOT NULL,
  `salt` VARCHAR(35) DEFAULT NULL,
  `is_superuser` TINYINT(1) DEFAULT 0,
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_mqtt_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserción de credenciales autorizadas en texto plano (auth.mysql.password_hash = plain)
INSERT INTO `mqtt_user` (`username`, `password`, `salt`, `is_superuser`) VALUES
('sensor_iot', 'marck124M', NULL, 0),
('clientel', '1234', NULL, 0),
('backend_admin', 'admin123', NULL, 1)
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);

-- -----------------------------------------------------------------------------------------
-- 2. TABLA DE CONTROL DE ACCESOS MQTT (ACL)
-- -----------------------------------------------------------------------------------------
DROP TABLE IF EXISTS `mqtt_acl`;
CREATE TABLE `mqtt_acl` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `allow` INT(1) DEFAULT 1 COMMENT '0: deny, 1: allow',
  `ipaddr` VARCHAR(60) DEFAULT NULL,
  `username` VARCHAR(100) DEFAULT NULL,
  `clientid` VARCHAR(100) DEFAULT NULL,
  `access` INT(2) NOT NULL COMMENT '1: subscribe, 2: publish, 3: pubsub',
  `topic` VARCHAR(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reglas de acceso granular:
-- sensor_iot: Publica en lab/piloto/+/temp y lab/piloto/ack; se suscribe a lab/piloto/accion
-- backend_admin: PubSub en todos los canales de lab/piloto/#
-- clientel: PubSub en lab/piloto/# y testtopic
INSERT INTO `mqtt_acl` (`allow`, `username`, `access`, `topic`) VALUES
(1, 'sensor_iot', 2, 'lab/piloto/+/temp'),
(1, 'sensor_iot', 2, 'lab/piloto/ack'),
(1, 'sensor_iot', 1, 'lab/piloto/accion'),
(1, 'backend_admin', 3, 'lab/piloto/#'),
(1, 'clientel', 3, 'lab/piloto/#'),
(1, 'clientel', 3, 'testtopic'),
(1, '$all', 3, 'lab/piloto/#');

-- -----------------------------------------------------------------------------------------
-- 3. TABLA PRINCIPAL DE TELEMETRÍA Y REGISTRO TÉRMICO (Dimensión 1, 2 y 4)
-- -----------------------------------------------------------------------------------------
DROP TABLE IF EXISTS `registro_termico`;
CREATE TABLE `registro_termico` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `msg_id` BIGINT DEFAULT NULL COMMENT 'ID secuencial generado en origen',
  `zona` VARCHAR(20) NOT NULL COMMENT 'zona1, zona2, zona3, zona4, zona5',
  `temperatura_actual` FLOAT NOT NULL COMMENT 'Temperatura leída en °C',
  `temperatura_predicha` FLOAT DEFAULT NULL COMMENT 'Predicción del modelo ML para T+10 min',
  `estado_ventilador` TINYINT(1) DEFAULT 0 COMMENT '0: Apagado, 1: Encendido',
  `angulo_servo` INT DEFAULT 90 COMMENT 'Ángulo actual del servomotor (0° - 180°)',
  `origen` ENUM('real', 'virtual') NOT NULL DEFAULT 'real' COMMENT 'real (Nano/ESP32) o virtual (Simulador)',
  `timestamp_origen` DOUBLE DEFAULT NULL COMMENT 'Timestamp epoch en segundos de la adquisición en el nodo',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp de almacenamiento en base de datos',
  PRIMARY KEY (`id`),
  INDEX `idx_zona_timestamp` (`zona`, `timestamp`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_zona` (`zona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------------------
-- 4. TABLA DE EVENTOS DE CONTROL Y MEDICIÓN DE LATENCIA (Dimensión 3: Control y Latencia)
-- -----------------------------------------------------------------------------------------
DROP TABLE IF EXISTS `control_eventos`;
CREATE TABLE `control_eventos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `zona_objetivo` VARCHAR(20) NOT NULL COMMENT 'Zona que superó el umbral térmico (ej. > 35°C)',
  `temperatura_disparo` FLOAT NOT NULL COMMENT 'Temperatura actual que disparó la regla',
  `temperatura_predicha` FLOAT NOT NULL COMMENT 'Temperatura predicha que alertó la acción',
  `fan_state` TINYINT(1) NOT NULL COMMENT '1: Encender ventilador, 0: Apagar',
  `servo_angle` INT NOT NULL COMMENT 'Ángulo asignado a la zona (0°, 90°, 180°)',
  `timestamp_decision` DOUBLE NOT NULL COMMENT 'Timestamp epoch de emisión de la orden en backend Python',
  `timestamp_ack` DOUBLE DEFAULT NULL COMMENT 'Timestamp epoch de retorno del ACK desde Arduino Nano',
  `latencia_ms` FLOAT DEFAULT NULL COMMENT 'Latencia de respuesta en milisegundos: (ack - decision) * 1000',
  `ack_recibido` TINYINT(1) DEFAULT 0 COMMENT '1 si se recibió ACK físico, 0 si pendiente o timeout',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_zona_objetivo` (`zona_objetivo`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------------------
-- 5. TABLA DE REGISTRO HISTÓRICO DE MÉTRICAS ML (Dimensión 2: MAE, RMSE, R²)
-- -----------------------------------------------------------------------------------------
DROP TABLE IF EXISTS `metricas_modelo`;
CREATE TABLE `metricas_modelo` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha_calculo` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `zona` VARCHAR(20) NOT NULL,
  `mae` FLOAT NOT NULL COMMENT 'Mean Absolute Error',
  `rmse` FLOAT NOT NULL COMMENT 'Root Mean Squared Error',
  `r2` FLOAT NOT NULL COMMENT 'Coeficiente de determinación R-cuadrado',
  `muestras_evaluadas` INT NOT NULL COMMENT 'Cantidad de pares (predicho vs real a +10min)',
  PRIMARY KEY (`id`),
  INDEX `idx_metricas_zona` (`zona`, `fecha_calculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------------------
-- 6. DATOS SEMILLA PARA VALIDACIÓN INMEDIATA DEL MODELO PREDICTIVO (OFFSET 10 MINUTOS)
-- -----------------------------------------------------------------------------------------
-- Insertamos registros históricos espaciados hace 15, 10 y 5 minutos para que el endpoint
-- /api/metricas tenga pares válidos de comparación inmediata (T_pred vs T_actual a +10 min).
INSERT INTO `registro_termico` 
(`msg_id`, `zona`, `temperatura_actual`, `temperatura_predicha`, `estado_ventilador`, `angulo_servo`, `origen`, `timestamp_origen`, `timestamp`)
VALUES
-- Zona 1: Hace 20 minutos (Predijo 33.8)
(1001, 'zona1', 31.5, 33.8, 0, 90, 'real', UNIX_TIMESTAMP(NOW() - INTERVAL 20 MINUTE), NOW() - INTERVAL 20 MINUTE),
-- Zona 1: Hace 10 minutos (La realidad fue 34.0 -> error absoluto de 0.2°C con respecto a hace 20m)
(1002, 'zona1', 34.0, 35.2, 0, 90, 'real', UNIX_TIMESTAMP(NOW() - INTERVAL 10 MINUTE), NOW() - INTERVAL 10 MINUTE),
-- Zona 1: Hace 0 minutos (La realidad fue 35.5 -> error de 0.3°C con respecto a la predicción de hace 10m)
(1003, 'zona1', 35.5, 36.1, 1, 0, 'real', UNIX_TIMESTAMP(NOW()), NOW()),

-- Zona 4: Hace 20 minutos
(2001, 'zona4', 32.0, 34.1, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 20 MINUTE), NOW() - INTERVAL 20 MINUTE),
-- Zona 4: Hace 10 minutos (Realidad 34.3)
(2002, 'zona4', 34.3, 36.0, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 10 MINUTE), NOW() - INTERVAL 10 MINUTE),
-- Zona 4: Hace 0 minutos (Realidad 36.2)
(2003, 'zona4', 36.2, 37.0, 1, 180, 'virtual', UNIX_TIMESTAMP(NOW()), NOW());
