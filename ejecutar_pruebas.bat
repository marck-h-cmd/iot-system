@echo off
chcp 65001 > nul
echo ============================================================================
echo   SMART COOLING IoT 2.0 — SUITE DE PRUEBAS AUTOMATIZADAS (UNITARIAS + E2E)
echo ============================================================================
echo.
echo Copiando suite de pruebas actualizada al contenedor backend...
docker cp tests/test_sistema_completo.py iot-system-backend-1:/app/tests/test_sistema_completo.py
docker cp tests/test_api_y_mqtt_e2e.py iot-system-backend-1:/app/tests/test_api_y_mqtt_e2e.py
echo.
echo [1/2] Ejecutando Pruebas Unitarias y de Base de Datos (test_sistema_completo.py)...
docker exec -e PYTHONPATH=/app iot-system-backend-1 python /app/tests/test_sistema_completo.py
echo.
echo [2/2] Ejecutando Pruebas End-to-End FastAPI + MQTT + Simulador (test_api_y_mqtt_e2e.py)...
docker exec -e PYTHONPATH=/app iot-system-backend-1 python /app/tests/test_api_y_mqtt_e2e.py
echo.
echo ============================================================================
pause
