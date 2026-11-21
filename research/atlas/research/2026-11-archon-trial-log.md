# Archon trial log

What broke, surprised or needed a decision while running Archon on a real repository. Started 2026-11-21. Kept as input for building our pipeline as an Archon pack: each entry says what happened, why, the fix or workaround, and what it means for our pack.

Setup of the trial:
- Archon built from its `dev` branch at a pinned commit `f9d1d2b`; first attempt on release 0.14.0.
- Docker Compose with Postgres, behind a VPN-only reverse proxy, one Operator.
- The trial repository is a private Python + TypeScript monorepo:
  - work lands on `develop`, releases go to `main`;
  - GitHub CI runs only by hand, the full check is a local `tools/check.sh` (~20 min);
  - issues are written by a second account (an assistant), not by the maintainer.

Entries are grouped by area. "Fix" is what we did; "For our pack" is what to carry over.

## Install and runtime

1. **Release vs docs drift.**
   - **What happened.** The README and docs on `dev` describe SDLC pack settings (`ci`, `build_lane`, `merge_lane`, `protected_paths`) that release 0.14.0 does not have. A settings file written from the `dev` README made every 0.14.0 pack run fail at once: "unknown setting 'ci'; pack 'sdlc' declares no settings".
   - **Context.**
     - Releases come every 1.5–3 weeks.
     - There are no nightly, beta or prerelease images: images are published only on `v*` tags.
     - `dev` was 3,231 commits ahead of 0.14.0 two weeks after the release.
   - **Fix.** Build the image from a pinned `dev` commit (compose `build.context: https://github.com/coleam00/Archon.git#<sha>`). It takes about 3 minutes on a 4-CPU server.
   - **For our pack.**
     - Always read docs at the exact commit that runs.
     - Pin a commit, not a branch.
     - Expect breaking changes: the Unreleased changelog alone listed 11.
2. **No init process: zombies exhaust the pids limit.**
   - **What happened.** `bun` runs as PID 1 and never reaps orphaned processes. After two agent rounds the container held about 2,040 zombies under a pids limit of 2,048. The next round failed with "Resource temporarily unavailable" (runc could not even `exec`). Only 3 live processes were visible in `docker top`; the zombies show up only in the cgroup's `pids.current`.
   - **Fix.** `init: true` in compose, so tini is PID 1. After the fix: 17–65 pids during a round.
   - **For our pack.**
     - Any long-lived agent host needs an init.
     - Watch `pids.current`, not the process list.
     - Upstream's own `docker-compose.yml` has no `init` (PR candidate).
3. **Compose `configs` modes are ignored outside swarm.**
   - **What happened.** A file mounted from `configs:` with `mode: 0555` arrived unreadable for the non-root user, and the container crash-looped.
   - **Fix.** Mount the configs elsewhere; an entrypoint running as root `install`s them with the right mode, then `exec`s the image's entrypoint.
4. **The CLI has no user until you link one.**
   - **What happened.** The web login stores the Claude subscription credential per Archon user. The CLI runs as no user, so every CLI-started run failed with "no usable login".
   - **Wrong guesses:**
     - `ARCHON_USER_ID=<user uuid>` silently created a second, empty user;
     - `--cwd` on `bun` moved the CLI out of the repository ("Not in a git repository").
   - **Fix.** `archon user link <user-id> cli:<name>`, then `ARCHON_USER_ID=<name>`. Run the CLI from the project's clone: `bun /app/packages/cli/src/cli.ts …`.
   - **For our pack.** Unattended runs need an explicit run-as user (trigger bindings take `--run-as`).
5. **The browser OAuth login redirects to `localhost`.**
   - **What happened.** Claude's subscription login ends on a `localhost` URL that does not open on a server.
   - **Fix.** Archon's dialog has a field "Paste code or localhost callback URL": paste the whole failed URL there.
6. **No `archon` binary in the Docker image.**
   - **What happened.** The CLI exists only as `bun run cli` / `bun packages/cli/src/cli.ts` inside `/app`.
7. **`archon doctor` fails on Pi without a model.**
   - **What happened.** The Pi provider check fails until a model is set. It is harmless if Pi is not used, but `doctor` exits 1, so it cannot be a health gate as is.

## Repository and branches

8. **The pack builds only from the forge's default branch.**
   - **What happened.** `fetchDefaultBranch` in `.shared/remote.ts` reads the remote `HEAD`; nothing in config overrides it. A repository whose integration branch (`develop`) is not the default (`main`) gets "a fresh round must start on main, but the checkout's HEAD is not on it". `worktree.baseBranch` in `.archon/config.yaml` does not change this.
   - **Fix.**
     - Make `develop` the default branch on GitHub.
     - Before switching, check that nothing depends on `main` being default: dependabot targets, scheduled workflows, deploy triggers.
   - **For our pack.** The integration branch must be the default branch, or we patch `remote.ts` in our copy of the pack.
9. **Settings are read from the default branch on the remote.**
   - **What happened.** `.archon/packs/sdlc.yaml`, `.archon/sdlc/policy/maintainers.json` and `.archon/config.yaml` count only when they are on the remote default branch. Changing the default branch means copying them there first.
10. **The project clone's local branch names can mislead.**
    - **What happened.** After choosing `develop` as base branch in the "Add project" dialog, the clone's local `main` tracked `develop`'s history, and a later `git pull origin main` refused to fast-forward. It looked like 294 local commits, but they were develop's merged PRs.
    - **Fix.** `git checkout -B develop origin/develop` in the clone.
11. **The "Add project" dialog defaults Base branch to the remote default.**
    - **What happened.** Leaving it as `main` would cut every work branch from the release branch.

## Intake and triage

12. **Issues from a non-maintainer stop at intake.**
    - **What happened.** Only authors listed in `maintainers.json` are triaged; anyone else's issue gets `archon-needs-maintainer`. A maintainer then adds the label `archon-triage`, but the pack never creates that label, so `gh issue edit --add-label` fails until someone creates it.
    - **Fix.** Create `archon-triage` by hand.
    - **For our pack.** If an assistant account files issues, either list it as a maintainer or our intake trusts it explicitly.
13. **Starting intake by hand means faking a webhook event.**
    - **What happened.** The web form for `archon-intake` shows 7 raw webhook fields (`repo_host`, `kind`, `action`, `label`, `label_actor`, …). The label event's `action` is `added`, not GitHub's `labeled`; with `labeled` the facts node fails.
    - **For our pack.** Starts must come from webhooks or bindings; a person should never see this form.
14. **Triage missed already-done work; the build queue caught it.**
    - **What happened.**
      - An issue already implemented by a merged PR (linked by number in the PR title) was triaged "ready" at $0.20.
      - The build queue, before launching any agent, found the merged PR and asked "park or verify", recommending park with high confidence.
    - **For our pack.** Our spec puts "already built" in Triage. Archon checks it only at build; either move the check or accept it there.
15. **Triage output is useful as is.**
    - **What happened.** Each triage returns type, size, complexity, importance and urgency, each with a one-line reason, plus labels `archon-ready`, `archon-size-*` and `archon-type-*` on the issue. There is no risk class (our R0/R1/R2).

## Build queue and rounds

16. **An answer does not start the next round.**
    - **What happened.** Answering the build queue's question ("launch the deliver round?") completes that run with outcome `continue`. The round itself starts only on the next build-queue run, so without trigger bindings every step needs a manual re-run.
    - **For our pack.** Install the pack's bindings (`archon pack bindings sdlc`) or our own, so an answer moves the item on by itself.
17. **`workflow wait` does not always return on a pause.**
    - **What happened.** For one paused build round, a `workflow wait` started before the pause kept waiting. `workflow get` showed `paused` with an open question. Polling `workflow get` every minute was reliable.
18. **A red integration branch blocks every PR, and the pack handles it well.**
    - **What happened.**
      - The integration branch itself had 2 broken import contracts and 14 failing pytest tests.
      - The round did not hide it. It asked, with options, whether to wait, fix in the PR, or except the known breaks.
      - With "except", it ran the same pytest selection at the merged base in a separate worktree and compared the failing test ids. They were identical (14 failed, 3,697 passed at base; 3,698 at head). Only then did it accept them.
      - It asked twice: once for the contracts, once for the 14 tests, because the first ruling covered only the contracts.
    - **For our pack.** "Known breaks on the base" is a real, frequent state. Our fix-round limit must not count it as the PR's failure.
19. **No Docker inside the agent host.**
    - **What happened.** The repository's check script expects Docker for some steps. The agent ran each step of `tools/check.sh` by hand and skipped `--stack` tests and the pre-commit tests that need Docker. It reported this honestly.
    - **For our pack.** The sandbox must provide what the project's checks need (Docker-in-VM or a remote builder), or the validation is partial.
20. **The agent installs missing toolchains itself.**
    - **What happened.** For the TypeScript tests it installed Node through `uv pip install nodejs-wheel-binaries` in a scratch venv, because the image's Node did not fit. It worked, but it means open egress.
21. **Publishing the PR failed after a clean validation.**
    - **What happened.** A round that only merged the base and re-validated failed at `pr__publish`: "the caller named pull request 1512 to continue, but prepare declared none". The work was done and pushed (the PR head moved), but the validation was not recorded, so the item stayed `next`.
    - **Status.** A `dev`-build bug in the pack's prepare/publish contract. A retry of the build queue did not resume the publish: it asked again (high-confidence recommendation) whether to launch a validation-only round at the same head, i.e. the full `tools/check.sh` once more (~20 min) only to record it and hand off. Another Operator approval, another round.
    - **For our pack.** A failed last step should resume at that step, not re-run the validation; our engine records the check result as its own fact so publishing can retry alone.
22. **Under `ci: none`, a host without Docker can never record a pass.**
    - **What happened.**
      - The validation-only round ran the full check again and still recorded `passed: false`, for three reasons:
        - the project's check script stops at its Docker steps (gitleaks, the PostgreSQL store tests);
        - the CI step called `uv run pytest`, which fails because the venv has no pytest;
        - it read the excepted, inherited pytest failures as "not a pass".
      - The agent said so itself: "Six rounds have now run without a recorded validation."
      - It asked whether to except the Docker steps or park until a runner with Docker exists. Meanwhile the PR stays a draft and drifts behind the base.
    - **For our pack.**
      - The agent host must run every step of the project's own check.
      - An exception ruling must be applied by the CI step, not only by the implementer.
      - A loop of "validate again" rounds needs a stop: our shared limit of 3 rounds would have parked this item after the third.
23. **Cost of one small issue end to end.**
    - **Size.** One S-size issue: 7 files, +52/−11.
    - **Cost.**
      - triage: $0.20;
      - build decisions: $0.14 each;
      - first deliver round with multi-lens review: $6.17;
      - validation rounds: $2.64, $1.67, $0.32 (decision) and $2.94.
      - Total about $14, on Claude only; Codex was not connected, and still no recorded validation.
    - **Effort.** Five Operator decisions and three deployment fixes to reach a ready PR.

## Merge safety

24. **Agents get the full GitHub token.**
    - **What happened.** Archon passes `GH_TOKEN` to agent sessions, so an agent can `gh pr merge` or push to the integration branch.
    - **Fix.** Wrapper scripts for `gh` and `git` in `/usr/local/bin`, ahead of `/usr/bin`. They refuse `gh pr merge`, merge calls through `gh api`, and pushes to `develop`/`main`/`master`; verified with real commands. Archon's own merge step uses the forge REST API, not `gh`, so it is unaffected.
    - **For our pack.** This is a stopgap. The real fix is the sandbox with a push proxy limited to one branch.
25. **In 0.14.0 the merge queue's agent merges by itself.**
    - **What happened.** In `dev` the agent only declares `merge` and a script gates and merges. With `merge_lane: manual`, nothing merges without a maintainer's approval at the PR head.

## Operator experience

26. **Good: questions carry a recommendation and its reason.**
    - **What happened.** Every stop came as one question with options, what each does, a recommended option with confidence and why, and a ready `respond` command. `--recommended` answers with the recommended option.
27. **Weak: the manual run form and the stalled-between-steps feel.**
    - **What happened.** Without bindings the Operator (or we) must re-run the queue after each answer. The web form for starting a workflow is a raw list of webhook fields.

## Open

- Whether the retry of the publish step succeeds (entries 21–22).
- Codex as the cross-family reviewer is not connected yet.
- The sandbox (microVM per session, closed egress, push proxy) is not built yet; agents run in the Archon container with open network.
