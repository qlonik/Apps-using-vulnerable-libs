#!/usr/bin/env bash

_REASON=${REASON:-'_unknown_'}
_HOST=$(hostname)
_DATE=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

## no spaces allowed in host names
_LOCAL_HOSTS=("ZENBOOK" "moone")
_REMOTE_HOSTS=("gi" "tick0" "tick1" "tick2" "tick3" "tick4" "tick5" "tick6" "click0")
_LorR=''
if [[ " ${_LOCAL_HOSTS[@]} " =~ " ${_HOST} " ]]; then
  _LorR="LOCAL"
elif [[ " ${_REMOTE_HOSTS[@]} " =~ " ${_HOST} " ]]; then
  _LorR="REMOTE"
else
  _LorR="OTHER"
fi

_out="./data/logs/$_LorR/$_REASON/$_HOST/$_DATE"
log_file="everything.log"

mkdir -p ${_out}
exec {fout}>${_out}/${log_file}

echo OUT=${_out}

export FD=${fout}
export OUT=${_out}
export NODE_OPTIONS=--max_old_space_size=16384

node ${NODE_DEBUG_OPTION} lib/cli "$@"
