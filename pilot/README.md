# Evidence-boundary feasibility pilot (C#)

C# / .NET 10. Conditions A, B, C1, C2, C3. Inputs: `data/` (hand labels, policy, custodians,
scenarios) and `prompts/`. It talks to MFSSIA only over HTTP (`GET /evidence-status/:patientId`,
`GET /audit-events?runId=`).

## Layout

```
src/Pilot/
  Program.cs       entry point: builds the host (configuration + DI) and runs Runner
  ServiceCollectionExtensions.cs  AddPilot(): every registration, the JSON serializer settings; used by Program and tests
  Data.cs          PilotPaths, Prompts, PilotData, YamlLoader (data/, prompts/)
  ToolArguments.cs, DecisionValidator.cs   tool-call arguments to typed objects; submit_decision checks
  Basics.cs        runId, lost/full boundary
  Policy.cs        policy logic shared by the gate (A) and audit check 3
  PolicyGate.cs    condition A
  Agent.cs         agent loop and tools
  Audit.cs         independent audit against the MFSSIA journal
  Mfssia.cs        HTTP client (unwraps MFSSIA's {success, data} envelope)
  Runner.cs        CLI, run plan
  Configuration/   PilotOptions and how they are read (PilotOptionsSetup)
  Adapters/        model interface and IModelAdapterFactory, Anthropic (official SDK), OpenAI-compatible (raw HTTP)
  Models/          one type per file, namespace = folder (Pilot.Models.<Folder>):
    Mfssia/        what MFSSIA returns: EvidenceResponse, EvidenceSource, AuditEvent, MfssiaEnvelope
    Scenario/      pilot/data scenarios, custodians, tasks: Patient, ExpectedEvidence, Custodian, PilotTask
    Policy/        prescribing rules and their evaluation: PolicyFile, DrugRule, LabThreshold, Observation, Verdict, ...
    Tools/         agent tools: ToolDefinition, ObjectSchema, tool arguments and answers
    Llm/           the model-adapter contract: ToolSpec, ToolCall, Turn
    Decisions/     the final decision: Decision, DeclarationItem
    Runs/          a run and its result: Condition, ToolCallRecord, AgentResult, GateResult, RunOutcome, AuditCheck
    OpenAI/        /chat/completions wire types
  Exceptions/      MfssiaException, DecisionValidationException, PilotExitException (namespace Pilot.Exceptions)
  Reporting/       Score, ResultRow (+ ResultRow.From), ResultsCsv, SummaryReport, GateWarning, Transcript
                   (namespace Pilot.Reporting)
tests/Pilot.Tests/ xUnit tests; no API calls, no live MFSSIA.
                   TestHost builds the same container with configuration in memory and fakes swapped in.
out/               results.csv, summary.md, transcripts/{runId}.jsonl
```

## Running

```
dotnet test

# MFSSIA: PILOT_DEMO_SEED=true EVIDENCE_REFERENCE_TIME=2026-10-10T00:00:00Z
export MFSSIA_URL=http://localhost:4000/api ANTHROPIC_API_KEY=... PILOT_MODELS=claude-opus-5-5,claude-sonnet-5-5
dotnet run --project src/Pilot -- --smoke       # 1 model, 1 repetition: 8 gate + 32 agent runs
dotnet run --project src/Pilot --               # full matrix (PILOT_REPS, default 10)
dotnet run --project src/Pilot -- report        # rebuild summary.md from results.csv

# OpenAI-compatible APIs: prefix a model with oai:
PILOT_OPENAI_BASE_URL=https://openrouter.ai/api/v1 PILOT_OPENAI_API_KEY=... \
  PILOT_MODELS=oai:nvidia/nemotron-3-ultra-550b-a55b:free dotnet run --project src/Pilot -- --smoke
PILOT_OPENAI_BASE_URL=http://localhost:11434/v1 PILOT_MODELS=oai:qwen3:14b dotnet run --project src/Pilot -- --smoke
```

Options: `--conditions`, `--tasks`, `--patients`, `--models`, `--reps`, `--tag`
(suffix for runIds that already exist in the MFSSIA journal), `--out`.

### Configuration

Settings are `PilotOptions`, read from the `Pilot` section of [src/Pilot/appsettings.json](src/Pilot/appsettings.json)
(copied next to the built program, so it is found from any working directory) and from the environment
variables, which win: `MFSSIA_URL`, `PILOT_MODELS`,
`PILOT_REPS`, `PILOT_TEMPERATURE` (default 0, `none` to omit), `PILOT_EFFORT`, `PILOT_OPENAI_BASE_URL`,
`PILOT_OPENAI_API_KEY`, `PILOT_DIR` (path to this `pilot` folder if it is not found by walking up).
`ANTHROPIC_API_KEY` is read by the Anthropic SDK. `--models` and `--reps` override the settings for one run.

```json
{ "Pilot": { "MfssiaUrl": "http://localhost:4000/api", "Models": ["claude-opus-5-5"], "Reps": 5 } }
```

Keys (`PILOT_OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) belong in the environment, not in appsettings.json.

## Notes

- **Temperature with Anthropic models.** The C# SDK (13.x) has no sampling parameters, so temperature is
  never sent and `results.csv` says `not supported by the SDK; not applied`. OpenAI-compatible APIs get it.
- **Tool schemas sent to Anthropic** include `additionalProperties: false`, as written in `tools.yaml`.
- **Data are classes, serialised by System.Text.Json** (one `JsonSerializerOptions`, registered in `AddPilot`:
  snake_case for the pilot's own records, MFSSIA's camelCase names given explicitly, compact output,
  non-ASCII kept as is). JSON stays free-form (`JsonElement`) only where it is: the evidence `value`
  (a number or a list), the agent's `value_used`, tool schemas and raw provider responses. An MFSSIA answer
  is shown to the model with MFSSIA's field order and without the fields MFSSIA left out; unknown fields are kept.
- **A malformed `submit_decision`** is rejected with System.Text.Json's message (missing required
  property, wrong type) or the pilot's own rule (decision value, observed value, drug when prescribing).
