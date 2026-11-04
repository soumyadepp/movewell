/**
 * Records every spoken phrase as an AAC clip using macOS system voices.
 *
 * Run with `npm run voice:generate` after changing src/lib/i18n/speech.ts.
 * Output: public/voice/<lang>/<key>.m4a plus public/voice/manifest.json.
 * Unchanged phrases are skipped using a text hash stored in the manifest.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { phraseTable, SPEECH_CATALOGS, VOICE_LANGUAGES, type VoiceLanguage } from "../src/lib/i18n/speech";

interface Manifest {
  languages: Partial<Record<VoiceLanguage, string[]>>;
  hashes: Record<string, string>;
}

const root = join(import.meta.dirname, "..", "public", "voice");
const manifestPath = join(root, "manifest.json");
const previous: Manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { languages: {}, hashes: {} };
const next: Manifest = { languages: {}, hashes: {} };
const scratch = join(tmpdir(), "physio-voice.aiff");

function installedVoices(): string {
  return execFileSync("say", ["-v", "?"], { encoding: "utf8" });
}

const voices = installedVoices();
let recorded = 0;
let skipped = 0;

for (const language of VOICE_LANGUAGES) {
  const catalog = SPEECH_CATALOGS[language];
  if (!voices.split("\n").some((line) => line.startsWith(catalog.recordingVoice))) {
    console.warn(`Skipping ${language}: macOS voice "${catalog.recordingVoice}" is not installed.`);
    continue;
  }
  const dir = join(root, language);
  mkdirSync(dir, { recursive: true });
  const keys: string[] = [];
  for (const [key, text] of phraseTable(catalog)) {
    const id = `${language}/${key}`;
    const hash = createHash("sha1").update(`${catalog.recordingVoice}|${catalog.recordingRate}|${text}`).digest("hex");
    const out = join(dir, `${key}.m4a`);
    if (previous.hashes[id] !== hash || !existsSync(out)) {
      execFileSync("say", ["-v", catalog.recordingVoice, "-r", String(catalog.recordingRate), "-o", scratch, text]);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", scratch, out]);
      recorded++;
    } else {
      skipped++;
    }
    keys.push(key);
    next.hashes[id] = hash;
  }
  next.languages[language] = keys;
}

rmSync(scratch, { force: true });
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Voice clips: ${recorded} recorded, ${skipped} unchanged. Manifest: ${manifestPath}`);
