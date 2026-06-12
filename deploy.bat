@echo off
echo.
echo  Enviando alteracoes para o GitHub...
echo.

git add .

set /p msg="Descricao da mudanca: "

git commit -m "%msg%"
git push

echo.
echo  Pronto! GitHub Pages atualiza em ~1 minuto.
echo  https://mikaeljonshon.github.io/english-essential/
echo.
pause
