#!/usr/bin/env sh
# Sincroniza skills da fonte única (.context/skills/) para as pastas lidas por cada agente.
# Edite sempre em .context/skills/ e rode este script. Nunca edite as cópias.
#
# Uso: scripts/sync-skills.sh [skill ...]
#   sem argumentos → sincroniza o grupo de QA (qa, qa-oraculo, qa-pact)
#   ex.: scripts/sync-skills.sh qa qa-pact triage-servico
set -eu

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ORIGEM="$RAIZ/.context/skills"
DESTINOS="$RAIZ/.claude/skills $RAIZ/.cursor/skills"

if [ "$#" -eq 0 ]; then
  set -- qa qa-oraculo qa-pact
fi

for skill in "$@"; do
  if [ ! -f "$ORIGEM/$skill/SKILL.md" ]; then
    echo "skill não encontrada: $ORIGEM/$skill/SKILL.md" >&2
    exit 1
  fi
  for destino in $DESTINOS; do
    mkdir -p "$destino"
    rm -rf "${destino:?}/$skill"
    cp -R "$ORIGEM/$skill" "$destino/$skill"
    echo "sincronizado: $skill -> ${destino#"$RAIZ"/}"
  done
done
