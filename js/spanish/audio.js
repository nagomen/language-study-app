// spanish.js から機能ごとに切り出したモジュール。
export function speakSpanish(text, button) {
  if (!text || !("speechSynthesis" in window)) {
    window.alert("このブラウザでは音声読み上げを利用できません。");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ["Mónica", "Monica", "Jorge", "Paulina", "Marisol"];
  utterance.voice = preferredNames.map((name) => voices.find((voice) => voice.name.includes(name) && voice.lang.startsWith("es"))).find(Boolean)
    || voices.find((voice) => voice.lang.toLowerCase() === "es-es")
    || voices.find((voice) => voice.lang.toLowerCase().startsWith("es"))
    || null;
  utterance.lang = utterance.voice?.lang || "es-ES";
  utterance.rate = 0.88;
  button?.classList.add("is-playing");
  utterance.onend = utterance.onerror = () => button?.classList.remove("is-playing");
  window.speechSynthesis.speak(utterance);
}
