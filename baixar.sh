#!/usr/bin/env bash
# Atalho: ./baixar.sh <link> [mais links...]  -> salva em ./downloads
cd "$(dirname "$0")"
if [ -f .venv/bin/activate ]; then source .venv/bin/activate; elif [ -f .venv/Scripts/activate ]; then source .venv/Scripts/activate; fi
exec python -m instadl "$@"
