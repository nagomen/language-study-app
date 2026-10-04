export function parseDialogue(text) {
  const segments = [];
  const pattern = /([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] === "问") segments.push({ role: "cue", text: "Question" });
    const role = match[1] === "男" ? "male" : match[1] === "女" ? "female" : "narrator";
    segments.push({ role, text: match[2].trim() });
  }
  return segments;
}
