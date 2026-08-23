#!/usr/bin/env bash
# зачем: переходник на единый светофор .claude/semaphore (см. check.sh).
exec bash "$(dirname "$0")/../semaphore/slot.sh" release
