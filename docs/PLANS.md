# PLANS

Planning workflow:

1. Capture complex active plans in `docs/exec-plans/active/`.
2. Define explicit acceptance checks per bounded validate loop.
3. Move completed plans to `docs/exec-plans/completed/`.
4. Track follow-up debt in `docs/exec-plans/tech-debt-tracker.md`.

Repository-local plan storage is exclusive:
- Active checked-in execution plans must live in `docs/exec-plans/active/`.
- Completed checked-in execution plans must live in `docs/exec-plans/completed/`.
- Do not create or save plans under `docs/superpowers/plans/`, even when an external skill suggests that default path.

Plan files should include:
- objective,
- current status,
- acceptance checks,
- decision log when tradeoffs matter.

Related:
- `docs/exec-plans/active/README.md`
- `docs/exec-plans/completed/README.md`
- `docs/exec-plans/tech-debt-tracker.md`
