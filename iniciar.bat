@echo off
title SistemaDepreciacion

echo Iniciando SistemaDepreciacion...
echo.

start "Identity Service" cmd /k "cd /d C:\Proyectos\SistemaDepreciacion\backend\IndentityService && dotnet run"

start "Asset Service" cmd /k "cd /d C:\Proyectos\SistemaDepreciacion\backend\AssetService && dotnet run"

start "Depreciation Service" cmd /k "cd /d C:\Proyectos\SistemaDepreciacion\backend\DepreciationService && dotnet run"

start "API Gateway" cmd /k "cd /d C:\Proyectos\SistemaDepreciacion\backend\ApiGateway && dotnet run"

timeout /t 5 /nobreak >nul

start "Frontend React" cmd /k "cd /d C:\Proyectos\SistemaDepreciacion\frontend\depreciation-web && npm run dev"

echo.
echo Sistema iniciado.
echo.
echo Identity Service:      http://localhost:5028
echo Asset Service:         http://localhost:5005
echo Depreciation Service:  http://localhost:5045
echo API Gateway:           http://localhost:5000
echo Frontend:              http://localhost:5173
echo.

pause