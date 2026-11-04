# AI Physiotherapy Assistant

A camera-based exercise helper designed for older adults. It watches your movement through the webcam, counts repetitions, and gives spoken guidance in English or Hindi. The video never leaves the computer.

> This is an educational prototype, not a medical device.

---

## Part 1: Run the demo (the easy way)

You only need a laptop with a webcam and the Chrome or Edge browser.

### If someone already gave you a link

1. Open the link in **Chrome**.
2. Click **Start camera**.
3. When the browser asks to use the camera, click **Allow**.
4. Step back until you can see yourself from head to feet. That's it!

### If you are running it from this folder

Ask a grown-up to install **Node.js** once, from <https://nodejs.org> (pick the "LTS" button).

Then open the **Terminal** app and type these lines, pressing Enter after each one:

```
cd personal/physio-assistant/web
npm install
npm run dev
```

Now open Chrome and go to **http://localhost:5173**. Next time you only need the last line, `npm run dev`.

To stop it, click the Terminal window and press **Control + C**.

---

## Part 2: Demo script (about 3 minutes)

Use this when you show the app to an audience. One person talks, one person does the exercises.

| Step | Do this | Say this |
|---|---|---|
| 1 | Show the start screen. | "This app helps older people do their physiotherapy exercises at home, using just a laptop camera." |
| 2 | Click **Start camera** and step back. | "The video stays on this computer. Nothing is uploaded." |
| 3 | Point at the lines on your body. | "The app finds 33 points on the body, like shoulders, elbows and knees." |
| 4 | Click **Shoulder raise**. Raise both arms slowly 3 times. | "It measures the shoulder angle and counts each full raise." Point at the big number. |
| 5 | Click **Text size A++**. | "Older eyes need bigger text, so you can make everything larger." |
| 6 | Click **हिन्दी** under Voice language, then do one more raise. | "It can speak in Hindi too." |
| 7 | Click **Elbow curl** and bend both elbows 3 times. | "There are six exercises chosen for older adults, each measuring a different joint." |
| 8 | Click **Sit-to-stand**, then **Switch view** and stand side-on. Sit down and stand up from a chair twice. | "This one checks the knee angle from the side." |
| 9 | Set the target to **5** and finish the reps. | Let the audience hear the voice say the target is reached. |
| 10 | Click **Save session**. | "Each session is saved, so progress can be tracked over time." |

**The six exercises:** Shoulder raise, Elbow curl, Marching (knee lift), Side leg raise (hold a chair), Side bend, Sit-to-stand. The counter card shows which camera view works best for each one.

**Tips for a smooth demo**

* Use a bright room, and avoid standing in front of a window.
* Wear clothes that are a different colour from the wall behind you.
* If the count stops, look at the **Shoulder angle** number under the counter. Raise your arms higher until it goes above 70°.
* If the Hindi voice is silent, the computer does not have a Hindi voice installed. Switch back to English.

---

## Part 3: Put it on the internet (so anyone can open a link)

The web app is just a folder of files, so it can be hosted for free.

### Option A: Netlify Drop (fastest, no account setup needed to try)

1. In the Terminal: `cd personal/physio-assistant/web` then `npm run build`.
2. Open <https://app.netlify.com/drop>.
3. Drag the **`web/dist`** folder onto the page.
4. You get a link like `https://something.netlify.app`. Share it!

Netlify asks you to sign up (free) to keep the site online for longer than an hour.

### Option B: GitHub Pages (updates by itself)

1. Push this folder to a GitHub repository.
2. On GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` now runs `.github/workflows/deploy-web.yml` and publishes the site at `https://<username>.github.io/<repo>/`.

The camera only works on `https://` links or on `localhost`, and both of these options use `https://`.

---

## Part 4: Desktop version (Python)

The original app, now organized as a proper Python package. It opens its own window instead of a browser tab.

1. Install **uv** once: `brew install uv` (Mac) or see <https://docs.astral.sh/uv/>.
2. Run:

```
cd personal/physio-assistant
uv sync --extra voice
uv run physio-assistant
```

Keys: **1** posture, **2** shoulder raise, **3** sit-to-stand, **V** switch view, **Space** timer, **S** save, **Q** quit.

Options: `--camera 1` to use another camera, `--no-voice` to mute, `--data-file path.csv` to choose where history is saved.

### Build a double-click app

```
uv run --extra voice --group build pyinstaller --noconfirm physio_assistant.spec
```

This creates `dist/Physio Assistant.app` on a Mac (or `dist/physio-assistant/` on Windows and Linux). The app is unsigned, so on a Mac right-click it and choose **Open** the first time.

---

## For developers

### Layout

```
physio-assistant/
├── src/physio_assistant/        Python desktop app
│   ├── domain/                  models + geometry (pure, no I/O)
│   ├── analysis/                posture rules, rep counters, progress
│   ├── infrastructure/          camera, MediaPipe, speech, CSV storage
│   ├── ui/                      OpenCV dashboard, key commands, frame loop
│   ├── assistant.py             application service (session state)
│   └── cli.py                   composition root
├── tests/                       pytest suite (no camera needed)
└── web/                         Svelte 5 + TypeScript web app
    └── src/lib/
        ├── domain/ analysis/    same logic as Python, ported to TS
        ├── infrastructure/      MediaPipe Tasks, Web Speech, localStorage
        ├── i18n/speech.ts       spoken phrases per language (en, hi)
        ├── assistant.ts         application service
        ├── controller.svelte.ts reactive facade for components
        └── components/          UI
```

### Design patterns

| Pattern | Where | Why |
|---|---|---|
| Strategy | posture analyzers per camera view | swap front/side rules without branching |
| Template Method | `HysteresisRepCounter` | every exercise shares the count state machine |
| Null Object | `PostureOnlyCounter`, `SilentSpeaker` | callers never branch on mode or on speech being available |
| Observer | `EventBus` + voice notifier | analysis publishes events; speech and UI react |
| Ports and Adapters | `PoseEstimator`, `SessionRepository`, `Speaker` | MediaPipe, CSV and TTS can be replaced in one place |
| Command | `ui/commands.py` key bindings | one entry per shortcut |
| Factory | `create_counter`, `create_posture_analyzer`, `create_speaker` | one place decides which implementation to use |
| Facade | `controller.svelte.ts` | components never touch the camera or model |

### Tests

```
uv run pytest                 # Python
cd web && npm test            # Web
cd web && npm run check       # Web type check
```

### Voice

Spoken feedback uses **pre-recorded clips** in `web/public/voice/`, so it works offline and sounds the same on every laptop. Browser speech is only a fallback (for example counts above 30).

After changing any spoken phrase or voice in `web/src/lib/i18n/speech.ts`, re-record on a Mac:

```
cd web && npm run voice:generate
```

Only changed phrases are re-recorded. For the most natural sound, first download a **Premium** voice: System Settings → Accessibility → Spoken Content → System voice → Manage Voices, then set its name as `recordingVoice` in `speech.ts`.

### Adding a voice language

Add one catalog to `web/src/lib/i18n/speech.ts` with its BCP-47 tag (for example `ta-IN`) and a macOS `recordingVoice`, then run `npm run voice:generate`. The language button appears automatically, and a test checks that every phrase is translated.

### Adding an exercise

1. Add it to `ExerciseMode` and `COUNTED_EXERCISES` in `web/src/lib/domain/models.ts`.
2. Add a measure function to `MEASURES` in `web/src/lib/analysis/exercises.ts`.
3. Add thresholds in `config.ts`, on-screen copy in `messages.ts` (`EXERCISE_COPY`) and spoken phrases in `i18n/speech.ts`.
4. Run `npm test` (it fails if any of these are missing), then `npm run voice:generate`.
