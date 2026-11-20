---

# Work item size and risk

<div class="grid2">
<div>

**Size** decides what is written down and approved. The agent always reads the code.

| | What | The Operator approves |
|---|---|---|
| **S** | small | nothing, straight to code |
| **M** | a feature in one module | spec and plan |
| **L** | many modules | research, spec, plan |

</div>
<div>

**Risk** decides how to merge and deploy.

| | What | Merge | Production |
|---|---|---|---|
| **R0** | reversible, stays inside | itself | right away |
| **R1** | regular code behind checks | Operator, on evidence | right away |
| **R2** | irreversible or leaves the system | Operator reads the code | Operator |

</div>
</div>

The agent proposes size and risk with a reason; the Operator corrects them when accepting the work item.
