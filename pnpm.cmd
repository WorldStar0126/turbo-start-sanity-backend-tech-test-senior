@echo off
REM Local shim so tools (e.g. Turborepo) can find pnpm on PATH.
corepack pnpm %*

