@echo off
title WTOKENS - Master Server & Bot Discord
color 0b
echo ========================================================
echo        ⚡ WTOKENS PLATAFORMA COMPETITIVA (LATAM)       
echo    Base de Datos + API REST + Bot Discord + Frontend   
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Verificando dependencias del backend...
if not exist "backend\node_modules" (
    echo Instalando modulos necesarios...
    cd backend
    npm install
    cd ..
)

echo [2/2] Iniciando Master Server (Puerto 4000)...
echo.
echo 👉 Web Oficial: http://localhost:4000
echo 👉 Base de datos SQLite: backend\data\wtokens.db
echo 👉 Comandos de Discord registrados en vivo.
echo.
echo Presiona Ctrl + C para detener el servidor.
echo ========================================================
node backend/server.js
pause
