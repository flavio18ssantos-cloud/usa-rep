#!/usr/bin/env bash
# Instala o instadl num ambiente virtual isolado (Linux / macOS / WSL / Git Bash).
set -euo pipefail
cd "$(dirname "$0")"

PY=$(command -v python3 || command -v python || true)
if [ -z "$PY" ]; then
  echo "Python 3 não encontrado. Instale em https://www.python.org/downloads/ e rode de novo." >&2
  exit 1
fi

"$PY" -m venv .venv
# shellcheck disable=SC1091
if [ -f .venv/bin/activate ]; then source .venv/bin/activate; else source .venv/Scripts/activate; fi
python -m pip install --upgrade pip >/dev/null
python -m pip install -e .

echo
echo "Pronto! Para usar:"
if [ -f .venv/bin/activate ]; then
  echo "  source .venv/bin/activate"
else
  echo "  source .venv/Scripts/activate"
fi
echo "  instadl https://www.instagram.com/p/XXXXXXX/"
