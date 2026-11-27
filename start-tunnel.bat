@echo off
title Smart Cooling - Tunel Ngrok para App Movil
cls
echo ==============================================================
echo    SMART COOLING - TUNEL NGROK PARA APP MOVIL
echo ==============================================================
echo Iniciando tunel seguro hacia el Broker EMQX (Puerto 8083)...
echo.
echo Recuerda tener corriendo Docker Desktop con "docker compose up -d"
echo.
echo 1. Copia el dominio que aparece abajo en "Forwarding":
echo    Ejemplo: abc-123.ngrok-free.app
echo 2. Pegalo en la App Movil en: Configuracion - Host
echo ==============================================================
echo.

if exist "C:\ngrok\ngrok.exe" (
    "C:\ngrok\ngrok.exe" http 8083
) else (
    ngrok http 8083
)
pause
