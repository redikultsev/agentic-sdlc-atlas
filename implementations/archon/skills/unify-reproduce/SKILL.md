---
name: unify-reproduce
description: How a pipeline agent reproduces a behaviour and reports it, including behaviour that differs from run to run. Open it before reproducing a bug, showing that a fix works, or checking a criterion on a running app.
---

# Reproduce, then report what was seen

1. **Go through the real entry point** the user or the system goes through (the public function, the endpoint, the command), with the smallest input that shows the behaviour. Keep throw-away scripts outside the repository, unless the script becomes the test.
2. **Record the exact command and its output.** Trim the output to the part that decides, never edit it.
3. **Run a control**: the nearest input that should come out right, through the same path. Without it you cannot tell the defect from a broken setup.
4. **Behaviour that varies between runs** (a model call, the network, timing, concurrency): run the same input at least 3 times and report the rate, "k of N", with each run's output kept. One run proves nothing either way. After a fix, the same runs show the new rate.
5. **Name every difference from the real case** as an assumption: synthetic data instead of the real attachment, a stub instead of a service, another model or another version. Say what the difference could hide.
6. **When a source is out of reach** (a dashboard, logs, a production system), first look for a local way to get the same fact (run the code with the case's input, read the logs the run itself writes). Only then report it as not checked, with what it would have shown.
