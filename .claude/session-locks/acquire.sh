#!/usr/bin/env bash
# зачем: переходник на единый светофор .claude/semaphore (см. check.sh).
# acquire.sh <вид> <что именно>  ->  slot.sh acquire "вид: что"
exec bash "$(dirname "$0")/../semaphore/slot.sh" acquire "${1:-работа}: ${2:-}"
