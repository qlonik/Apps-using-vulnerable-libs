#!/usr/bin/env bash

_REASON=${REASON:-'_unknown_'}
_HOST=$(hostname)
_DATE=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
_LorR=$([[ "${_HOST}" = "ZENBOOK" || "${_HOST}" = "moone" ]] && echo "LOCAL" || echo "REMOTE")
_out="../data/logs/$_LorR/$_REASON/$_HOST/$_DATE"

mkdir -p ${_out}
exec {fout}>${_out}/everything.log

echo OUT=${_out}

export FD=${fout}
export OUT=${_out}
export NODE_OPTIONS=--max_old_space_size=16384

node ${NODE_DEBUG_OPTION} lib/bin "$@"
