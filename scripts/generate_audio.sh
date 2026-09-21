#!/bin/zsh
set -euo pipefail

APP_DIR="${0:A:h:h}"
AUDIO_DIR="$APP_DIR/audio"
# 収録済み音声はすべて Tingting で生成されている。Sandy などの新しい声は音声データが
# 端末にダウンロードされていないと低品質な代替音になるため、既定は Tingting とする。
VOICE="${HSK_AUDIO_VOICE:-Tingting}"
RATE="${HSK_AUDIO_RATE:-150}"
FORCE="${HSK_AUDIO_FORCE:-0}"
# 配信はAAC 48kbps。WAVのままだと10倍以上の容量になる（docs/audio.md）
BITRATE="${HSK_AUDIO_BITRATE:-48000}"

mkdir -p "$AUDIO_DIR"
cd "$APP_DIR"
generated_count=0

node -e '
  const fs = require("fs");
  for (const level of [1, 2, 3]) {
    const words = JSON.parse(fs.readFileSync(`data/hsk${level}.json`, "utf8"));
    for (const word of words) {
      const spoken = word.hanzi.replaceAll("（", "、").replaceAll("）", "");
      process.stdout.write(`${word.id}\t${spoken}\n`);
    }
  }
' | while IFS=$'\t' read -r word_id spoken_text; do
  output_file="$AUDIO_DIR/$word_id.m4a"
  if [[ "$FORCE" == "1" || ! -s "$output_file" ]]; then
    temp_file="$(mktemp -t hsk-word-audio).wav"
    say -v "$VOICE" -r "$RATE" -o "$temp_file" --file-format=WAVE --data-format=LEI16@44100 "$spoken_text"
    afconvert -f m4af -d aac -b "$BITRATE" "$temp_file" "$output_file"
    rm -f "$temp_file"
  fi
  generated_count=$((generated_count + 1))
  if (( generated_count % 25 == 0 )); then
    echo "$generated_count / 600 語を生成"
  fi
done

echo "音声生成完了: $(find "$AUDIO_DIR" -maxdepth 1 -type f -name '*.m4a' | wc -l | tr -d ' ') 語（$VOICE / AAC ${BITRATE}bps）"
