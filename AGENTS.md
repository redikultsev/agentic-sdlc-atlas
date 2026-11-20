# AGENTS.md

The "agentic development pipeline" project. Structure and sources: [README.md](README.md). Current state and next steps: [docs/STATUS.md](docs/STATUS.md) — read it first, update it at the end of a session.

Rules:
1. **English only** in every file and commit message of this repository.
2. **One source per fact.** Design: `model/*.c4`; decisions: `docs/decisions.md`; states: `docs/states.md`. `deck/slides.md` and `deck/public/views/` are generated; never edit them by hand.
3. **After any change to a source** run `npm run deck:gen` and commit together with the generated files. The deck and the diagrams always match the model.
4. **A decision changed:** edit its row in `docs/decisions.md` with the revision date; a cancelled one is marked "cancelled" with the reason, never deleted.
5. **Nothing personal:** no names, employers, clients, personal project names or machine paths. The human in the diagrams is "the Operator". The repository is shown to colleagues.
6. **Slides follow `deck/DESIGN.md`:** grid, even spacing, readable text, no orphans; check every slide in the browser before committing.
7. **Research** goes to `research/`, with a source and a date for every fact.
