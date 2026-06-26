@echo off
REM ==========================================
REM Script para aplicar migraciones a la base de datos
REM ==========================================

echo ========================================
echo APLICANDO MIGRACIONES A LA BASE DE DATOS
echo ========================================
echo.

REM Leer variables de entorno del archivo .env
for /f "tokens=1,2 delims==" %%a in ('type "..\..env" 2^>nul') do (
    if "%%a"=="DB_HOST" set DB_HOST=%%b
    if "%%a"=="DB_PORT" set DB_PORT=%%b
    if "%%a"=="DB_NAME" set DB_NAME=%%b
    if "%%a"=="DB_USER" set DB_USER=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
)

REM Valores por defecto si no se encuentran en .env
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=pacientes_db
if not defined DB_USER set DB_USER=postgres

echo Conectando a: %DB_NAME%@%DB_HOST%:%DB_PORT%
echo Usuario: %DB_USER%
echo.

REM Configurar password para psql
set PGPASSWORD=%DB_PASSWORD%

echo [1/3] Verificando y agregando columnas...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f verificar_y_agregar_columnas.sql

if errorlevel 1 (
    echo.
    echo ❌ ERROR: No se pudo aplicar las migraciones
    echo.
    echo SOLUCIÓN MANUAL:
    echo 1. Abre pgAdmin o tu cliente PostgreSQL favorito
    echo 2. Conecta a la base de datos: %DB_NAME%
    echo 3. Ejecuta el archivo: verificar_y_agregar_columnas.sql
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ MIGRACIONES APLICADAS EXITOSAMENTE
echo ========================================
echo.
echo Las columnas telefono y edad ahora están disponibles.
echo Reinicia el backend si está corriendo.
echo.
pause
