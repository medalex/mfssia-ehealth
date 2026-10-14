# Evidence-boundary feasibility pilot

Exploratory harness, not part of MFSSIA. It talks to MFSSIA only over HTTP
(`GET /evidence-status/:patientId`, `GET /audit-events?runId=`).

Questions: (1) does an agent add anything over a deterministic workflow with a policy gate;
(2) does explicit evidence-boundary information change its behaviour; (3) does an independent
audit catch decisions that go beyond the available evidence.

| Code | Decides | Agent sees from get_evidence | Declaration |
|---|---|---|---|
| A | policy gate, no LLM | full MFSSIA answer | — |
| B | agent | lost boundary: present → answer, confirmed_absent / unknown → `[]` | no |
| C1 | agent | full answer: state, reason, stale, measuredAt | no |
| C2 | agent | lost boundary | yes |
| C3 | agent | full answer | yes |

## Layout

```
data/        custodians.yaml, policy.yaml, tasks.yaml, scenarios.yaml (hand labels + expected seed evidence)
prompts/     system.txt, declaration.txt (C2/C3 only), user.txt, nudge.txt, tools.yaml — published as is
adapters/    model interface (base.py) + Anthropic implementation
policy.py    policy logic shared by the gate (A) and audit check 3
policy_gate.py, agent.py, boundary.py, audit.py, report.py, run.py
tests/       no API calls, no live MFSSIA
out/         results.csv, summary.md, transcripts/{runId}.jsonl
```

## Running

```
pip install -r pilot/requirements.txt          # Python 3.11
pytest pilot/tests

# MFSSIA: PILOT_DEMO_SEED=true EVIDENCE_REFERENCE_TIME=2026-10-10T00:00:00Z
export MFSSIA_URL=http://localhost:3000/api ANTHROPIC_API_KEY=... PILOT_MODELS=claude-opus-5-5,claude-sonnet-5-5
python pilot/run.py --smoke                    # 1 model, 1 repetition: 8 gate + 32 agent runs
python pilot/run.py                            # full matrix (PILOT_REPS, default 10)
python pilot/report.py                         # rebuild summary.md from results.csv
```

Optional: `PILOT_TEMPERATURE` (default 0, `none` to omit), `PILOT_EFFORT`, `--conditions`, `--tasks`,
`--patients`, `--tag` (suffix for runIds that already exist in the journal).
