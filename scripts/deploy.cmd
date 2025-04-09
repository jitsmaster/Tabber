@echo off
REM Tabber VS Code Extension Deployment Script (Windows)
REM 
REM This is a Windows batch wrapper around the Node.js deployment script.
REM It provides an executable alternative for developers who prefer batch files.
REM
REM Usage: deploy.cmd [options]
REM Run deploy.cmd --help for more information.

REM Move to the project root directory
cd /d "%~dp0\.."

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
	echo Error: Node.js is not installed or not in PATH
	echo Please install Node.js from https://nodejs.org/
	exit /b 1
)

REM Run the deployment script with all provided arguments
node ./scripts/deploy.js %*