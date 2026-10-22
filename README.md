# Orbit Studio

A complete browser-local creator editor built around the original Three.js ring-escape animation.

## Start

From this project folder, run:

    python -m http.server 8766 --bind 127.0.0.1

Open http://127.0.0.1:8766/ for the home page. Choose Ring Escape to open the editor at http://127.0.0.1:8766/studio.html?animation=ring-escape. The app uses JavaScript modules, so it needs a web server instead of opening index.html directly. No build or dependency installation is required.

## Animation library

The home page introduces Orbit Studio with a live Ring Escape demo, selectable demo colors, animation filters, a creation guide, and common questions. Only Ring Escape is available; the other cards are clearly labeled concept previews.

`animations.js` is the animation catalog. Add an entry with a unique ID, name, artwork, category, description, and status. Mark a mode `available` and give it an `href` only after its editor works. Planned modes do not link to the Ring Escape editor. Home preview colors never overwrite saved editor settings.

The original editor lives in `studio.html`; its controls, audio, local presets, and exports use the existing modules. The logo and Animations link return to the home page.

## Create a video

1. **Scene:** choose a color theme or edit individual colors, add a title and handle, and adjust the counter, trail, particles, glow, and ring thickness.
2. **Motion:** control ball speed and size, ring rotation speed and direction, shrink speed, ring count, gap width, gravity, bounce response, and rotation reversal on escape. Motion edits replay the same seed to keep the collision and sound timelines consistent.
3. **Audio:** click Enable audio to monitor the preview. Choose an original, traditional, or classical melody, import MIDI, select an instrument, and choose whether notes follow bounces, ring escapes, or both. Upload a bounce sample or background track. Set separate volume levels and reverb.
4. **Export:** choose 5–120 seconds, 30/60 fps, 720p/1080p, and MP4 or WebM. On smaller screens, the top Export video button opens the export settings. The rendered video includes audio when its audio switch is enabled, regardless of whether preview monitoring is muted.

Replay repeats the current seed. New scenario chooses a new seed. Find an ending searches up to 96 candidates in a Web Worker for a natural escape near the chosen duration. Custom physics can make a close match unavailable; the app reports the best result rather than forcing an escape.

Safe-zone guides and editor controls are excluded from exports. Save a still downloads a PNG of the artboard.

Choose 1–12 colors in Scene. Turn off **Blend colors into a gradient** for equal bands: 50 rings and five colors gives ten rings per color, from inner to outer. When the division is uneven, the displayed counts show how the extra rings are assigned. Existing two-color presets load automatically.

Motion includes **Stop shrinking after** (zero means no time limit) and **Minimum inner radius**. The time limit permanently ends contraction at that video timestamp. The radius limit pauses contraction while the ball is inside the smallest ring, then allows contraction again after it escapes. Narrow gaps or larger balls can require a larger minimum to keep the opening playable; the editor shows the effective limit.

Preview and export seek the same absolute timeline, including when sound monitoring is enabled. Preview rendering adapts to the displayed size with supersampling and smoother ring geometry. Exports and PNG snapshots explicitly render at their output resolution. The former escape ending card is removed.

Ball speed stays constant throughout playback and export: 1× is 700 canvas pixels per second, scaled only by the Ball speed control. Gravity bends the direction of travel, and Bounce response changes the rebound angle. Neither gravity, shrinking walls, nor collisions reduce or increase the selected speed.

## Audio synchronization

The simulation advances at 240 fixed steps per second and records time-stamped bounce and ring-escape events. Visual simulation and sound preparation use identical physics, parameters, and seed. Melody and effects are scheduled on that event timeline with OfflineAudioContext. Live monitoring uses the audio clock as its playback reference. Export draws explicit timestamped frames and muxes them with the rendered soundtrack.

Built-in instruments are synthesized. Imported MIDI files supply a note sequence; collision timing determines when its notes play. Imported bounce sounds play from their beginning for up to two seconds per impact. Background audio starts at the beginning and loops to the video length. This version does not transcribe MP3 recordings into MIDI or automatically slice a song into notes.

## Local storage

The current project automatically saves to localStorage. Named presets can be saved and reopened under Saved. Uploaded audio is stored in IndexedDB. Settings and MIDI notes can be exported/imported as project JSON; the JSON does not embed audio files. Upload those sounds again if moving a project to a different browser or device. Recent finished videos stay available during the current session, with up to four retained files.

All editing, sound generation, and encoding run locally. This version is a local creator app; hosted accounts, payment processing, and cloud synchronization are not configured.

## Export and compatibility

Mediabunny provides frame-by-frame encoding and muxing. MP4 uses H.264/AVC and AAC; WebM uses VP9 and Opus. The local AAC encoder extension supplies AAC when the browser does not provide it natively. Use a current Chrome or Edge for the broadest WebCodecs support. An unsupported encoder produces an error instead of silently dropping audio or relabeling a different container. Larger exports require more processing time and memory on the user's device. Cancelling restores the live preview.

## Validation

Run `npm test` with Node.js installed. The tests cover deterministic physics, collision timestamps, audio-event agreement, rotation and shrink controls, boundary settings, MIDI parsing, and invalid project input.

Browser verification pages in work/ check actual MP4/AAC and WebM/Opus tracks, durations, frame counts, audible output, cancellation, 1080×1920 output, and custom audio storage/mixing. In the development check, the first decoded MP4 sound appeared about 6.2 ms after its collision event (below one video frame at 30 or 60 fps). This measures the tested file, not a guarantee for every imported recording or device.

## Files and libraries

- `studio.js`: project state, controls, preview synchronization, local library, export UI.
- `simulation.js`: deterministic ring physics and collision events.
- `renderer.js`: the configurable Three.js renderer.
- `audio.js`: note mapping, instruments, samples, background track, offline audio, preview clock.
- `midi.js`: MIDI format 0/1 note and tempo parser.
- `exporter.js`: WebCodecs exports through Mediabunny.
- `scenario.worker.js`: background candidate search.
- `storage.js`: local project and audio persistence.
- `config.js`: defaults, limits, and project validation.
- `ui.js`, `index.html`, `styles.css`: responsive interface.

Third-party libraries are bundled locally with their license files: Three.js 0.186.1 (MIT), Mediabunny 1.62.0 (MPL-2.0), and @mediabunny/aac-encoder 1.62.0 (MPL-2.0; includes an FFmpeg AAC build). Upstream sources: https://threejs.org/ and https://github.com/Vanilagy/mediabunny. The original minimal app is backed up under work/before-studio/.


