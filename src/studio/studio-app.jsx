import React, {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { ANIMATIONS } from "../home/animations.js";
import { controlDefinitions } from "./ui.js";

const SettingsContext = createContext(null);
const mode =
  ANIMATIONS.find(
    (animation) =>
      animation.id === new URLSearchParams(location.search).get("animation"),
  ) ?? ANIMATIONS[0];
const definitions = controlDefinitions(mode.id);
const units = {
  "percent-value": "%",
  percent: "%",
  times: "×",
  degrees: "°",
  "degrees-per-second": "°/s",
  px: "px",
  seconds: "s",
  "stop-time": "s",
};

function RangeGroup({ id }) {
  const { ranges } = useContext(SettingsContext);
  return (
    <div id={id}>
      {ranges
        .filter(([group]) => group === id)
        .map(([, path, label, min, max, step, type]) => {
          const inputId = "setting-" + path.replace(".", "-");
          const scale = type === "percent" ? 100 : 1;
          return (
            <div className="range-field" key={path}>
              <div className="range-heading">
                <label htmlFor={inputId}>{label}</label>
                <span className="value-editor">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min * scale}
                    max={max * scale}
                    step={Number((step * scale).toFixed(6))}
                    data-number={path}
                    data-scale={scale}
                    aria-label={label + " exact value"}
                  />
                  <span aria-hidden="true">{units[type]}</span>
                  <output
                    htmlFor={inputId}
                    data-output={path}
                    className="sr-only"
                  />
                </span>
              </div>
              <input
                id={inputId}
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                data-setting={path}
                data-display={type}
              />
            </div>
          );
        })}
    </div>
  );
}

function ToggleGroup({ id }) {
  const { toggles } = useContext(SettingsContext);
  return (
    <div id={id} className="toggle-stack">
      {toggles
        .filter(([group]) => group === id)
        .map(([, path, label]) => {
          const inputId = "setting-" + path.replace(".", "-");
          return (
            <label key={path} className="toggle" htmlFor={inputId}>
              <span>{label}</span>
              <input type="checkbox" id={inputId} data-setting={path} />
            </label>
          );
        })}
    </div>
  );
}

function StudioHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="./" aria-label="Orbit Studio home">
        <span className="brand-mark">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M25 23a12 12 0 1 1 2-11"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            ></path>
            <circle cx="22" cy="10" r="4" fill="currentColor"></circle>
          </svg>
        </span>
        <strong>
          Orbit <span>Studio</span>
        </strong>
      </a>
      <a
        className="studio-back"
        href="./#animations"
        aria-label="Back to animations"
      >
        <span aria-hidden="true">←</span>
        <span className="back-label">Animations</span>
      </a>
      <div className="project-meta">
        <input
          id="project-name"
          type="text"
          aria-label="Project name"
          defaultValue="Untitled escape"
          maxLength="80"
        />
        <span id="save-state">
          <i></i> Saved on this device
        </span>
      </div>
      <div className="header-actions">
        <button className="button ghost" id="help-button">
          <span data-icon="help"></span>
          <span className="optional">Quick guide</span>
        </button>
        <button
          className="button secondary"
          id="save-button"
          aria-label="Save preset"
        >
          <span data-icon="bookmark"></span>
          <span className="optional">Save preset</span>
        </button>
        <button
          className="button primary"
          id="header-export"
          aria-controls="output-panel"
        >
          <span data-icon="download"></span>Export settings
        </button>
      </div>
    </header>
  );
}

const SceneSettings = memo(function SceneSettings() {
  return (
    <>
      <div className="section-heading">
        Color palette <span>Choose a starting point</span>
      </div>
      <div id="theme-grid" className="theme-grid"></div>
      <div className="range-field palette-count">
        <label htmlFor="color-count">
          <span>Number of colors</span>
          <output id="color-count-label" htmlFor="color-count">
            2
          </output>
        </label>
        <input
          id="color-count"
          type="range"
          min="1"
          max="12"
          step="1"
          aria-label="Number of colors"
        />
      </div>
      <div id="palette-colors" className="palette-colors"></div>
      <label className="toggle palette-gradient">
        <span>Blend colors into a gradient</span>
        <input
          id="palette-gradient"
          type="checkbox"
          aria-label="Blend colors into a gradient"
        />
      </label>
      <p id="palette-description" className="setting-hint"></p>
      <div className="color-row">
        <label>
          Background
          <input
            type="color"
            data-setting="appearance.background"
            aria-label="Background color"
          />
        </label>
        <label>
          Ball
          <input
            type="color"
            data-setting="appearance.ballColor"
            aria-label="Ball color"
          />
        </label>
      </div>
      <details className="settings-group">
        <summary>
          Title &amp; branding<span>Title and creator handle</span>
        </summary>
        <div className="details-body">
          <label className="field-label" htmlFor="video-title">
            Video title
          </label>
          <textarea
            id="video-title"
            data-setting="appearance.title"
            maxLength="160"
            rows="3"
          ></textarea>
          <label className="field-label" htmlFor="handle">
            Your handle
          </label>
          <input
            id="handle"
            type="text"
            data-setting="appearance.handle"
            placeholder="@yourname"
            maxLength="50"
          />
          <ToggleGroup id="text-toggles" />
        </div>
      </details>
      <details className="settings-group">
        <summary>
          Effects &amp; finish<span>Trail, glow, and particles</span>
        </summary>
        <div className="details-body">
          <ToggleGroup id="scene-toggles" />
          <RangeGroup id="scene-ranges" />
        </div>
      </details>
    </>
  );
});

const MotionSettings = memo(function MotionSettings() {
  return (
    <>
      <div className="section-heading">
        Movement <span>Changes replay the scene</span>
      </div>
      <p className="panel-intro">
        Set movement and collision behavior. Ball speed stays constant.
      </p>
      <RangeGroup id="motion-ranges" />
      <details className="settings-group" open>
        <summary>
          Shrink behavior<span>Choose when to stop</span>
        </summary>
        <div className="details-body">
          <RangeGroup id="shrink-ranges" />
          <p id="shrink-hint" className="setting-hint"></p>
        </div>
      </details>
      <details className="settings-group">
        <summary>
          Advanced motion<span>Size, gravity, and direction</span>
        </summary>
        <div className="details-body">
          <RangeGroup id="advanced-ranges" />
          <label className="field-label" htmlFor="direction">
            Ring direction
          </label>
          <select id="direction" data-setting="physics.direction">
            <option value="1">Clockwise</option>
            <option value="-1">Counterclockwise</option>
          </select>
          <ToggleGroup id="motion-toggles" />
          <div className="notice">
            <span data-icon="replay"></span>
            <p>
              Gravity and bounce response change the ball’s direction while
              keeping its speed constant.
            </p>
          </div>
        </div>
      </details>
    </>
  );
});

const AudioSettings = memo(function AudioSettings() {
  return (
    <>
      <div className="section-heading">
        Soundtrack <span>In time with every bounce</span>
      </div>
      <button className="button secondary full" id="audio-audition">
        <span data-icon="volume"></span>Listen to preview
      </button>
      <ToggleGroup id="audio-toggles" />
      <label className="field-label" htmlFor="melody">
        Melody
      </label>
      <select id="melody" data-setting="sound.melody">
        <option value="pentatonic">Orbit steps · original</option>
        <option value="twinkle">Twinkle, Twinkle · traditional</option>
        <option value="ode">Ode to Joy · Beethoven</option>
        <option value="none">No melody</option>
        <option value="midi">Imported MIDI</option>
      </select>
      <button className="button upload full" id="import-midi">
        <span data-icon="upload"></span>Import a MIDI melody
      </button>
      <small id="midi-name" className="file-caption">
        Each collision plays the next note.
      </small>
      <div className="two-fields">
        <div>
          <label className="field-label" htmlFor="instrument">
            Instrument
          </label>
          <select id="instrument" data-setting="sound.instrument">
            <option value="marimba">Marimba</option>
            <option value="piano">Soft piano</option>
            <option value="musicbox">Music box</option>
            <option value="chip">Chiptune</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="trigger">
            Play notes on
          </label>
          <select id="trigger" data-setting="sound.trigger">
            <option value="bounce">Bounces</option>
            <option value="escape">Ring escapes</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
      <div className="divider"></div>
      <div className="section-heading">IMPACT & TEXTURE</div>
      <label className="field-label" htmlFor="impact">
        Bounce sound
      </label>
      <select id="impact" data-setting="sound.impact">
        <option value="soft">Soft tick</option>
        <option value="wood">Wood block</option>
        <option value="click">Click</option>
        <option value="sample">My uploaded sound</option>
        <option value="none">None</option>
      </select>
      <button className="button upload full" id="import-impact">
        <span data-icon="upload"></span>Upload bounce sound
      </button>
      <small id="impact-name" className="file-caption">
        MP3, WAV, OGG or M4A · up to 20 MB
      </small>
      <label className="field-label" htmlFor="break-sound">
        Ring escape sound
      </label>
      <select id="break-sound" data-setting="sound.breakSound">
        <option value="shimmer">Shimmer</option>
        <option value="pop">Soft burst</option>
        <option value="none">None</option>
      </select>
      <div className="divider"></div>
      <div className="section-heading">BACKGROUND TRACK</div>
      <button className="button upload full" id="import-bed">
        <span data-icon="music"></span>Add background audio
      </button>
      <div className="asset-caption">
        <small id="bed-name" className="file-caption">
          Starts with your video and loops to fit.
        </small>
        <button className="text-button" id="remove-bed" hidden>
          Remove
        </button>
      </div>
      <div className="divider"></div>
      <div className="section-heading">THE MIX</div>
      <RangeGroup id="audio-ranges" />
    </>
  );
});

const PresetsSettings = memo(function PresetsSettings() {
  return (
    <>
      <div className="section-heading">
        Your presets <span>Ready for next time</span>
      </div>
      <p className="panel-intro">
        Keep a favorite combination of colors, motion, and sound.
      </p>
      <div id="preset-list"></div>
      <div className="editor-privacy-row">
        <button className="text-button" data-privacy-open>
          Personal data &amp; privacy
        </button>
      </div>
      <div className="divider"></div>
      <div className="section-heading">Project file</div>
      <div className="mobile-project">
        <label className="field-label" htmlFor="project-name-mobile">
          Project name
        </label>
        <input type="text" id="project-name-mobile" maxLength={80} />
      </div>
      <p className="muted small">
        Keep a copy of your settings or bring a project back into Orbit.
      </p>
      <button className="button secondary full" id="download-project">
        <span data-icon="download"></span>Download project JSON
      </button>
      <button className="button upload full" id="import-project">
        <span data-icon="upload"></span>Open project JSON
      </button>
      <p className="muted tiny">
        Uploaded audio stays in this browser. Project JSON contains settings,
        MIDI notes, and icons, but not audio files.
      </p>
    </>
  );
});

const tabs = [
  ["scene", "Style", SceneSettings],
  ["motion", "Motion", MotionSettings],
  ["audio", "Audio", AudioSettings],
  ["saved", "Presets", PresetsSettings],
];

function StudioEditor() {
  const [selected, setSelected] = useState("scene");
  const scroll = useRef(null);
  const tabButtons = useRef([]);
  function openTab(tab) {
    setSelected(tab);
    scroll.current.scrollTop = 0;
  }
  function navigateTabs(event, index) {
    const next = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    openTab(tabs[next][0]);
    tabButtons.current[next].focus();
  }
  return (
    <aside className="editor" aria-label="Video editor">
      <div className="mode-card">
        <div className="mode-art" aria-hidden="true">
          <i></i>
          <b></b>
        </div>
        <div>
          <span className="eyebrow">ANIMATION 01</span>
          <h1>Ring Escape</h1>
          <p>A ball escapes through rotating ring gaps.</p>
        </div>
        <span className="mode-number">01</span>
      </div>
      <nav className="tabs" aria-label="Editor sections" role="tablist">
        {tabs.map(([id, label], index) => (
          <button
            type="button"
            key={id}
            ref={(button) => {
              tabButtons.current[index] = button;
            }}
            id={"tab-" + id}
            role="tab"
            aria-controls={"panel-" + id}
            aria-selected={selected === id}
            tabIndex={selected === id ? 0 : -1}
            onClick={() => openTab(id)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="panel-scroll" ref={scroll}>
        {tabs.map(([id, label, Settings]) => (
          <section
            key={id}
            id={"panel-" + id}
            data-panel={id}
            role="tabpanel"
            aria-labelledby={"tab-" + id}
            hidden={selected !== id}
          >
            <Settings />
          </section>
        ))}
      </div>
    </aside>
  );
}

function Preview({ modeName }) {
  return (
    <main className="viewport">
      <div className="preview-header">
        <div className="preview-heading">
          <span className="preview-live-dot"></span>
          <span className="preview-label">Live preview</span>
          <span className="mobile-mode">{modeName}</span>
          <span className="preview-size">9:16</span>
        </div>
        <div className="preview-tools">
          <button
            className="icon-button"
            data-privacy-open
            aria-label="Personal data and privacy"
            title="Personal data &amp; privacy"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"></path>
            </svg>
          </button>
          <button
            className="icon-button"
            id="undo-change"
            aria-label="Undo change"
            title="Undo (Ctrl / ⌘ Z)"
            disabled
          >
            <span data-icon="undo"></span>
          </button>
          <button
            className="icon-button"
            id="redo-change"
            aria-label="Redo change"
            title="Redo (Ctrl / ⌘ Shift Z)"
            disabled
          >
            <span data-icon="redo"></span>
          </button>
          <span className="tool-separator"></span>
          <button
            className="icon-button"
            id="fullscreen"
            aria-label="Fullscreen preview"
            title="Fullscreen"
          >
            <span data-icon="expand"></span>
          </button>
        </div>
      </div>
      <div className="preview-stage">
        <div className="artboard" id="artboard">
          <canvas
            id="animation"
            width="1080"
            height="1920"
            aria-label="Live ring escape animation"
          ></canvas>
          <div className="safe-guide" id="safe-guide" hidden>
            <span>Keep key moments inside this area</span>
          </div>
          <div id="loading-overlay" className="loading-overlay" hidden>
            <div className="spinner"></div>
            <span>Syncing your soundtrack…</span>
          </div>
        </div>
        <span className="format-label">9:16 &nbsp;·&nbsp; VERTICAL VIDEO</span>
      </div>
      <div className="preview-controls">
        <button
          className="icon-button play-button"
          id="play-preview"
          aria-label="Pause preview"
        >
          <span data-icon="pause"></span>
        </button>
        <button
          className="icon-button"
          id="replay"
          aria-label="Restart with random path"
          title="Start a new random path"
        >
          <span data-icon="replay"></span>
        </button>
        <button className="sound-button" id="monitor">
          <span data-icon="volume"></span>
          <span id="monitor-label">Enable audio</span>
        </button>
        <label className="guide-control">
          <input type="checkbox" id="safe-toggle" />
          Safe zones
        </label>
        <button
          className="icon-button"
          id="snapshot"
          aria-label="Save a still image"
          title="Save a still"
        >
          <span data-icon="camera"></span>
        </button>
      </div>
      <div className="timeline-row">
        <span id="time-label">00:00</span>
        <input
          type="range"
          min="0"
          max="45"
          step="0.1"
          defaultValue="0"
          id="timeline"
          aria-label="Preview position"
        />
        <span id="duration-label">00:45</span>
      </div>
      <div className="scenario-bar">
        <span id="seed-label">SCENARIO #48291</span>
        <div>
          <button
            className="text-button"
            id="find-ending"
            title="Guide the ball to clear every ring near the selected duration"
          >
            <span data-icon="replay"></span>Fit ending
          </button>
          <button className="button secondary compact" id="new-scenario">
            <span data-icon="shuffle"></span>New path
          </button>
        </div>
      </div>
    </main>
  );
}

function ExportPanel() {
  return (
    <aside className="output" id="output-panel" aria-label="Export settings">
      <div className="output-heading">
        <span className="eyebrow">EXPORT SETTINGS</span>
        <h2>Export video</h2>
      </div>
      <div className="export-recipe">
        <span className="recipe-icon" data-icon="video"></span>
        <div>
          <strong id="export-recipe-title">45s · 1080p · 30 fps</strong>
          <small>Vertical video · 9:16</small>
        </div>
      </div>
      <div className="ending-control">
        <label className="toggle ending-toggle">
          <span>Match ending to duration</span>
          <input
            type="checkbox"
            id="match-duration"
            data-setting="export.matchDuration"
            defaultChecked
          />
        </label>
        <p
          id="ending-status"
          className="muted small"
          role="status"
          aria-live="polite"
        >
          Planning the ball’s path…
        </p>
      </div>
      <label className="field-label" htmlFor="duration">
        Video duration
      </label>
      <select id="duration" data-setting="export.duration">
        <option value="5">5 seconds · quick test</option>
        <option value="15">15 seconds</option>
        <option value="25">25 seconds</option>
        <option value="30">30 seconds</option>
        <option value="35">35 seconds</option>
        <option value="42">42 seconds</option>
        <option value="45">45 seconds</option>
        <option value="50">50 seconds</option>
        <option value="60">60 seconds</option>
        <option value="75">75 seconds</option>
        <option value="120">120 seconds</option>
      </select>
      <div className="two-fields">
        <div>
          <label className="field-label" htmlFor="fps">
            Frame rate
          </label>
          <select id="fps" data-setting="export.fps">
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="resolution">
            Resolution
          </label>
          <select id="resolution" data-setting="export.resolution">
            <option value="1080">1080p</option>
            <option value="720">720p</option>
          </select>
        </div>
      </div>
      <label className="field-label" htmlFor="format">
        File format
      </label>
      <select id="format" data-setting="export.format">
        <option value="mp4">MP4 · recommended</option>
        <option value="webm">WebM · alternative</option>
      </select>
      <div className="export-summary">
        <div>
          <span data-icon="video"></span>
          <span id="export-pixels">1080 × 1920</span>
          <span className="output-ratio">9:16</span>
        </div>
        <div>
          <span data-icon="music"></span>
          <span id="audio-summary">Synchronized audio included</span>
        </div>
        <div>
          <span data-icon="check"></span>
          <span>No watermark</span>
        </div>
      </div>
      <button className="button primary full large" id="render-button">
        <span data-icon="download"></span>
        <span id="render-label">Export video</span>
        <span className="button-arrow">↗</span>
      </button>
      <div className="editor-privacy-row">
        <button className="text-button" data-privacy-open>
          Personal data &amp; privacy
        </button>
      </div>
      <div className="divider"></div>
      <div className="section-heading">
        RECENT EXPORTS <span>This session</span>
      </div>
      <div id="export-list">
        <div className="empty-state">
          <span data-icon="film"></span>
          <p>No exports yet.</p>
          <small>Finished videos appear here during this session.</small>
        </div>
      </div>
    </aside>
  );
}

function StudioDialogs() {
  return (
    <>
      <dialog id="save-dialog">
        <form method="dialog" id="save-form">
          <div className="dialog-heading">
            <h2>Save preset</h2>
            <button
              className="icon-button"
              value="cancel"
              aria-label="Close save dialog"
              formNoValidate
            >
              <span data-icon="close"></span>
            </button>
          </div>
          <p className="muted">
            Save the current colors, motion, audio, and export settings.
          </p>
          <label className="field-label" htmlFor="preset-name">
            Preset name
          </label>
          <input id="preset-name" maxLength="80" required />
          <div className="dialog-actions">
            <button className="button secondary" value="cancel" formNoValidate>
              Cancel
            </button>
            <button className="button primary" value="save">
              Save preset
            </button>
          </div>
        </form>
      </dialog>
      <dialog id="export-settings-dialog">
        <div className="dialog-heading">
          <h2>Export your video</h2>
          <button
            className="icon-button"
            data-close="export-settings-dialog"
            aria-label="Close export settings"
          >
            <span data-icon="close"></span>
          </button>
        </div>
        <div id="mobile-export-body"></div>
      </dialog>
      <dialog id="render-dialog">
        <span className="eyebrow">VIDEO EXPORT</span>
        <h2 id="render-title">Rendering your video</h2>
        <p id="render-stage" className="muted">
          Preparing the collision timeline…
        </p>
        <progress id="render-progress" value="0" max="1"></progress>
        <div className="progress-labels" aria-live="polite">
          <span id="render-percent">0%</span>
          <span id="render-elapsed">00:00</span>
        </div>
        <p className="tiny muted">
          Frames and sound use the same collision timeline.
        </p>
        <button className="button secondary full" id="cancel-render">
          Cancel export
        </button>
      </dialog>
      <dialog id="result-dialog">
        <div className="dialog-heading">
          <h2>Your video is ready.</h2>
          <button
            className="icon-button"
            data-close="result-dialog"
            aria-label="Close finished video"
          >
            <span data-icon="close"></span>
          </button>
        </div>
        <video id="result-video" controls playsInline></video>
        <div className="result-footer">
          <span id="result-details" className="muted small"></span>
          <a className="button primary" id="result-download" download>
            <span data-icon="download"></span>Download video
          </a>
        </div>
      </dialog>
      <dialog id="help-dialog">
        <div className="dialog-heading">
          <h2>Using the editor</h2>
          <button
            className="icon-button"
            data-close="help-dialog"
            aria-label="Close guide"
          >
            <span data-icon="close"></span>
          </button>
        </div>
        <ol className="guide-list">
          <li>
            <b>Set appearance and motion</b>
            <p>
              Choose colors, edit your title, and tune the physics. The ending
              automatically fits your selected duration. Restart or choose New path
              for fresh movement. Changing ball speed also creates a new path.
              Pause and play resume the current run.
            </p>
          </li>
          <li>
            <b>Set collision audio</b>
            <p>
              Enable preview audio, pick a melody or import MIDI. Each bounce
              plays the next note. Upload a short impact sound or a background
              track for the soundtrack.
            </p>
          </li>
          <li>
            <b>Choose export settings</b>
            <p>
              Choose the duration, frame rate, and format. Orbit draws every
              frame and syncs sound to the same collision timestamps.
            </p>
          </li>
        </ol>
        <p className="muted small">
          Presets and uploaded sounds are stored in this browser. Save a project
          JSON to keep a separate copy of your settings.
        </p>
      </dialog>
      <input type="file" id="midi-file" accept=".mid,.midi" hidden />
      <input type="file" id="impact-file" accept="audio/*" hidden />
      <input type="file" id="bed-file" accept="audio/*" hidden />
      <input
        type="file"
        id="project-file"
        accept=".json,application/json"
        hidden
      />
      <span
        id="history-status"
        className="sr-only"
        role="status"
        aria-live="polite"
      ></span>
      <div id="toast" role="status" hidden></div>
      <div id="fatal-error" role="alert" hidden></div>
    </>
  );
}

function Studio() {
  useEffect(() => {
    // Mount the simulation controller after React commits its canvas and form controls.
    import("./studio.js").catch((error) => {
      console.error(error);
      document.body.classList.remove("studio-loading");
      document.body.setAttribute("aria-busy", "false");
      document.getElementById("studio-boot").hidden = true;
      const message = document.getElementById("fatal-error");
      message.textContent = "Orbit could not start. " + error.message;
      message.hidden = false;
    });
  }, []);

  return (
    <SettingsContext.Provider value={definitions}>
      <StudioHeader />
      <div className="workspace">
        <StudioEditor />
        <Preview modeName={mode.name} />
        <ExportPanel />
      </div>
      <StudioDialogs />
    </SettingsContext.Provider>
  );
}

createRoot(document.getElementById("studio-app")).render(<Studio />);
