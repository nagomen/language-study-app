#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
node "$SCRIPT_DIR/generate_sentence_audio.mjs"
