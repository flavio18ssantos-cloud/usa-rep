@echo off
REM Instala o instadl num ambiente virtual isolado (Windows / CMD / PowerShell).
cd /d "%~dp0"
where python >nul 2>nul || (echo Python 3 nao encontrado. Instale em https://www.python.org/downloads/ marcando "Add to PATH". & exit /b 1)
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
python -m pip install -e .
echo.
echo Pronto! Para usar:
echo   .venv\Scripts\activate
echo   instadl https://www.instagram.com/p/XXXXXXX/
