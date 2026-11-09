-- =========================================================================================
-- PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT) 2.0
-- ESQUEMA DE BASE DE DATOS MYSQL (init.sql)
-- UNIVERSIDAD: Universidad Nacional de Trujillo
-- =========================================================================================

CREATE DATABASE IF NOT EXISTS `emqx_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `emqx_db`;

-- 1. TABLA DE USUARIOS MQTT
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

INSERT INTO `mqtt_user` (`username`, `password`, `salt`, `is_superuser`) VALUES
('sensor_iot', 'marck124M', NULL, 0),
('clientel', '1234', NULL, 0),
('backend_admin', 'admin123', NULL, 1)
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);

-- 2. TABLA DE CONTROL DE ACCESOS MQTT (ACL)
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

INSERT INTO `mqtt_acl` (`allow`, `username`, `access`, `topic`) VALUES
(1, 'sensor_iot', 2, 'lab/piloto/+/temp'),
(1, 'sensor_iot', 2, 'lab/piloto/ack'),
(1, 'sensor_iot', 3, 'lab/piloto/simulador/#'),
(1, 'sensor_iot', 1, 'lab/piloto/accion'),
(1, 'backend_admin', 3, 'lab/piloto/#'),
(1, 'clientel', 1, 'lab/piloto/#');

-- 3. TABLA PRINCIPAL DE TELEMETRÍA Y REGISTRO TÉRMICO
DROP TABLE IF EXISTS `registro_termico`;
CREATE TABLE `registro_termico` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `msg_id` BIGINT DEFAULT NULL COMMENT 'ID secuencial generado en origen',
  `zona` VARCHAR(20) NOT NULL COMMENT 'zona1, zona2, zona3, zona4, zona5',
  `temperatura_actual` FLOAT NOT NULL COMMENT 'Temperatura leída en °C',
  `temperatura_predicha` FLOAT DEFAULT NULL COMMENT 'Predicción del modelo ML para T+10 min',
  `estado_ventilador` TINYINT(1) DEFAULT 0 COMMENT '0: Apagado, 1: Encendido',
  `angulo_servo` INT DEFAULT 90 COMMENT 'Ángulo actual del servomotor (0° - 180°)',
  `origen` ENUM('real', 'virtual') NOT NULL DEFAULT 'virtual' COMMENT 'virtual (Modo Simulación) o real (Hardware)',
  `timestamp_origen` DOUBLE DEFAULT NULL COMMENT 'Timestamp epoch en segundos de la adquisición',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp de almacenamiento en base de datos',
  PRIMARY KEY (`id`),
  INDEX `idx_zona_timestamp` (`zona`, `timestamp`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_zona` (`zona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE EVENTOS DE CONTROL Y MEDICIÓN DE LATENCIA CORRELACIONADA
DROP TABLE IF EXISTS `control_eventos`;
CREATE TABLE `control_eventos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `comando_id` VARCHAR(64) DEFAULT NULL COMMENT 'Identificador único correlacionado con el ACK',
  `modo_operacion` VARCHAR(20) DEFAULT 'autonomo' COMMENT 'autonomo o manual',
  `estado_comando` VARCHAR(32) DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE, EJECUTADO_SIMULACION, TIMEOUT, ERROR',
  `origen_ejecucion` VARCHAR(20) DEFAULT 'simulacion' COMMENT 'simulacion o hardware_real',
  `zona_objetivo` VARCHAR(20) NOT NULL COMMENT 'Zona objetivo del comando',
  `temperatura_disparo` FLOAT NOT NULL COMMENT 'Temperatura actual al momento del comando',
  `temperatura_predicha` FLOAT NOT NULL COMMENT 'Temperatura predicha a +10m',
  `fan_state` TINYINT(1) NOT NULL COMMENT '1: Encender ventilador, 0: Apagar',
  `servo_angle` INT NOT NULL COMMENT 'Ángulo asignado (0°, 45°, 90°, 135°, 180°)',
  `timestamp_decision` DOUBLE NOT NULL COMMENT 'Timestamp epoch de emisión en FastAPI',
  `timestamp_ack` DOUBLE DEFAULT NULL COMMENT 'Timestamp epoch de retorno del ACK',
  `latencia_ms` FLOAT DEFAULT NULL COMMENT 'Latencia medida en milisegundos: (ack - decision) * 1000',
  `ack_recibido` TINYINT(1) DEFAULT 0 COMMENT '1 si recibió ACK, 0 si pendiente o timeout',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_zona_objetivo` (`zona_objetivo`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_comando_id` (`comando_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA DE REGISTRO HISTÓRICO DE MÉTRICAS ML
DROP TABLE IF EXISTS `metricas_modelo`;
CREATE TABLE `metricas_modelo` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha_calculo` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `zona` VARCHAR(20) NOT NULL,
  `mae` FLOAT NOT NULL,
  `rmse` FLOAT NOT NULL,
  `r2` FLOAT NOT NULL,
  `muestras_evaluadas` INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_metricas_zona` (`zona`, `fecha_calculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. DATOS HISTÓRICOS SINTÉTICOS DE DEMOSTRACIÓN (ETIQUETADOS COMO 'virtual')
INSERT INTO `registro_termico` 
(`msg_id`, `zona`, `temperatura_actual`, `temperatura_predicha`, `estado_ventilador`, `angulo_servo`, `origen`, `timestamp_origen`, `timestamp`)
VALUES
(1001, 'zona1', 30.2, 31.0, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 20 MINUTE), NOW() - INTERVAL 20 MINUTE),
(1002, 'zona1', 31.1, 31.9, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 10 MINUTE), NOW() - INTERVAL 10 MINUTE),
(1003, 'zona1', 31.7, 32.3, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW()), NOW()),
(2001, 'zona4', 32.4, 34.3, 0, 90, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 20 MINUTE), NOW() - INTERVAL 20 MINUTE),
(2002, 'zona4', 34.5, 36.1, 1, 135, 'virtual', UNIX_TIMESTAMP(NOW() - INTERVAL 10 MINUTE), NOW() - INTERVAL 10 MINUTE),
(2003, 'zona4', 35.9, 36.7, 1, 135, 'virtual', UNIX_TIMESTAMP(NOW()), NOW());
