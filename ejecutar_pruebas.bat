@echo off
chcp 65001 > nul
cls
echo =========================================================================
echo  EJECUTANDO BATERÍA DE PRUEBAS DEL SISTEMA DE ENFRIAMIENTO IOT
echo =========================================================================
echo.
echo [1/2] Ejecutando pruebas unitarias de Base de Datos, ML y Actuadores...
python tests/test_sistema_completo.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Las pruebas de test_sistema_completo.py fallaron.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Ejecutando pruebas End-to-End con FastAPI y Broker EMQX...
python tests/test_api_y_mqtt_e2e.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Las pruebas de test_api_y_mqtt_e2e.py fallaron.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================================================
echo  ¡TODAS LAS PRUEBAS HAN FINALIZADO SATISFACTORIAMENTE (100%% APROBADAS)!
echo =========================================================================
pause
