@echo off
cd /d "%~dp0"
if not exist "node_modules\parse5" (
 echo First run: installing editor dependencies...
 call npm ci
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
if not exist tmp mkdir tmp
powershell -NoProfile -Command "$nodePath=(Get-Command node.exe).Source; $scriptPath=Join-Path (Get-Location) 'scripts/admin-server.mjs'; $launchArgs=[char]34+$scriptPath+[char]34+' --open'; Start-Process -WindowStyle Hidden -FilePath $nodePath -ArgumentList $launchArgs -WorkingDirectory (Get-Location) -RedirectStandardOutput (Join-Path (Get-Location) 'tmp/admin-output.log') -RedirectStandardError (Join-Path (Get-Location) 'tmp/admin-error.log')"
