#!/bin/zsh
set -euo pipefail

APP_DIR="${0:A:h:h}"
AUDIO_DIR="$APP_DIR/audio"
# 収録済み音声はすべて Tingting で生成されている。Sandy などの新しい声は音声データが
# 端末にダウンロードされていないと低品質な代替音になるため、既定は Tingting とする。
VOICE="${HSK_AUDIO_VOICE:-Tingting}"
RATE="${HSK_AUDIO_RATE:-150}"
FORCE="${HSK_AUDIO_FORCE:-0}"

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
  output_file="$AUDIO_DIR/$word_id.wav"
  if [[ "$FORCE" == "1" || ! -s "$output_file" ]]; then
    say -v "$VOICE" -r "$RATE" -o "$output_file" --file-format=WAVE --data-format=LEI16@44100 "$spoken_text"
  fi
  generated_count=$((generated_count + 1))
  if (( generated_count % 25 == 0 )); then
    echo "$generated_count / 600 語を生成"
  fi
done

echo "音声生成完了: $(find "$AUDIO_DIR" -type f -name '*.wav' | wc -l | tr -d ' ') 語（$VOICE / 44.1kHz）"
