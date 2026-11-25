@echo off
chcp 65001 > nul
echo ============================================================================
echo   SMART COOLING IoT 2.0 — UNIVERSIDAD NACIONAL DE TRUJILLO (UNT)
echo   Modo operativo configurado en .env
echo ============================================================================
echo.
echo [1/3] Construyendo e iniciando contenedores Docker (EMQX, MySQL, FastAPI, Simulador 5 Zonas, Web)...
docker compose up -d --build
if errorlevel 1 exit /b 1
if exist .env (
  findstr /r /b "NANO_PORT=COM[0-9]" .env > nul && pwsh.exe -NoProfile -File "%~dp0puente_nano.ps1" -EnSegundoPlano
)
echo.
echo [2/3] Verificando estado de los contenedores...
docker compose ps
echo.
echo [3/3] Servicios disponibles:
echo   - Dashboard Web Next.js 2.0 : http://localhost:3000
echo   - Backend FastAPI (Swagger) : http://localhost:8000/docs
echo   - Consola EMQX Broker       : http://localhost:18083 (admin / public123)
echo   - phpMyAdmin MySQL          : http://localhost:8085  (emqx_user / emqx_pass)
echo.
echo Para iniciar la Aplicacion Movil (React Native / Expo):
echo   cd mobile ^&^& npm start
echo ============================================================================
pause
