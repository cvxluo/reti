import { openai } from "./openai.js";
import { toFile } from "openai/uploads";

export type ASRSegment = { start: number; end: number; text: string };
export type ASRResult = {
  transcript: string;
  lang: string;
  segments: ASRSegment[];
};

function extFromMime(mime: string) {
  if (/webm/i.test(mime)) return "webm";
  if (/mp3/i.test(mime) || /mpeg/i.test(mime)) return "mp3";
  if (/wav|x-wav/i.test(mime)) return "wav";
  return "bin";
}

export async function transcribeWithASR(
  buf: Buffer,
  mime: string
): Promise<ASRResult> {
  const file = await toFile(buf, `audio.${extFromMime(mime)}`, { type: mime });

  const r = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  return {
    transcript: r.text ?? "",
    lang: (r as any).language ?? "en",
    segments: [{ start: 0, end: 0, text: r.text ?? "" }],
  };
}
