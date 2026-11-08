@echo off
chcp 65001 > nul
cls
echo =========================================================================
echo  SISTEMA DE ENFRIAMIENTO AUTÓNOMO INTELIGENTE IOT - LABORATORIO UNT
echo =========================================================================
echo.
echo [1/3] Iniciando Backend REST & Modelo de Machine Learning (FastAPI)...
start "Backend FastAPI (Puerto 8000)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Simulador de Zonas Virtuales (PC 3, PC 4, PC 5)...
start "Simulador MQTT de Zonas" cmd /k "cd /d %~dp0simulador && python simulador.py"

timeout /t 2 /nobreak > nul

echo [3/3] Iniciando Dashboard Web React / Next.js (Puerto 3000)...
start "Frontend Next.js (Puerto 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =========================================================================
echo  ¡SISTEMA DESPLEGADO EXITOSAMENTE!
echo  - Dashboard Web:  http://localhost:3000
echo  - API Swagger:    http://localhost:8000/docs
echo  - EMQX Broker:    http://localhost:18083 (admin / public)
echo  - phpMyAdmin:     http://localhost:8085 (emqx_user / emqx_pass)
echo =========================================================================
pause
