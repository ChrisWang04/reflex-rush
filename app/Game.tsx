"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "over";
type Mode = "time" | "survival";

interface Target {
  id: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // px
  golden: boolean;
  bomb: boolean;
  expireAt: number; // timestamp ms (display only)
}

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: "normal" | "gold" | "bad";
}

const ROUND_SECONDS = 30;
const MAX_LIVES = 5;
const MAX_BOMB_HITS = 2; // 2nd bomb click = game over
const HS_KEY = (m: Mode) => `reflex-rush-hs-${m}`;

export default function Game() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("time");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [lives, setLives] = useState(MAX_LIVES);
  const [bombHits, setBombHits] = useState(0);
  const [highScores, setHighScores] = useState<Record<Mode, number>>({
    time: 0,
    survival: 0,
  });
  const [isNewBest, setIsNewBest] = useState(false);
  const [overReason, setOverReason] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [pulse, setPulse] = useState(false);
  const [shake, setShake] = useState(false);

  // refs hold the live values the timers/handlers need without re-subscribing
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("time");
  const comboRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const bombHitsRef = useRef(0);
  const idRef = useRef(0);
  const startRef = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // one timeout per target decides its fate if it's never clicked
  const fates = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  phaseRef.current = phase;
  comboRef.current = combo;

  const multiplier = 1 + Math.floor(combo / 5);

  // load both high scores once
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHighScores({
      time: Number(window.localStorage.getItem(HS_KEY("time"))) || 0,
      survival: Number(window.localStorage.getItem(HS_KEY("survival"))) || 0,
    });
  }, []);

  const clearAllTimers = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (clockTimer.current) clearInterval(clockTimer.current);
    fates.current.forEach((t) => clearTimeout(t));
    fates.current.clear();
  }, []);

  const flashShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 180);
  }, []);

  const breakCombo = useCallback(() => {
    setCombo(0);
    comboRef.current = 0;
  }, []);

  const addPopup = useCallback(
    (x: number, y: number, text: string, kind: Popup["kind"]) => {
      const id = idRef.current++;
      setPopups((prev) => [...prev, { id, x, y, text, kind }]);
      setTimeout(
        () => setPopups((prev) => prev.filter((p) => p.id !== id)),
        700
      );
    },
    []
  );

  // forward declaration via ref so callbacks can call endGame before it's defined
  const endGameRef = useRef<(reason: string) => void>(() => {});

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) endGameRef.current("Out of lives");
  }, []);

  const registerBombHit = useCallback(
    (t: Target) => {
      bombHitsRef.current += 1;
      setBombHits(bombHitsRef.current);
      breakCombo();
      flashShake();
      addPopup(t.x, t.y, "💥", "bad");
      if (bombHitsRef.current >= MAX_BOMB_HITS) endGameRef.current("Boom!");
    },
    [addPopup, breakCombo, flashShake]
  );

  // fired by a target's own timeout => it was never clicked
  const expireTarget = useCallback(
    (t: Target) => {
      fates.current.delete(t.id);
      setTargets((prev) => prev.filter((x) => x.id !== t.id));
      if (phaseRef.current !== "playing") return;
      if (t.bomb) return; // letting a bomb expire is the correct move — no penalty
      breakCombo();
      flashShake();
      if (modeRef.current === "survival") loseLife();
    },
    [breakCombo, flashShake, loseLife]
  );

  const difficulty = useCallback(() => {
    const elapsed = (Date.now() - startRef.current) / 1000;
    const denom = modeRef.current === "survival" ? 50 : ROUND_SECONDS;
    return Math.min(elapsed / denom, 1); // 0 -> 1
  }, []);

  const scheduleSpawn = useCallback(() => {
    const p = difficulty();
    const gap = 820 - p * 480; // 820ms -> ~340ms
    spawnTimer.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      const bomb = modeRef.current === "survival" && Math.random() < 0.16;
      const golden = !bomb && Math.random() < 0.12;
      const ttl =
        (golden ? 950 : bomb ? 1500 : 1500 - p * 700) * (golden ? 0.85 : 1);
      const size = bomb ? 58 : golden ? 42 : 64 - p * 20;
      const target: Target = {
        id: idRef.current++,
        x: 8 + Math.random() * 84,
        y: 8 + Math.random() * 84,
        size,
        golden,
        bomb,
        expireAt: Date.now() + ttl,
      };
      setTargets((prev) => [...prev, target]);
      fates.current.set(
        target.id,
        setTimeout(() => expireTarget(target), ttl)
      );
      scheduleSpawn();
    }, gap);
  }, [difficulty, expireTarget]);

  const endGame = useCallback(
    (reason: string) => {
      clearAllTimers();
      setOverReason(reason);
      setPhase("over");
      phaseRef.current = "over";
      setTargets([]);
      const finalScore = comboScoreRef.current;
      const m = modeRef.current;
      setHighScores((prev) => {
        if (finalScore > prev[m]) {
          setIsNewBest(true);
          if (typeof window !== "undefined")
            window.localStorage.setItem(HS_KEY(m), String(finalScore));
          return { ...prev, [m]: finalScore };
        }
        return prev;
      });
    },
    [clearAllTimers]
  );
  endGameRef.current = endGame;

  // keep a ref of the current score so endGame reads the latest value
  const comboScoreRef = useRef(0);
  comboScoreRef.current = score;

  const startGame = useCallback(
    (m: Mode) => {
      clearAllTimers();
      setMode(m);
      modeRef.current = m;
      setScore(0);
      setCombo(0);
      comboRef.current = 0;
      setTimeLeft(ROUND_SECONDS);
      setLives(MAX_LIVES);
      livesRef.current = MAX_LIVES;
      setBombHits(0);
      bombHitsRef.current = 0;
      setTargets([]);
      setPopups([]);
      setIsNewBest(false);
      setOverReason("");
      setPhase("playing");
      phaseRef.current = "playing";
      startRef.current = Date.now();

      if (m === "time") {
        clockTimer.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              endGameRef.current("Time's up");
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }

      scheduleSpawn();
    },
    [clearAllTimers, scheduleSpawn]
  );

  useEffect(() => clearAllTimers, [clearAllTimers]);

  const hitTarget = useCallback(
    (t: Target, e: React.MouseEvent) => {
      e.stopPropagation();
      const fate = fates.current.get(t.id);
      if (fate) {
        clearTimeout(fate);
        fates.current.delete(t.id);
      }
      setTargets((prev) => prev.filter((x) => x.id !== t.id));

      if (t.bomb) {
        registerBombHit(t);
        return;
      }

      const nextCombo = comboRef.current + 1;
      const mult = 1 + Math.floor(nextCombo / 5);
      const base = t.golden ? 50 : 10;
      const gained = base * mult;

      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setScore((s) => s + gained);
      addPopup(t.x, t.y, `+${gained}`, t.golden ? "gold" : "normal");
      setPulse(true);
      setTimeout(() => setPulse(false), 90);
    },
    [addPopup, registerBombHit]
  );

  const onArenaMiss = useCallback(() => {
    if (phaseRef.current === "playing" && comboRef.current > 0) {
      breakCombo();
      flashShake();
    }
  }, [breakCombo, flashShake]);

  const hearts =
    "♥".repeat(Math.max(0, lives)) +
    "♡".repeat(Math.max(0, MAX_LIVES - lives));

  return (
    <main className="shell">
      <h1 className="title">Reflex Rush</h1>

      <div className="hud">
        <div className="stat">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
        <div className={`stat combo${pulse ? " pulse" : ""}`}>
          <div className="label">Combo ×{multiplier}</div>
          <div className="value">{combo}</div>
        </div>
        {mode === "time" ? (
          <div className={`stat timer${timeLeft <= 5 ? " low" : ""}`}>
            <div className="label">Time</div>
            <div className="value">{timeLeft}</div>
          </div>
        ) : (
          <div className="stat lives">
            <div className="label">Lives · 💣 {bombHits}/{MAX_BOMB_HITS}</div>
            <div className="value">{hearts}</div>
          </div>
        )}
      </div>

      <div className={`arena${shake ? " shake" : ""}`} onMouseDown={onArenaMiss}>
        {targets.map((t) => (
          <button
            key={t.id}
            className={`target${t.golden ? " golden" : ""}${t.bomb ? " bomb" : ""}`}
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.size,
              height: t.size,
            }}
            onMouseDown={(e) => hitTarget(t, e)}
            aria-label={t.bomb ? "bomb" : t.golden ? "golden target" : "target"}
          >
            {t.bomb ? "💣" : ""}
          </button>
        ))}

        {popups.map((p) => (
          <span
            key={p.id}
            className={`popup ${p.kind}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.text}
          </span>
        ))}

        {phase === "idle" && (
          <div className="overlay">
            <p className="subtitle">
              Click the targets before they vanish. Chain hits to raise your
              multiplier. Gold targets are worth 5×. Pick a mode:
            </p>
            <div className="mode-row">
              <button className="btn" onMouseDown={() => startGame("time")}>
                ⏱ Time Attack
                <span className="btn-sub">30 seconds · best {highScores.time}</span>
              </button>
              <button
                className="btn secondary"
                onMouseDown={() => startGame("survival")}
              >
                ❤️ Survival
                <span className="btn-sub">
                  5 lives · avoid 💣 · best {highScores.survival}
                </span>
              </button>
            </div>
            <p className="fineprint">
              Time Attack: race the clock. Survival: a miss costs a life, and a
              second bomb-click ends your run instantly.
            </p>
          </div>
        )}

        {phase === "over" && (
          <div className="overlay">
            {isNewBest && <div className="newbest">★ New best!</div>}
            <div className="subtitle">{overReason} · final score</div>
            <div className="big-number">{score}</div>
            <div className="subtitle">
              Best ({mode === "time" ? "Time Attack" : "Survival"}):{" "}
              {highScores[mode]}
            </div>
            <div className="mode-row">
              <button className="btn" onMouseDown={() => startGame(mode)}>
                Play again
              </button>
              <button
                className="btn secondary"
                onMouseDown={() => {
                  setPhase("idle");
                  phaseRef.current = "idle";
                }}
              >
                Change mode
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="footer">
        Built with Next.js &amp; React · vibecoded for the Brave Career AI
        residency
      </p>
    </main>
  );
}
