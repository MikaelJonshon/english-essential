@echo off
:: Garante que o servidor sempre inicia da pasta raiz do projeto
cd /d "%~dp0"

echo ================================
echo  English Essential - Servidor
echo ================================
echo  Pasta: %~dp0
echo.

:: Tenta Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Servidor iniciado com Python!
    echo Acesse: http://localhost:3000/
    echo Pressione Ctrl+C para parar.
    echo.
    start "" http://localhost:3000/
    python -m http.server 3000
    goto fim
)

:: Tenta py (launcher do Windows)
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo Servidor iniciado com Python!
    echo Acesse: http://localhost:3000/
    echo Pressione Ctrl+C para parar.
    echo.
    start "" http://localhost:3000/
    py -m http.server 3000
    goto fim
)

:: Tenta Node/npx
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo Servidor iniciado com Node!
    echo Acesse: http://localhost:3000/
    echo Pressione Ctrl+C para parar.
    echo.
    start "" http://localhost:3000/
    npx serve . -p 3000
    goto fim
)

:: Nenhum encontrado
echo ERRO: Python e Node.js nao encontrados.
echo.
echo Instale uma das opcoes abaixo:
echo  - Python: https://www.python.org/downloads/
echo    (marque "Add Python to PATH" na instalacao)
echo  - Node.js: https://nodejs.org
echo.

:fim
pause
