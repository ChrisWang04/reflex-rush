# Stage 1 Reflection — Reflex Rush

*A starter draft. Edit it into your own voice before posting — the residency
cares most about your reasoning, so make the "what I learned" part real.*

---

**The idea.** I wanted my Stage 1 project to be something people would actually
play with for more than five seconds, so I built *Reflex Rush* — a small
arcade-style reflex game. Targets spawn around an arena and you click them before
they disappear; consecutive hits build a combo multiplier, and gold targets are
worth a 5× bonus. It's simple to pick up but has just enough depth (a tightening
spawn rate, a combo you can lose) to make you want one more round.

**How I built it.** I vibecoded it in Next.js + React with TypeScript and plain
CSS — no game engine. The interesting part wasn't the UI but the game loop: a
self-scheduling spawn timer whose cadence and target lifespan shrink as the round
progresses, a separate 80ms "engine" interval that expires missed targets and
breaks the combo, and a one-second clock. I kept all the timer-driven values in
refs so the loops don't re-subscribe on every render, and persisted the high
score in `localStorage`. Then I deployed it to Vercel straight from GitHub —
connect the repo, click deploy, live URL.

**What I learned.** [Make this yours.] The thing that clicked for me was
< e.g. how React state vs. refs matter once you have intervals firing faster than
the render cycle / how trivially Vercel turns a repo into a live site / where I'd
draw the line on letting AI write code vs. understanding it >. If I had more time
I'd < e.g. add sound, a leaderboard backed by a database, or difficulty modes >.
