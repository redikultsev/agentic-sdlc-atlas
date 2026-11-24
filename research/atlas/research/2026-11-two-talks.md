# Two talks on software factories, read against the model

Date: 2026-11-24. Both read in full from the transcript shown on the video page. Numbers below are as said in the talks; none was checked by us.

## Sources

- **T1.** Dex Horthy, "12 Rules for a Software Factory That Doesn't Ship Slop", AI Engineer channel. https://www.youtube.com/watch?v=-NFMsM2y0Vk (read 2026-11-24).
- **T2.** "Staff" podcast, episode 098, on a software factory of one million lines that nobody reads (in Russian); the author shows his open factory, AFactory, which is developed only through itself (417 PRs, about 300 thousand lines of Rust, as said). https://www.youtube.com/watch?v=L5TqBwSnWSk (read 2026-11-24).

## What agrees with the model

- The engine is deterministic: steps are advanced by code, agents think and do not steer (T2).
- Review by a model of another provider: implementer, reviewer and judge always differ (T2). A figure quoted in the episode's chat, one strong model finds about 42% of bugs and two from different vendors 56%, is a retelling and was not traced to a source.
- Limits per session, findings only with evidence, a green PR as a gate, planning before code, an agent checking the running app, decisions kept next to the code (T1, T2).

## What the model did not have

| # | Idea | Source | Our decision |
|---|---|---|---|
| 1 | Scheduled scenarios with their own memory that look for work ("ants"); in T2 they change code themselves | T2 | 55: scouts, read-only |
| 2 | Models left alone degrade a code base; a benchmark on evolving a code base step by step, where the best model scores about 16% (T1). A million lines whose upkeep grows with size; one PR deleted a hundred thousand lines; a separate reviewer for removals (T2) | T1, T2 | 56 |
| 3 | Planning depth = chance of rework × cost of rework: no debate on a button colour, the schema agreed in advance | T1 | 57 |
| 4 | A reviewer runs the tests without the implementation and catches those that pass anyway | T2 | 58, done by the Implementer once |
| 5 | What matters is which pipeline built a PR and how it was checked: pipeline, model per role, tokens, time in the task report | T2 | 59 |
| 6 | Agents filed 576 issues; moving to an internal backlog with deduplication before the tracker a person reads | T2 | 60 |
| 7 | Feature flags so that agents ship behind a flag and compare variants | T1 | 61, as a rollback only |
| 8 | The author does not look at the task screen: he asks his agent, through an interface of the factory made for agents | T2 | 62 |
