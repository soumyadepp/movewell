# AI Physiotherapy Assistant

Camera-based exercise guidance designed for older adults. The app tracks body landmarks from a standard webcam, counts repetitions for common physiotherapy exercises, offers heuristic posture observations, and gives spoken feedback in English or Hindi. All processing happens on the device; video is never recorded or uploaded.

**Live app:** <https://soumyadepp.github.io/physio-assistant/>

> Educational prototype, not a medical device. 2-D webcam pose estimates are approximate and depend on camera placement, lighting and clothing. Exercise selection and range of motion should be agreed with a qualified clinician.

## Features

- **Six counted exercises:** shoulder raise, elbow curl, marching (knee lift), side leg raise, side bend and sit-to-stand, plus a posture observation mode with front and side views.
- **Repetition counting with hysteresis:** a repetition counts only when the measured joint angle passes below a low threshold and then above a high one, so tracking jitter does not double count.
- **Stable feedback:** posture observations are debounced, short tracking dropouts are tolerated, and the live angle readout is smoothed.
- **Spoken feedback:** pre-recorded English and Hindi clips play reliably offline. Counts and target announcements queue, user actions interrupt, and hints never talk over other speech. Browser speech synthesis is a fallback.
- **Accessibility:** adjustable text size, solid high-contrast surfaces (WCAG AA for all text, AAA for body text), large labeled controls, keyboard shortcuts, visible focus, screen-reader live regions, and support for `prefers-contrast` and `prefers-reduced-motion`.
- **Session history:** sessions are saved locally and can be exported as CSV.

## Repository layout

```
physio-assistant/
├── web/                         Web app (Svelte 5, TypeScript, Vite)
│   ├── src/lib/
│   │   ├── domain/              models and geometry (pure)
│   │   ├── analysis/            posture rules, exercise registry, rep counter
│   │   ├── infrastructure/      MediaPipe Tasks, audio playback, storage
│   │   ├── i18n/speech.ts       spoken phrase catalogs (en, hi)
│   │   ├── assistant.ts         application service (session state)
│   │   ├── controller.svelte.ts reactive facade used by components
│   │   └── components/          UI
│   ├── public/voice/            pre-recorded voice clips and manifest
│   └── scripts/                 voice clip generator
├── src/physio_assistant/        Python desktop app (OpenCV window)
│   ├── domain/ analysis/        same core logic as the web app
│   ├── infrastructure/          webcam, MediaPipe, pyttsx3, CSV storage
│   ├── ui/                      dashboard, key commands, frame loop
│   └── cli.py                   entry point and composition root
├── tests/                       Python test suite
└── .github/workflows/           GitHub Pages deployment
```

## Web app

### Requirements

Node.js 20 or later, and a Chromium-based browser or Safari. The camera requires `https://` or `localhost`.

### Run locally

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:5173>, select **Start camera** and allow camera access. Stand 2 to 3 metres from the camera so the full body is in frame.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build to `web/dist` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Type check (svelte-check, tsc) |
| `npm run voice:generate` | Re-record voice clips (macOS only) |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `1` to `7` | Select exercise |
| `V` | Switch front/side view |
| `Space` | Start or pause the session timer |
| `S` | Save session |

## Desktop app (Python)

### Requirements

Python 3.12 and [uv](https://docs.astral.sh/uv/).

### Run

```bash
uv sync --extra voice
uv run physio-assistant
```

Options: `--camera <index>`, `--no-voice`, `--no-mirror`, `--data-file <path.csv>`, `--width`, `--height`.

Keys: `1` posture, `2` shoulder raise, `3` sit-to-stand, `V` view, `Space` timer, `S` save, `H` help, `Q` quit.

The desktop app currently implements the original three modes. The additional exercises, feedback stabilization and recorded voice clips are web-only.

### Standalone build

```bash
uv run --extra voice --group build pyinstaller --noconfirm physio_assistant.spec
```

Produces `dist/Physio Assistant.app` on macOS or `dist/physio-assistant/` elsewhere. The build is unsigned.

## Deployment

The web app is static and can be hosted anywhere.

- **GitHub Pages:** `.github/workflows/deploy-web.yml` runs tests, type checks, builds and publishes on every push to `main`. Set **Settings → Pages → Source** to **GitHub Actions**.
- **Other static hosts:** run `npm run build` and serve `web/dist`. Asset paths are relative, so the app works from any sub-path.

## Architecture

The core logic is framework-free and identical in both apps: pose landmarks are converted to pixel coordinates on a fixed 960 × 720 reference frame, analysed by pure functions, and turned into state changes and semantic events. Rendering, audio and storage sit behind small interfaces.

| Pattern | Where | Purpose |
|---|---|---|
| Registry + Strategy | `MEASURES` in `analysis/exercises.ts`, posture rule sets | Each exercise or view contributes one measurement function |
| Template Method | `RepCounter` / `HysteresisRepCounter` | One counting state machine for every exercise |
| Null Object | `PostureOnlyCounter`, `SilentSpeaker` | Callers never branch on mode or speech availability |
| Observer | `EventBus` with semantic events | Analysis publishes; voice and UI react in their own language |
| Ports and Adapters | `PoseEstimator`, `SessionRepository`, `Speaker` | MediaPipe, storage and audio are replaceable |
| Command | `ui/commands.py` | One binding per keyboard shortcut |
| Facade | `controller.svelte.ts` | Components never touch the camera, model or audio |

## Extending

### Add an exercise (web)

1. Add the mode to `ExerciseMode` and `COUNTED_EXERCISES` in `web/src/lib/domain/models.ts`.
2. Add a measurement function to `MEASURES` in `web/src/lib/analysis/exercises.ts`.
3. Add thresholds to `EXERCISES` in `config.ts`, display copy to `EXERCISE_COPY` in `messages.ts`, and spoken phrases to each catalog in `i18n/speech.ts`.
4. Run `npm test` (it fails if any piece is missing), then `npm run voice:generate`.

### Add a voice language

Add a catalog to `web/src/lib/i18n/speech.ts` with its BCP-47 tag and a macOS `recordingVoice`, then run `npm run voice:generate`. The language option appears automatically, and the test suite checks that every phrase is translated.

### Voice clips

Clips are generated with macOS system voices (`say` and `afconvert`). Only phrases whose text, voice or rate changed are re-recorded. For more natural output, install a Premium or Enhanced voice under **System Settings → Accessibility → Spoken Content → System voice → Manage Voices** and set it as `recordingVoice`.

## Testing

```bash
uv run pytest            # Python
uv run ruff check .      # Python lint
cd web && npm test       # Web unit tests
cd web && npm run check  # Web type check
```

Tests use synthetic poses and a fake clock, so no camera is required.

## Privacy

Pose estimation runs in the browser (MediaPipe Tasks, WebAssembly) or locally in Python. No video, images or landmarks leave the device. Session history and preferences are stored in the browser's local storage or a local CSV file. The web app downloads the MediaPipe runtime and model from public CDNs on first load.
