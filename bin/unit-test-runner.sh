#!/usr/bin/env bash

_out=../data/logs-test

mkdir -p ${_out}
exec {fout}>${_out}/everything.log

export OUT=${_out}
export FD=${fout}

npx -n "${NODE_DEBUG_OPTION}" ava "$@"
