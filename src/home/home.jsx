import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { mountPrivacy } from "../privacy/controls.js";
import { loadCurrent, lastAnimation } from "../studio/storage.js";
import { selectAnimations } from "./animations.js";
import { modeArtwork } from "./home-art.js";

const animations = selectAnimations("available");
const filters = [
  { name: "All animations", ids: null },
  { name: "Escape", ids: ["ring-escape", "timed-escape", "spike-melody"] },
  { name: "Battles", ids: ["string-wars", "circle-royale"] },
  { name: "Growth", ids: ["growing-ball", "rainbow-crash", "ball-multiplier"] },
];

function Brand() {
  return (
    <a className="brand" href="./" aria-label="Orbit Studio home">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M25 23a12 12 0 1 1 2-11"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="22" cy="10" r="4" fill="currentColor" />
      </svg>
      <span>Orbit Studio</span>
    </a>
  );
}

function Artwork({ kind }) {
  return (
    <div
      className="artwork"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: modeArtwork(kind) }}
    />
  );
}

function LiveDemo() {
  const figure = useRef(null);
  const canvas = useRef(null);
  const demo = useRef(null);
  const selectedTheme = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Ring Escape");
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    let stopped = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import("./home-preview.js").then(({ startDemo }) => {
        if (stopped) return;
        const preview = startDemo(canvas.current, setStatus);
        preview.setTheme(selectedTheme.current);
        demo.current = preview;
        setPlaying(preview.playing);
        setReady(true);
      }).catch(() => {
        if (!stopped) {
          canvas.current.hidden = true;
          setStatus("Static preview");
        }
      });
    });
    observer.observe(figure.current);
    return () => {
      stopped = true;
      observer.disconnect();
      demo.current?.dispose();
      demo.current = null;
    };
  }, []);

  return (
    <figure ref={figure} className="demo" aria-label="Ring Escape demonstration">
      <figcaption>
        <span>Ring Escape</span>
        <span>9:16 preview</span>
      </figcaption>
      <div className="demo-stage">
        <div className="demo-screen">
          {!ready && <Artwork kind="rings" />}
          <canvas
            ref={canvas}
            width="540"
            height="960"
            hidden={!ready}
            aria-label="Animated Ring Escape preview"
          />
        </div>
      </div>
      <div className="demo-controls">
        <div
          className="demo-colors"
          role="group"
          aria-label="Preview color theme"
        >
          {["Copper", "Chalk", "Teal"].map((name, index) => (
            <button
              key={name}
              type="button"
              className={`demo-color ${name.toLowerCase()}`}
              aria-label={`${name} preview`}
              aria-pressed={theme === index}
              onClick={() => {
                selectedTheme.current = index;
                setTheme(index);
                demo.current?.setTheme(index);
              }}
            />
          ))}
        </div>
        <span>{status}</span>
        {ready && (
          <button
            type="button"
            className="demo-toggle"
            aria-label={
              playing ? "Pause animation demo" : "Play animation demo"
            }
            onClick={() => setPlaying(demo.current.toggle())}
          >
            {playing ? "Ⅱ" : "▷"}
          </button>
        )}
      </div>
    </figure>
  );
}

function AnimationCard({ mode }) {
  return (
    <a
      className="animation-card"
      href={mode.href}
      aria-label={`Create a ${mode.name} video`}
    >
      <div className="animation-art">
        <Artwork kind={mode.art} />
      </div>
      <div className="animation-info">
        <p className="animation-category">{mode.category}</p>
        <h3>{mode.name}</h3>
        <p className="animation-description">{mode.description}</p>
        <span className="card-bottom">
          Open editor <span aria-hidden="true">↗</span>
        </span>
      </div>
    </a>
  );
}

function AnimationLibrary() {
  const [filter, setFilter] = useState(filters[0]);
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const visible = animations.filter(
    (mode) =>
      (!filter.ids || filter.ids.includes(mode.id)) &&
      [mode.name, mode.category, mode.description, ...mode.tags]
        .join(" ")
        .toLowerCase()
        .includes(term),
  );
  return (
    <section
      className="library wrap"
      id="animations"
      aria-labelledby="library-heading"
    >
      <div className="section-top">
        <div>
          <p className="eyebrow">ANIMATION LIBRARY</p>
          <h2 id="library-heading">Choose an animation</h2>
        </div>
        <span className="library-count" aria-live="polite">
          {visible.length} of {animations.length} animations
        </span>
      </div>
      <div className="library-tools">
        <div className="filters" role="group" aria-label="Filter animations">
          {filters.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <label className="library-search">
          <span className="sr-only">Find an animation</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="8" cy="8" r="4.5" />
            <path d="m11.5 11.5 4 4" />
          </svg>
          <input
            type="search"
            placeholder="Find an animation"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {visible.length ? (
        <div className="animation-grid" id="animation-grid">
          {visible.map((mode) => (
            <AnimationCard key={mode.id} mode={mode} />
          ))}
        </div>
      ) : (
        <div className="library-empty">
          <p>No animations match your search.</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setQuery("");
              setFilter(filters[0]);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}

const questions = [
  [
    "How does music follow the animation?",
    "Pick a built-in melody or import MIDI. Collisions trigger the notes. A background track plays underneath the animation.",
  ],
  [
    "Can I use my own sounds and ball icons?",
    "Upload a bounce sound or background track in Audio. String Wars and Circle Royale support custom PNG, JPG, or WebP icons for players.",
  ],
  [
    "Where are my projects stored?",
    "Projects, presets, and uploaded sounds stay in this browser. Use Download project JSON to keep a copy of your settings. Upload audio again when moving a project to a different device.",
  ],
  [
    "What can I export?",
    "Export 9:16 MP4 or WebM at 720p or 1080p and 30 or 60 fps. A current Chrome or Edge browser offers the broadest encoding support.",
  ],
];

function Home() {
  const [resume] = useState(() => {
    const id = lastAnimation();
    return loadCurrent(id) ? animations.find((mode) => mode.id === id) : null;
  });
  useEffect(() => {
    const privacy = mountPrivacy();
    return () => privacy.remove();
  }, []);

  return (
    <>
      <a className="skip-link" href="#animations">
        Skip to animations
      </a>
      <header className="site-header">
        <div className="header-inner wrap">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#animations">Animations</a>
            <a href="#questions">Help</a>
            <a href="./privacy.html">Privacy</a>
          </nav>
        </div>
      </header>
      <main>
        <section className="hero wrap" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">A VIDEO STUDIO FOR PHYSICS ANIMATIONS</p>
            <h1 id="hero-heading">Make bouncing‑ball videos.</h1>
            <p className="hero-description">
              Pick a simulation, tune the motion and sounds, then export a
              vertical video for Shorts, TikTok, or Reels.
            </p>
            <div className="hero-actions">
              <a
                className="button primary"
                href={resume?.href ?? "#animations"}
              >
                {resume ? `Continue ${resume.name}` : "Choose an animation"}
                <span aria-hidden="true">{resume ? "↗" : "↓"}</span>
              </a>
              {resume && (
                <a className="text-link" href="#animations">
                  Browse animations <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>
            <p className="hero-note">
              MP4 or WebM · Up to 1080p · Renders in your browser
            </p>
          </div>
          <LiveDemo />
        </section>
        <AnimationLibrary />
        <section
          className="questions wrap"
          id="questions"
          aria-labelledby="questions-heading"
        >
          <div>
            <p className="eyebrow">USING THE STUDIO</p>
            <h2 id="questions-heading">A few useful details</h2>
          </div>
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer wrap">
        <span className="footer-name">Orbit Studio</span>
        <a href="./privacy.html" data-privacy-open>
          Personal data &amp; privacy
        </a>
      </footer>
    </>
  );
}

createRoot(document.getElementById("app")).render(<Home />);
