@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title StreamPulse — Local Dev

echo.
echo  ===================================
echo   StreamPulse — Local Development
echo  ===================================
echo.

cd /d "%~dp0"

set "PY="
for %%P in (
  "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
  "C:\Python312\python.exe"
  "C:\Program Files\Python312\python.exe"
  "C:\Program Files (x86)\Python312\python.exe"
) do (
  if not defined PY (
    if exist "%%~P" set "PY=%%~P"
  )
)

if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 (
    for /f "tokens=*" %%V in ('python --version 2^>^&1') do (
      echo %%V | findstr /C:"3.12" >nul 2>&1
      if not errorlevel 1 set "PY=python"
    )
  )
)

if not defined PY (
  echo [ERR] Python 3.12 not found. Please install it from https://python.org
  pause
  exit /b 1
)

echo [OK] Python: !PY!
"!PY!" --version

if not exist ".env" (
  echo [WARN] .env not found — copying from .env.example
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [WARN] Please edit .env and set FERNET_KEY before first run!
    echo        Generate one with:
    echo          python -c "from cryptography.fernet import Fernet; print('FERNET_KEY=' + Fernet.generate_key().decode())"
    echo.
    pause
  ) else (
    echo [ERR] .env.example not found either. Cannot continue.
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo [INFO] Creating virtual environment ...
  "!PY!" -m venv .venv
  if errorlevel 1 (
    echo [ERR] Failed to create .venv
    pause
    exit /b 1
  )
)

echo [INFO] Activating .venv ...
call ".venv\Scripts\activate.bat"
if errorlevel 1 (
  echo [ERR] Failed to activate .venv
  pause
  exit /b 1
)

python -c "import fastapi, uvicorn, sqlalchemy, aiosqlite, alembic, celery, redis, pydantic, pydantic_settings, jose, passlib, bcrypt, cryptography, httpx, jinja2, multipart, websockets, email_validator" >nul 2>&1
if errorlevel 1 (
  echo [INFO] Installing missing dependencies from requirements-local.txt ...
  python -m pip install -r requirements-local.txt
  if errorlevel 1 (
    echo [ERR] pip install failed. Check your internet connection.
    pause
    exit /b 1
  )
)

python generate_keys.py --write
if errorlevel 1 (
  echo [ERR] Could not configure application keys.
  pause
  exit /b 1
)

echo.
echo [START] Launching StreamPulse on http://localhost:8000
echo         Press Ctrl+C to stop.
echo.
python run_local.py

echo.
echo [DONE] StreamPulse stopped.
pause
