# Orbit Studio

A browser-local video maker for satisfying vertical animations. Choose an animation, customize its motion and appearance, synchronize collision sounds or melodies, and export a video on your device.

## Run locally

With Node.js 22.12 or newer, run from this folder:

    npm ci
    npm start

Open http://127.0.0.1:8766/. Run `npm run build` to generate the deployable site in `dist/`, then `npm run preview` to check that build locally. Stop the development server first so the preview can use the same port. The site keeps its existing page URLs and stores projects in the browser.

## Available animations

- **Ring Escape:** a ball clears shrinking, rotating rings through their gaps. Customize speed, gravity, gaps, ring count, rotation, shrink limits, particle effects, and 1–12 colors with equal bands or gradients. Duration matching plans the ball’s launch and real rebound directions while preserving the selected ring motion.
- **Growing Ball:** a ball grows after circular-wall bounces. Customize growth, arena size, rainbow colors, trails, and impact rays. Automatic growth fits the circle fill to the chosen duration; manual growth supports free play.
- **Rainbow Crash:** a ball gets larger and faster on each bounce, leaving a persistent rainbow trail. Adjust growth, speed gain, the trail palette, and the blackout finish. The selected duration clips the natural run.
- **Circle Royale:** 2–12 named balls compete in an arena with a rotating gate. Escaping eliminates a ball. The last ball inside earns a crown and confetti. Customize the players, icons, motion, gate timing, and sounds.
- **Spike Melody:** balls stick to the spikes and become bumpers for the next ball. Contacts play notes from a built-in melody or imported MIDI. Customize the gap, spikes, colors, and trail, then see whether a ball escapes.
- **Ball Multiplier:** a single ball starts a chain reaction. Each escape through the rotating gap spawns a configurable batch near the center. Set the ball limit, rotation, gap, colors, and collision sounds. The selected duration ends the run.
- **Timed Escape:** each ball gets a configurable time limit to clear the gap. Failed balls freeze as obstacles, and the first successful escape bursts the ring into particles. Restart and New path give the balls new launches.
- **String Wars:** 2–8 independently moving competitors gain strings on wall bounces and cut opponents’ strings on contact. Customize names, colors, embedded ball icons, string limits, speed, and collisions. Last survivor wins. Optional timed showdown stops replenishment and trims the weakest survivors to finish by 95% of the duration; a natural match may end earlier.

Each animation has its own current-project save. The home page lists only implemented animations.

## Editing and sound

Style, Motion, Audio, and Presets organize the controls. Sliders also accept exact numbers. Opening an animation, restarting, changing ball speed, and each new preview loop generate a fresh random path. Pause/play resumes the current run. The same recorded randomness drives seeking, audio, and video export. Undo/redo retains 50 settings changes. On phones the live preview stays above a scrolling controls panel.

In Ring Escape and Growing Ball, ball speed remains constant at the chosen setting (1× = 700 logical pixels/second). Gravity and bounces change direction. Physics uses a deterministic 240 Hz timeline shared by preview, seeking, collision audio, and export. String Wars detects contact continuously across ball travel and moving strings, including edge and endpoint contact.

Enable audio to monitor the preview. Choose a built-in melody and synthesized instrument, import MIDI, upload an impact sample, or add a looping background track. Notes follow selected bounce/cut/escape events. Separate volume and reverb controls are available. Imported MIDI supplies notes; collision timestamps supply their rhythm. Uploaded music is not automatically transcribed into notes. Impact samples play from their beginning for up to two seconds per contact.

## Export

Choose 5–120 seconds, 30/60 fps, 720p/1080p, and MP4 or WebM. Videos are vertical (9:16). MP4 uses H.264/AAC; WebM uses VP9 (VP8 fallback)/Opus. Enabled project audio is included even when live monitoring is muted. Editor controls and safe-zone guides are excluded. Stills export as PNG.

Encoding uses WebCodecs and runs locally. Current Chrome or Edge offers the broadest support. The bundled AAC extension handles browsers without native AAC encoding. Unsupported codecs produce an error. Long, high-resolution exports need more device memory and processing time. Cancel restores the preview. Recent exports retain up to four videos during the current session.

Duration matching can reject physically infeasible Ring Escape or Growing Ball settings. Adjust the duration/motion, try another seed, or turn matching off for free play.

## Saving

Settings and presets use localStorage; uploaded audio uses IndexedDB. Project JSON contains settings, MIDI notes, and embedded competitor icons, but not uploaded audio files. Upload those sounds again when moving a project to another device. Competitor icons accept PNG/JPEG/WebP up to 2 MB and are cropped locally to 128 px PNGs.

This is a local creator app. Accounts, payments, and cloud synchronization are not configured.

## Checks and structure

Run `npm test` with Node.js installed. Tests cover all eight simulations, seeded motion, fixed-speed invariants, collision timing, string contacts, duration matching, seeking, particle bounds, audio-event selection, storage validation, undo/redo, controls, imports, and cancellation. Ignored browser checks in `work/` exercise actual media encoding and decoding.

    index.html       Entry page for the React animation library
    studio.html      Entry page for the React editor
    src/config.js    Defaults and input validation
    src/home/        React catalog, artwork, live demo, styles
    src/animation/   Eight simulations, renderers, palette, planning worker
    src/studio/      React panels, simulation controller, audio, MIDI, export, storage
    tests/           Automated regression checks
    vendor/          Required bundled libraries and licenses
    work/            Ignored local checks and development files

The interface uses React and builds with Vite. Bundled animation and encoding libraries: Three.js 0.186.1 (MIT), Mediabunny 1.62.0 (MPL-2.0), and @mediabunny/aac-encoder 1.62.0 (MPL-2.0, includes an FFmpeg AAC build). Their licenses are retained in `vendor/`. Upstream: https://threejs.org/ and https://github.com/Vanilagy/mediabunny.

## Interface direction

Use warm neutral surfaces, charcoal editor panels, a restrained copper accent, small corner radii, clear labels, and real animation previews. Describe specific behavior and supported features. Keep future animations off the public library until they work.

Avoid purple UI gradients, pill buttons, invented reviews or usage metrics, vague promotional copy, emoji icons, em dashes in interface copy, decorative scroll/cursor effects, and generated stock imagery. User-selected colors and icons inside animation projects remain customizable.

## Personal data and DPDP preparation

The privacy notice and request links cover personal information handled by Orbit Studio, including support/privacy emails and ordinary connection details received by the serving host. The current product has no user account database or billing backend. Personal-data access, correction, erasure, consent withdrawal, grievance, and nomination requests are routed through email drafts to gamer.robot.in@gmail.com. The operator must monitor and handle that inbox; no request is automatically submitted or completed by the frontend. The published grievance period is 90 days.

Project autosaving, presets, and uploaded audio use the normal editor storage behavior. Privacy requests do not trigger project deletion, storage consent gates, or editor resets. Project files can contain personal names, photos, or voices; the notice explains their on-device handling without treating every creative project as an account record. The retired browser-saving preference is ignored and does not prevent access to existing projects.

Before adding accounts or payments, implement authenticated access/correction/erasure for actual user records, appropriate consent handling, processor and retention arrangements, security, incident response, and any applicable parental-consent requirements. A privacy page alone does not establish full compliance. Confirm the real operator identity and hosting-log arrangements before public launch.

Official sources checked on 23 October 2026:
- Act: https://www.indiacode.nic.in/bitstream/123456789/22037/1/a2023-22.pdf
- Rules: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- Commencement: https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf
- December 2025 corrigendum: https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf
- October 2026 order: https://www.meity.gov.in/static/uploads/2026/10/daf495a7b5798a3dfa72a944b51fc176.pdf

Core processing obligations and data-principal rights have phased commencement scheduled eighteen months after the November 2025 notifications (May 2027). The later corrections checked do not change that period.
