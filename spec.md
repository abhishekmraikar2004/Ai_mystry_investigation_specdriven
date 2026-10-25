---
last_updated: 2026-10-25
purpose: Single source of truth for Codex and all contributors
status: Implementation baseline
title: AI Mystery Room --- Master Product & Engineering Specification
version: 1.0.0
---

# AI Mystery Room

## Master Product & Engineering Specification (SSOT)

**Project type:** AI-powered fictional investigation / mystery-solving
web application\
**Architecture:** MERN (MongoDB, Express, React, Node.js)\
**AI provider:** Google Gemini\
**Primary user action:** Read a fictional case, inspect AI-generated
evidence, and submit a culprit accusation.

> **Authority rule:** This document is the canonical specification. If
> code, comments, prompts, UI copy, or other docs conflict with it, this
> document wins until explicitly amended. Codex must not silently change
> requirements. Record any proposed change in the Decisions / Open
> Questions section and ask before making a product-level assumption.

# 1. Product vision

AI Mystery Room lets a user provide a short fictional scenario, premise,
or story seed. The application turns it into a self-contained mystery
investigation. A fictional culprit, motive, timeline, suspects, and
evidence are generated with Gemini. The player explores evidence such as
chat messages, witness statements, images, CCTV-style clips or
transcripts, physical clues, and case notes, then chooses who they
believe committed the fictional crime.

The experience should feel like an interactive detective case: coherent,
fair, immersive, replayable, and solvable from the evidence provided.
The system must not merely produce dramatic text; it must maintain one
internally consistent ground truth and ensure evidence supports a
defensible solution.

## 1.1 Product principles

1.  **Fair-play mystery:** A correct solution must be supported by
    evidence available to the player before accusation.
2.  **Ground truth first:** Generate and validate a hidden solution
    before creating player-facing evidence.
3.  **Fictional and safe:** Cases, people, organizations, messages, and
    recordings are fictional. Do not present generated material as
    authentic evidence of real people or real events.
4.  **Server-authoritative:** The browser never determines the culprit,
    scoring, or whether an accusation is correct.
5.  **Graceful degradation:** If Gemini or media generation fails, the
    app should explain the failure, retry safely where appropriate, and
    never expose a half-built case as playable.
6.  **Accessible by default:** Keyboard support, clear contrast,
    responsive layouts, and alternatives to audio/video are required.
7.  **Inspectable implementation:** Typed schemas, clear API contracts,
    tests, logs, and documented environment variables are required.

# 2. Scope

## 2.1 MVP --- must ship

-   Responsive website with landing page and a clear "Create a Mystery"
    action.
-   User enters a short scenario/story seed and chooses difficulty and
    case length.
-   Backend validates input and creates a case-generation job.
-   Gemini generates a structured fictional case with suspects, hidden
    solution, timeline, evidence, hints, and an explanation.
-   Backend validates the generated case for schema correctness,
    consistency, and solvability before marking it playable.
-   Player can open a case, review its case brief, inspect suspect
    profiles, and open evidence items.
-   Evidence types supported in MVP: chat/message transcript, witness
    statement, text-based CCTV log/transcript, image clue (generated
    image or clearly labeled visual placeholder if image generation is
    unavailable), and physical/document clue.
-   User selects one suspect as culprit and submits one final
    accusation.
-   Server evaluates the accusation and returns result, explanation, and
    a summary of key evidence.
-   Case progress persists in MongoDB, including opened evidence and
    final answer.
-   Loading, empty, error, retry, and success states.
-   Basic rate limiting, input validation, safe rendering, secret
    management, and tests.
-   Local setup instructions and deployment-ready environment
    configuration.

## 2.2 Explicitly out of MVP unless separately approved

-   Multiplayer or collaborative investigations.
-   Public user-generated case marketplace or community uploads.
-   Real-world criminal investigation, real person accusations, or real
    evidence analysis.
-   User-to-user chat, comments, leaderboards, or social features.
-   Payments, subscriptions, advertisements, or purchases.
-   User-created custom characters, voice cloning, or real-person
    likeness generation.
-   Live camera feeds, real CCTV integration, or uploading actual
    private messages/recordings.
-   Complex branching narratives, free-text accusation adjudication, or
    an autonomous agent that changes the hidden solution mid-game.
-   Native mobile applications.
-   Full authentication unless explicitly enabled by a later decision.
    MVP should support anonymous play with a secure session/case access
    token; do not build a full identity system by default.

# 3. Target users and user stories

## 3.1 Target users

-   Casual players who enjoy detective stories, puzzles, escape rooms,
    and whodunit mysteries.
-   Users who want a personalized mystery generated from their own
    fictional premise.
-   Repeat players who want different cases and difficulty levels.

## 3.2 Core user stories

-   As a player, I can enter a fictional scenario so that the AI creates
    a mystery based on it.
-   As a player, I can select a difficulty and case length so that the
    mystery fits my preferred challenge.
-   As a player, I can see the case brief and list of suspects without
    seeing the answer.
-   As a player, I can inspect evidence one item at a time and revisit
    it later.
-   As a player, I can compare timestamps, statements, and clues to
    identify contradictions.
-   As a player, I can request a limited hint without immediately
    revealing the culprit.
-   As a player, I can submit a final accusation and understand why it
    was right or wrong.
-   As a player, I can resume an unfinished case after refreshing or
    reopening the case link.
-   As a player, I receive a clear error and can retry if case
    generation fails.
-   As a player, I can use the site on mobile, with a keyboard, and
    without relying only on audio or color.

# 4. Information architecture and routes

Use React Router. Route names are canonical unless an implementation
reason is documented.

  ---------------------------------------------------------------------------------------
  Route                                   Purpose                 Access
  --------------------------------------- ----------------------- -----------------------
  `/`                                     Landing page, product   Public
                                          explanation, create CTA 

  `/create`                               Scenario form and       Public
                                          generation options      

  `/cases/:caseId`                        Main investigation      Valid case access
                                          workspace               required

  `/cases/:caseId/evidence/:evidenceId`   Optional deep link to   Valid case access
                                          evidence detail; may be required
                                          a modal route           

  `/cases/:caseId/result`                 Final accusation        Case access required
                                          outcome and explanation 

  `*`                                     Not-found page          Public
  ---------------------------------------------------------------------------------------

MVP can use anonymous case access. On case creation, issue an opaque,
cryptographically random access token. Store only a hash of the token
server-side; deliver the raw token to the client in a secure, HttpOnly,
SameSite cookie when feasible. If cookie-based access is not feasible
for the deployment topology, use a documented alternative that avoids
exposing the token in logs or analytics. Do not rely on an unguessable
MongoDB ObjectId as authorization. Avoid placing access tokens in URLs.

# 5. Primary user journey

1.  User opens `/` and chooses **Create a Mystery**.
2.  User enters a fictional scenario (required), selects difficulty and
    case length, acknowledges that the case is fictional, and submits.
3.  Frontend sends the request to the API. The server validates it,
    applies rate limits, creates a case in `generating` state, and
    starts generation.
4.  Frontend shows generation progress with honest stage labels; do not
    claim a stage has completed unless the server reports it.
5.  Backend creates a hidden case blueprint (solution, culprit, motive,
    timeline, suspect facts), creates player-facing evidence from that
    blueprint, validates the result, and stores it.
6.  When generation succeeds, the case status becomes `ready`; the user
    is routed to the investigation workspace.
7.  User reads the case brief, inspects suspects and evidence, and
    optionally requests a hint.
8.  User selects a suspect and submits a final accusation. Confirm the
    irreversible action in the UI.
9.  Backend checks that the case is ready, the suspect belongs to the
    case, and no final accusation has already been submitted.
10. Backend records the answer and returns the result. The result page
    explains the outcome and cites relevant evidence by title/ID.
11. User can start a new case. MVP does not require a global account or
    cross-device history.

# 6. Functional requirements

Priority labels: **P0** = required for MVP; **P1** = desirable after
MVP; **P2** = future.

## 6.1 Case creation

-   **FR-001 (P0):** Accept a user-written fictional scenario between 30
    and 1,000 characters after trimming.
-   **FR-002 (P0):** Reject empty, whitespace-only, oversized, or
    clearly unsupported input with actionable validation text.
-   **FR-003 (P0):** Allow difficulty: `easy`, `medium`, `hard`.
-   **FR-004 (P0):** Allow case length: `short`, `standard`. Short
    generates 3 suspects and 5--7 evidence items; standard generates
    4--5 suspects and 8--12 evidence items.
-   **FR-005 (P0):** Show a fictional-content acknowledgement before
    generation.
-   **FR-006 (P0):** Return a case ID and generation status quickly; do
    not hold the HTTP request open for the entire AI generation if it
    risks timeout.
-   **FR-007 (P0):** Provide polling or another documented status
    mechanism for generation progress.
-   **FR-008 (P0):** A failed generation must result in a terminal
    `failed` state with a safe error code and retry action; never show
    an incomplete case as playable.
-   **FR-009 (P0):** Repeated client retries must not create duplicate
    cases when the same idempotency key is reused.
-   **FR-010 (P1):** Allow user-provided optional title/theme, with
    length and safety limits.

## 6.2 Investigation workspace

-   **FR-020 (P0):** Display title, premise, location, fictional
    date/time, case summary, and objective.
-   **FR-021 (P0):** Display all suspects with name, role, short
    description, plausible motive, and alibi. Do not display hidden
    culprit flags or hidden-solution data.
-   **FR-022 (P0):** Display evidence grouped by type or investigative
    relevance.
-   **FR-023 (P0):** Evidence detail shows title, type, source, in-world
    timestamp where relevant, content, and any reliability/forensic
    notes the story requires.
-   **FR-024 (P0):** Support text evidence, message transcripts, witness
    statements, CCTV transcript/log, documents/physical clues, and image
    clues.
-   **FR-025 (P0):** Any media unavailable at runtime must have a useful
    text equivalent and an explicit label such as "Illustrative
    AI-generated image" or "CCTV transcript"; never imply that a
    generated image is actual CCTV footage.
-   **FR-026 (P0):** Show which evidence the user has opened; persist
    progress server-side.
-   **FR-027 (P0):** Do not reveal the culprit, solution rationale, or
    private ground truth before the final accusation.
-   **FR-028 (P1):** Allow bookmarking or pinning evidence.
-   **FR-029 (P1):** Provide a timeline view that uses only
    player-visible facts.

## 6.3 Hints

-   **FR-030 (P0):** Offer a maximum of 3 progressive hints per case.
-   **FR-031 (P0):** Each hint must be generated or selected from the
    validated case and must not name the culprit directly unless it is
    the final hint and the user explicitly confirms a solution reveal
    (MVP may instead keep all hints non-spoiling).
-   **FR-032 (P0):** Persist hint usage and enforce the limit on the
    server.
-   **FR-033 (P0):** A hint must refer to actual evidence IDs or facts
    present in the case; it must not invent new evidence.
-   **FR-034 (P1):** Show a simple hint-use count or optional score
    impact, if scoring is later enabled.

## 6.4 Accusation and result

-   **FR-040 (P0):** Allow one final accusation per case in MVP.
-   **FR-041 (P0):** The selected suspect ID must belong to the case.
-   **FR-042 (P0):** Server compares the selected suspect ID to the
    stored hidden culprit ID; the client cannot supply or override
    correctness.
-   **FR-043 (P0):** Store the final accusation, submission time, and
    result.
-   **FR-044 (P0):** Return an explanation that identifies decisive
    evidence by evidence ID/title and explains how it supports or
    contradicts the accusation.
-   **FR-045 (P0):** Do not include the hidden solution in ordinary
    case, suspect, evidence, or generation-status API responses.
-   **FR-046 (P0):** A second final submission returns
    `409 ACCUSATION_ALREADY_SUBMITTED` and does not overwrite the first
    answer.
-   **FR-047 (P1):** Add a score based on difficulty, hints used, and
    evidence reviewed only after scoring rules are formally specified.

## 6.5 Case lifecycle and reliability

-   **FR-050 (P0):** Valid statuses: `generating`, `ready`, `failed`,
    `completed`, `expired` (expiration can be disabled for MVP but must
    be handled if configured).
-   **FR-051 (P0):** Only `ready` cases can be investigated and accused.
-   **FR-052 (P0):** Use timeouts, bounded retries, and safe failure
    handling for Gemini.
-   **FR-053 (P0):** Prevent concurrent duplicate generation or
    finalization for the same case.
-   **FR-054 (P0):** Provide a health endpoint that does not expose
    secrets or internal configuration.
-   **FR-055 (P0):** Log request IDs, generation duration, provider
    failures, and safe error codes; never log access tokens, secrets,
    full private tokens, or the hidden solution in production logs.

# 7. Mystery design and AI generation contract

This is the most important product rule: **the AI must generate one
coherent case, not independent pieces of creative writing.**

## 7.1 Generation pipeline

1.  **Normalize and validate input.** Trim the scenario, enforce length,
    validate options, and apply safety checks.
2.  **Create blueprint.** Ask Gemini for structured JSON describing the
    true events, culprit, motive, opportunity, timeline, suspects, and
    intended resolution. This is server-only.
3.  **Validate blueprint.** Validate schema and story constraints. If
    invalid, retry with a bounded repair prompt.
4.  **Generate evidence from blueprint.** Create evidence items that are
    consistent with the blueprint. Evidence must contain a mix of
    direct, circumstantial, misleading-but-fair, and exculpatory clues.
5.  **Validate evidence.** Check references, timestamps, suspect IDs,
    evidence count, contradictions, and solvability.
6.  **Generate hints and resolution.** Each hint and explanation must
    refer to evidence already present.
7.  **Optional media generation.** If image generation is available
    through an explicitly configured provider, generate safe
    illustrative assets. Gemini text generation alone must not be
    assumed to produce image files.
8.  **Persist atomically.** Store the complete validated case and set
    status to `ready` in one logical operation. If any mandatory step
    fails, mark the case `failed`.
9.  **Return player-safe data.** Serialize only fields explicitly
    allowed for the public API.

## 7.2 Ground-truth blueprint fields (server-only)

-   `culpritSuspectId`
-   `motive`
-   `method` (fictional, non-graphic, high-level)
-   `opportunity`
-   `trueTimeline[]`
-   `truthFacts[]`
-   `redHerrings[]` with explanation of why they are misleading but fair
-   `decisiveEvidenceIds[]`
-   `suspectTruthNotes[]`
-   `solutionExplanation`
-   `consistencyChecks[]` or validation metadata
-   generation model and prompt version metadata (not secrets)

These fields must never be sent to the browser before accusation. The
backend must enforce allowlisted response DTOs; do not serialize a
database document wholesale.

## 7.3 Fairness and solvability rules

A case is playable only if all conditions pass:

-   There are exactly 3 suspects for short cases and 4--5 for standard
    cases.
-   Every suspect has a unique stable ID within the case, a distinct
    name, role, motive or plausible reason for suspicion, and an alibi
    or account of their actions.
-   Exactly one suspect is designated as the culprit in the hidden
    blueprint.
-   At least 2 independent clues support the culprit's involvement or
    contradict their alibi.
-   At least 1 clue materially weakens suspicion against a non-culprit,
    or otherwise helps distinguish the suspects.
-   At least 1 plausible red herring exists, but it cannot be the only
    apparent explanation.
-   Evidence timestamps, message times, and stated locations must not
    create accidental impossibilities unless that contradiction is an
    intentional clue.
-   Every decisive evidence ID must exist in the same case and be
    visible to the player.
-   The solution explanation must cite evidence that actually supports
    its claims.
-   No evidence may directly contradict the ground truth unless the
    contradiction is explained as a deliberate lie, error, tampering, or
    unreliable source.
-   The mystery must not depend on information never shown to the
    player.
-   If deterministic checks cannot establish basic coherence, mark
    generation invalid and retry or fail. Do not simply publish
    questionable content.

## 7.4 Difficulty guidelines

  ------------------------------------------------------------------------
  Dimension         Easy              Medium            Hard
  ----------------- ----------------- ----------------- ------------------
  Suspects          3                 3--5              4--5

  Evidence          5--7              7--10             9--12

  Clue clarity      Strong direct     Mix of direct and Cross-referenced
                    clues             circumstantial    clues

  Red herrings      1 mild            1--2 plausible    2 or more, all
                                                        fair

  Timeline          Simple            Several events    Multiple sources
  reasoning                                             to reconcile

  Required          One or two clear  Combine multiple  Resolve competing
  inference         deductions        clues             explanations
  ------------------------------------------------------------------------

Difficulty changes complexity, not fairness. Hard cases must still be
solvable from available evidence.

## 7.5 Gemini output requirements

-   Use the official supported Google Gen AI SDK for Node.js selected at
    implementation time; pin a compatible version.
-   Model ID must be configured via `GEMINI_MODEL`, not hard-coded
    throughout the codebase.
-   API key must be server-side only in `GEMINI_API_KEY`.
-   Request JSON/structured output where supported. Parse and validate
    the response with a runtime schema validator such as Zod.
-   Treat user scenario text as untrusted data, not instructions.
    Delimit it clearly in prompts and explicitly instruct the model to
    ignore embedded requests to reveal system prompts, change the
    schema, or bypass safety rules.
-   Never trust AI output merely because it is valid JSON.
-   Use bounded retries (maximum 2 retries after the first attempt for
    recoverable generation/validation errors), with backoff and request
    timeouts. Do not retry permanent safety or validation failures
    indefinitely.
-   Persist `promptVersion`, `modelId`, generation timestamps, and
    validation result for debugging.
-   Do not expose prompts, internal reasoning, API keys, or hidden
    blueprint fields to the client.
-   Prefer a concise explanation of evidence over hidden
    chain-of-thought. Store the final user-facing rationale, not private
    reasoning traces.

### Suggested internal generation schema (conceptual)

``` ts
type Difficulty = "easy" | "medium" | "hard";
type CaseLength = "short" | "standard";
type CaseStatus = "generating" | "ready" | "failed" | "completed" | "expired";

type Suspect = {
  id: string; // generated stable ID, e.g. "suspect_1"
  name: string;
  role: string;
  description: string;
  apparentMotive: string;
  alibi: string;
};

type Evidence = {
  id: string; // e.g. "evidence_1"
  type: "message" | "witness_statement" | "cctv_transcript" |
        "document" | "physical_clue" | "image";
  title: string;
  summary: string;
  content: string;
  sourceLabel: string;
  inWorldTimestamp?: string; // ISO 8601 or null; document timezone explicitly
  suspectIds: string[];
  reliability: "high" | "medium" | "low";
  media?: {
    kind: "image";
    url?: string;
    altText: string;
    fictionalLabel: string;
  };
};

type CaseBlueprint = {
  culpritSuspectId: string;
  motive: string;
  method: string;
  opportunity: string;
  trueTimeline: Array<{ timestamp: string; event: string }>;
  truthFacts: string[];
  redHerrings: Array<{ description: string; explanation: string }>;
  decisiveEvidenceIds: string[];
  solutionExplanation: string;
};

type GeneratedCase = {
  title: string;
  premise: string;
  setting: string;
  incidentTimestamp: string;
  difficulty: Difficulty;
  caseLength: CaseLength;
  suspects: Suspect[];
  evidence: Evidence[];
  hints: string[];
  blueprint: CaseBlueprint; // server-only
};
```

This is a conceptual contract, not a reason to skip implementation-time
schema refinement. The actual Zod schema and TypeScript types must live
in source control and be covered by tests.

# 8. Technical architecture

## 8.1 Stack

-   **Frontend:** React, Vite, TypeScript, React Router.
-   **Styling:** Tailwind CSS or CSS Modules. Choose one primary
    approach and use it consistently.
-   **Backend:** Node.js, Express, TypeScript.
-   **Database:** MongoDB with Mongoose or the official MongoDB driver.
    Choose one and standardize.
-   **AI:** Google Gemini via server-side SDK.
-   **Validation:** Zod (shared request/response types where practical).
-   **Testing:** Vitest + React Testing Library for frontend; Jest or
    Vitest + Supertest for API; Playwright for end-to-end tests. Prefer
    one unit-test runner across frontend/backend if feasible.
-   **Lint/format:** ESLint and Prettier.
-   **Package manager:** npm workspaces in a monorepo.
-   **Deployment:** Any platform that supports a static React frontend,
    Node API, and managed MongoDB. Deployment provider is a configurable
    decision, not a product requirement.

Use TypeScript for both frontend and backend. Do not mix CommonJS and
ESM arbitrarily. Pin Node to an active LTS version compatible with the
chosen dependencies and document it in `.nvmrc` or `engines`.

## 8.2 Suggested monorepo layout

``` text
ai-mystery-room/
  apps/
    web/
      src/
        app/
        components/
        features/
          create-case/
          investigation/
          evidence/
          accusation/
        lib/
        routes/
        styles/
      public/
      tests/
      package.json
      vite.config.ts
    api/
      src/
        config/
        middleware/
        modules/
          cases/
          generation/
          evidence/
          hints/
          accusations/
        services/
          gemini/
        db/
        schemas/
        utils/
        app.ts
        server.ts
      tests/
      package.json
  packages/
    shared/
      src/
        schemas/
        types/
        constants/
      package.json
  docs/
    SPEC.md
    API.md
    DATA_MODEL.md
    ADR/
  .env.example
  .gitignore
  package.json
  README.md
```

Codex may adjust folder names if the repository already has a sound
convention, but must preserve the separation between UI, API, shared
schemas, AI provider logic, and persistence.

## 8.3 Architecture rules

-   React must call the API; it must never connect directly to MongoDB
    or Gemini.
-   Routes/controllers validate input and delegate business logic to
    services.
-   Gemini calls live behind a provider/service module, not inside route
    handlers.
-   MongoDB access lives in repositories/models, not in React
    components.
-   Public response DTOs are explicit allowlists.
-   Shared schemas should be reused by frontend and backend where
    practical.
-   Secrets are read from environment variables and validated at
    startup.
-   API errors use a consistent shape and safe public messages.
-   All timestamps stored in UTC; in-world timestamps include an
    explicit timezone or are consistently normalized to UTC.
-   The server owns all status transitions and final-answer evaluation.

# 9. Data model

Use MongoDB collections. Names and fields below define the logical
model; add indexes and timestamps. Do not store secrets in case
documents.

## 9.1 `cases`

``` ts
{
  _id: ObjectId,
  publicId: string,                   // random public identifier or ObjectId string
  accessTokenHash: string,             // hash only; never raw token
  status: "generating" | "ready" | "failed" | "completed" | "expired",
  input: {
    scenario: string,
    difficulty: "easy" | "medium" | "hard",
    caseLength: "short" | "standard"
  },
  publicCase: {
    title: string,
    premise: string,
    setting: string,
    incidentTimestamp: string,
    suspects: Suspect[],
    evidence: Evidence[],
    hints: string[]                    // public hints must be revealed one at a time
  },
  privateSolution: {
    culpritSuspectId: string,
    motive: string,
    method: string,
    opportunity: string,
    trueTimeline: Array<{ timestamp: string; event: string }>,
    truthFacts: string[],
    redHerrings: Array<{ description: string; explanation: string }>,
    decisiveEvidenceIds: string[],
    solutionExplanation: string
  },
  progress: {
    openedEvidenceIds: string[],
    hintsUsed: number,
    createdAt: Date,
    updatedAt: Date
  },
  accusation?: {
    suspectId: string,
    correct: boolean,
    submittedAt: Date
  },
  generation: {
    modelId: string,
    promptVersion: string,
    attemptCount: number,
    startedAt: Date,
    completedAt?: Date,
    failureCode?: string,
    validationSummary?: string[]
  },
  expiresAt?: Date
}
```

Implementation note: `publicCase` and `privateSolution` can be separate
collections if that makes access control and accidental serialization
safer. This is encouraged for stronger separation. Never return the full
document directly from a controller.

## 9.2 Optional `generationJobs`

If generation is asynchronous or deployed on serverless infrastructure,
use a separate job record:

``` ts
{
  _id: ObjectId,
  caseId: ObjectId,
  status: "queued" | "running" | "succeeded" | "failed",
  stage: "blueprint" | "evidence" | "validation" | "media" | "persist",
  progressPercent: number, // approximate; do not imply exact certainty
  attemptCount: number,
  safeErrorCode?: string,
  createdAt: Date,
  updatedAt: Date
}
```

Do not claim true background-job durability unless a persistent
queue/worker is actually configured. If using a single Node process for
MVP, document the limitation and implement recoverable status handling.

## 9.3 Indexes and retention

-   Unique index on `publicId`.
-   Index on case status and creation time for operational queries.
-   Unique generation-job key if jobs are separate.
-   TTL index on `expiresAt` only if case expiration is enabled.
-   Never TTL-delete cases unexpectedly without informing the user.
-   Avoid storing IP addresses or analytics identifiers unless justified
    and disclosed.

# 10. API contract

Base path: `/api/v1`. JSON request and response bodies. All errors use
the standard error envelope below.

## 10.1 Standard error shape

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "requestId": "req_...",
    "details": [
      { "field": "scenario", "message": "Scenario must be 30–1000 characters." }
    ]
  }
}
```

`details` is optional. Never include stack traces, provider raw
responses, secrets, hidden culprit information, or internal prompts in
public errors.

## 10.2 Endpoints

### `GET /api/v1/health`

Returns service health, API version, and database connectivity status
where safe. Do not return secrets, connection strings, model keys, or
environment dumps.

### `POST /api/v1/cases`

Creates a new case.

Request:

``` json
{
  "scenario": "A rare painting disappears from a locked gallery during a storm.",
  "difficulty": "medium",
  "caseLength": "standard",
  "fictionalContentAcknowledged": true
}
```

Headers: `Idempotency-Key` required for the frontend; use a UUID/random
value per intentional create action.

Response: `202 Accepted`

``` json
{
  "caseId": "public-case-id",
  "status": "generating",
  "statusUrl": "/api/v1/cases/public-case-id/status"
}
```

Errors: `400 VALIDATION_ERROR`, `429 RATE_LIMITED`,
`503 GENERATION_UNAVAILABLE` only if the request cannot be accepted at
all.

### `GET /api/v1/cases/:caseId/status`

Returns status and safe progress only:

``` json
{
  "caseId": "public-case-id",
  "status": "generating",
  "stage": "evidence",
  "progressPercent": 55,
  "error": null
}
```

On failure, return a safe error code and retry guidance. Do not expose
blueprint data or prompts.

### `GET /api/v1/cases/:caseId`

Returns the player-safe case view. Only allowed when status is `ready`
or `completed`. Includes case brief, suspects, evidence index, progress,
and whether an accusation has been submitted. It does not include hidden
solution fields or unopened hint content.

### `GET /api/v1/cases/:caseId/evidence/:evidenceId`

Returns one evidence item if it belongs to the case. Records it as
opened server-side. Reject unknown evidence IDs. Do not leak unrelated
evidence or solution metadata.

### `POST /api/v1/cases/:caseId/hints`

Request:

``` json
{ "hintLevel": 1 }
```

The server enforces progressive order and the 3-hint maximum. Response
returns only the requested hint and remaining count. Repeated request
for a previously unlocked hint should be idempotent.

### `POST /api/v1/cases/:caseId/accusation`

Request:

``` json
{ "suspectId": "suspect_2" }
```

Response:

``` json
{
  "caseId": "public-case-id",
  "submittedSuspectId": "suspect_2",
  "correct": false,
  "result": {
    "headline": "Not quite — review the evidence",
    "explanation": "The available timeline conflicts with this suspect's account...",
    "decisiveEvidence": [
      { "evidenceId": "evidence_3", "title": "Gallery Access Log", "relevance": "..." }
    ]
  }
}
```

The result is generated from stored validated facts or a precomputed
explanation; do not call Gemini at accusation time to decide
correctness. The API must return `409 ACCUSATION_ALREADY_SUBMITTED` for
a second final accusation and `400 INVALID_SUSPECT` if the suspect does
not belong to the case.

### `POST /api/v1/cases/:caseId/retry-generation`

Only enable if a failed case can be retried safely. Require valid case
access, enforce rate limits, preserve idempotency, and do not create
unlimited paid Gemini calls. It may be omitted from MVP in favor of
creating a new case.

## 10.3 API conventions

-   Use correct HTTP status codes.
-   Validate route parameters, query parameters, and JSON bodies.
-   Use a request ID for logs and responses.
-   Add API versioning from the start.
-   Configure CORS to exact allowed origins in production.
-   Apply rate limits to case creation, hint requests, and accusation
    requests.
-   Enforce maximum request body size.
-   Never trust client-supplied `correct`, `culpritSuspectId`,
    `solutionExplanation`, `status`, or `hintsUsed`.
-   Ensure access control on every case-specific endpoint.

# 11. Frontend UX and visual design

## 11.1 Art direction

Build a premium detective case-file experience rather than a generic AI
chat interface. The UI should feel atmospheric, modern, and legible:
dark charcoal/navy surfaces, warm paper-like evidence panels, restrained
amber/red accents, subtle grain or line motifs, clear typography, and
strong spacing. Atmosphere must never compromise readability or
accessibility. Avoid gratuitous blood, gore, or horror imagery.

Suggested visual tokens (adjust only for contrast/accessibility): -
Background: deep charcoal/navy. - Surface: slightly lighter slate. -
Evidence paper: warm off-white. - Primary accent: amber/gold. -
Secondary accent: muted teal. - Danger/error: accessible red, not
color-only. - Typography: a readable sans-serif for UI; optional
restrained serif for case titles. - Motion: short transitions; respect
`prefers-reduced-motion`.

## 11.2 Required pages/components

### Landing page

-   Product title and one-sentence value proposition.
-   Primary CTA: "Create a Mystery".
-   Brief three-step explanation: Create a scenario → Investigate
    evidence → Accuse the culprit.
-   Example fictional case teaser with a clear "fictional example"
    label.
-   Footer with privacy/fictional-content note.

### Create page

-   Scenario textarea with character counter and validation.
-   Difficulty selector with short descriptions.
-   Case-length selector.
-   Required acknowledgement that all cases/evidence are AI-generated
    fiction.
-   Submit button disabled while invalid/submitting.
-   Error state with retry or edit action.

### Generation state

-   Clear "Building your case" message.
-   Progress stages tied to server state, not fabricated real-time
    progress.
-   Poll status with backoff and stop polling after terminal status or
    unmount.
-   Timeout message with safe recovery action.
-   Do not expose raw AI output while generating.

### Investigation workspace

-   Header: case title, status, difficulty.
-   Case brief panel.
-   Suspect list/cards with name, role, alibi, apparent motive.
-   Evidence board/list with filters or type tabs.
-   Evidence detail drawer/modal/page with readable content and
    metadata.
-   "Opened" state for evidence.
-   Hint button with confirmation and remaining count.
-   Accusation panel that clearly lists suspects and asks for
    confirmation.
-   Mobile layout must remain usable without a dense multi-column board.

### Result page

-   Correct/incorrect outcome.
-   Final explanation and evidence citations.
-   Show the actual culprit only after submission.
-   "Play another mystery" CTA.
-   Do not shame users for a wrong answer.

### Global states

-   Loading skeletons, empty state, API error, generation failure,
    expired/invalid case, unauthorized case access, and not-found page.
-   Accessible toast/alert behavior and visible focus states.

## 11.3 Accessibility requirements

-   Meet WCAG 2.2 AA as a target.
-   All controls usable by keyboard.
-   Visible focus indicators.
-   Semantic heading hierarchy and labels.
-   Accessible dialogs with focus management and Escape behavior.
-   Images have meaningful alt text; decorative images use empty alt.
-   Video/audio has captions/transcripts and text alternatives.
-   Do not communicate status only with color.
-   Respect reduced-motion preferences.
-   Ensure readable contrast and scalable text.

# 12. Media generation and asset policy

The project description mentions WhatsApp-style messages, images, and
camera recordings. These are **fictional evidence formats**, not a
requirement to access or imitate actual private accounts or real CCTV.

## 12.1 MVP media strategy

-   Chat messages: render as a clearly fictional, app-styled
    conversation transcript. Do not use real phone numbers or real
    identifiable people.
-   CCTV: render a timestamped transcript/log, optionally paired with a
    fictional illustrative still. Label as "AI-generated fictional
    reconstruction --- not real footage."
-   Images: if a separate image-generation API/provider is configured,
    generate illustrative clues. Otherwise use designed SVG/CSS
    illustrations or labeled placeholders; never claim Gemini text
    output itself is an image file.
-   Audio/video: optional after MVP. If added, include
    transcript/captions, source label, and fallback content.
-   All media URLs must be validated and served from an approved
    storage/domain strategy. Do not render arbitrary URLs supplied by
    Gemini without validation.
-   Do not create realistic depictions of real private individuals or
    use real personal data in generated evidence.
-   Avoid logos/trademarks that imply a real platform endorsed or
    verified the case. A generic "fictional chat transcript" UI is safer
    than an exact WhatsApp clone.

# 13. Security, privacy, and safety

-   Keep `GEMINI_API_KEY`, MongoDB credentials, session signing secrets,
    and storage credentials on the server only.
-   Commit `.env.example`, never `.env`.
-   Add `.env`, build output, logs, and local secrets to `.gitignore`.
-   Validate and sanitize all user input; use schema validation and safe
    text rendering.
-   Avoid `dangerouslySetInnerHTML`; if rich text is essential, sanitize
    with a maintained library.
-   Use secure, HttpOnly, SameSite cookies where applicable; use HTTPS
    in production.
-   Store only hashed case access tokens and compare securely.
-   Apply per-IP and per-token rate limits. Configure proxy trust
    correctly in production.
-   Set Helmet/security headers, a strict CORS allowlist, and request
    size limits.
-   Prevent NoSQL injection by validating and constructing database
    queries; never pass raw user objects into MongoDB filters.
-   Protect against prompt injection by treating the scenario as
    content, not instruction. The model must not be able to change
    system constraints, reveal secrets, or request tools.
-   Add content moderation/safety checks appropriate to the chosen
    Gemini API. Reject or safely transform scenarios involving
    real-person allegations, sexual content involving minors, graphic
    violence, instructions for wrongdoing, or other disallowed harmful
    content.
-   The product is fictional entertainment, not a tool for identifying
    real criminals. Display this clearly in the UI.
-   Define retention and deletion behavior. For MVP, document how long
    anonymous cases remain stored; support deletion or expiration if
    required by deployment policy.
-   Do not include scenario text, access tokens, or hidden solutions in
    analytics events.
-   Return generic public errors; log sanitized diagnostic information
    server-side.

# 14. Error handling and observability

Use stable error codes, including: - `VALIDATION_ERROR` -
`FICTIONAL_ACKNOWLEDGEMENT_REQUIRED` - `CASE_NOT_FOUND` -
`CASE_NOT_READY` - `CASE_ACCESS_DENIED` - `GENERATION_FAILED` -
`GENERATION_TIMEOUT` - `AI_PROVIDER_UNAVAILABLE` - `AI_OUTPUT_INVALID` -
`EVIDENCE_NOT_FOUND` - `HINT_LIMIT_REACHED` - `INVALID_SUSPECT` -
`ACCUSATION_ALREADY_SUBMITTED` - `RATE_LIMITED` - `INTERNAL_ERROR`

Log structured JSON with `timestamp`, `level`, `requestId`, `route`,
`durationMs`, and safe error metadata. Redact secrets and access tokens.
Do not log entire prompts or private solution data in production by
default. Track basic metrics: generation success/failure rate,
generation duration, validation retry count, provider error rate, API
latency, and accusation endpoint errors. Monitoring must not require
sending sensitive user story text to third parties.

# 15. Testing strategy

## 15.1 Unit tests

-   Input schema boundaries: 29, 30, 1,000, 1,001 characters.
-   Difficulty and case-length validation.
-   Blueprint/evidence schema validation.
-   Case fairness invariants and evidence reference integrity.
-   Public DTO excludes every private-solution field.
-   Accusation correctness is calculated server-side.
-   Hint progression and limit.
-   Error mapping and retry/backoff logic.
-   Access-token hashing/verification.
-   Timestamp and timezone normalization.

## 15.2 API integration tests

-   Create case accepts valid input and rejects invalid input.
-   Idempotency key prevents duplicate creation.
-   Status endpoint reports generating, ready, and failed states
    correctly.
-   Unauthenticated/invalid access cannot read case or evidence.
-   Evidence endpoint only returns evidence for that case.
-   Opening evidence persists progress.
-   Hints are progressive and capped at 3.
-   Correct and incorrect accusations return the correct result.
-   Second accusation is rejected with 409.
-   Client cannot manipulate correctness, case status, or hint count.
-   Gemini timeout, malformed JSON, rate limit, and unavailable-provider
    behavior.
-   MongoDB unavailable behavior and safe health response.

Mock Gemini in automated tests. Tests must not spend real API credits or
depend on live model output.

## 15.3 Frontend tests

-   Create form validation and disabled/loading states.
-   Generation progress and failure/retry states.
-   Case brief and suspects render without hidden data.
-   Evidence details and opened state.
-   Hint interaction.
-   Accusation confirmation and result page.
-   Keyboard navigation, focus states, and dialog behavior.
-   Responsive layouts at mobile, tablet, and desktop widths.

## 15.4 End-to-end acceptance tests

1.  Create a valid short case using a mocked deterministic generator.
2.  Wait for `ready`, open the case, and confirm at least 5 evidence
    items.
3.  Open multiple evidence items and verify progress persists after
    refresh.
4.  Request hints 1, 2, and 3; verify hint 4 is rejected.
5.  Submit the correct suspect and verify result rationale cites real
    evidence.
6.  Attempt a second accusation and verify it is rejected.
7.  Create a case whose generation fails and verify no investigation
    workspace is accessible.
8.  Verify no browser network response contains `privateSolution`,
    `culpritSuspectId`, or equivalent hidden fields before accusation.
9.  Run at least one responsive/mobile viewport and keyboard-only
    navigation check.

# 16. Non-functional requirements

-   **Performance:** Initial frontend route should be lightweight;
    lazy-load noncritical pages/assets. Avoid arbitrary fixed wait
    times.
-   **Reliability:** A case is only playable after complete validation
    and persistence.
-   **Scalability:** Keep generation work separate from ordinary request
    handlers; make a persistent queue a documented upgrade path if MVP
    traffic requires it.
-   **Maintainability:** TypeScript strict mode, small modules, explicit
    interfaces, schema validation, consistent naming, and no giant route
    files.
-   **Portability:** App must run locally using documented commands and
    `.env`.
-   **Cost control:** Rate-limit generation, bound token/output sizes,
    cap retries, and expose provider usage metrics when available.
-   **Data integrity:** Final accusation and completion status must be
    updated atomically or with a concurrency-safe conditional update.
-   **Compatibility:** Support current evergreen desktop/mobile
    browsers; document any limitations.
-   **No fake functionality:** Buttons must perform their stated action
    or be visibly disabled with an explanation. Do not ship decorative
    controls that appear functional.

# 17. Environment configuration

Create `.env.example` with placeholders only:

``` dotenv
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai_mystery_room
GEMINI_API_KEY=
GEMINI_MODEL=
SESSION_SECRET=
CASE_ACCESS_TOKEN_TTL_DAYS=14
CASE_RATE_LIMIT_WINDOW_MS=3600000
CASE_RATE_LIMIT_MAX=5
GENERATION_TIMEOUT_MS=60000
LOG_LEVEL=info
```

These values are initial defaults, not universal production settings.
Validate required variables at server startup and fail with a clear
message if a required variable is missing. Never expose server env vars
via Vite `VITE_` variables except intentionally public configuration.
Production secrets must be set in the hosting provider's secret manager.

# 18. Local development and scripts

Root npm-workspace scripts should provide consistent commands, for
example:

-   `npm install`
-   `npm run dev` --- starts web and API in development
-   `npm run build` --- builds all workspaces
-   `npm run lint`
-   `npm run typecheck`
-   `npm test`
-   `npm run test:e2e`
-   `npm run format:check`

The exact command implementation may vary, but all commands documented
in README must work. Include a deterministic mock AI provider for local
development and tests so contributors can work without a Gemini key.
Real Gemini mode must require explicit configuration.

# 19. Definition of Done

A feature is not complete until:

-   Requirements and acceptance criteria are satisfied.
-   Runtime schemas and TypeScript types are updated.
-   Unit/integration tests cover normal and error paths.
-   No secrets or private solution fields leak to the client or logs.
-   Loading, empty, failure, and success states are implemented.
-   Keyboard accessibility and responsive layout are checked.
-   Lint, typecheck, tests, and production build pass.
-   README/docs are updated for behavior or configuration changes.
-   No unrelated refactors or unapproved scope additions are included.

# 20. Codex operating instructions

Codex must use this specification as the authoritative project contract.

## 20.1 Before coding

1.  Inspect the repository, existing package files, and current
    implementation before changing anything.
2.  Read this specification and map current files to the architecture.
3.  Create or update a concise implementation plan and task checklist.
4.  Identify conflicts between existing code and this spec; do not
    silently destroy working features.
5.  If an essential decision is unresolved, choose the least risky
    reversible default only when it does not change product behavior.
    Otherwise ask the user.
6.  Never assume credentials, deploy targets, storage providers, or paid
    services are configured.

## 20.2 While coding

-   Implement in small, testable vertical slices.
-   Follow the API contracts, schemas, security rules, and case
    lifecycle.
-   Add tests alongside each feature.
-   Keep AI provider calls behind an adapter and support a deterministic
    mock.
-   Do not expose hidden solution data through API payloads, error
    messages, frontend state, source maps, or logs.
-   Do not invent endpoints or dependencies without updating this
    spec/API docs.
-   Do not replace real functionality with hard-coded mock results in
    production paths.
-   Do not mark tests as passed unless they were actually run; report
    commands and results honestly.
-   Keep changes focused and explain important architecture decisions.
-   If a requirement must change, update this document and record the
    reason before implementing the change.

## 20.3 Recommended implementation sequence

**Phase 0 --- Repository foundation** - Inspect repo; initialize npm
workspaces, TypeScript, linting, formatting, shared schemas, env
validation, and README. - Establish health endpoint and database
connection.

**Phase 1 --- Vertical skeleton** - Build landing page, create form, API
case creation, mock generator, status polling, and basic case view. -
Verify end-to-end flow without Gemini.

**Phase 2 --- Mystery engine** - Define Zod schemas, blueprint
generation, evidence generation, deterministic validation, bounded
repair/retry, and private/public DTO separation. - Add generator unit
tests and fixtures.

**Phase 3 --- Investigation** - Add suspects, evidence index/detail,
progress persistence, hints, and responsive evidence UI. - Add
authorization and security tests.

**Phase 4 --- Accusation** - Add final accusation transaction,
server-side correctness, result rationale, and duplicate-submission
protection. - Add end-to-end tests.

**Phase 5 --- Gemini integration** - Implement real Gemini provider,
model configuration, timeouts, error handling, cost limits, and provider
mocks. - Validate against several representative fictional scenario
seeds.

**Phase 6 --- Polish and release** - Accessibility, responsive QA, error
states, security review, production build, deployment documentation, and
final acceptance checklist.

Do not integrate paid image generation until the core case generation
and accusation loop works reliably.

## 20.4 Required final report from Codex

At the end of each implementation milestone, report: - What was
implemented. - Files created/changed. - Commands run and actual
pass/fail results. - Known gaps or deferred requirements. - Environment
variables needed. - Exact next step.

# 21. Acceptance checklist

MVP is accepted only when all P0 requirements below pass:

-   [ ] User can create a case from a valid fictional scenario.
-   [ ] Invalid input is rejected with clear messages.
-   [ ] Case generation is asynchronous or otherwise safely bounded by
    HTTP timeout.
-   [ ] A deterministic mock provider allows local development without
    an API key.
-   [ ] Gemini integration is server-only and configurable.
-   [ ] A complete validated case is persisted before becoming playable.
-   [ ] Each case has exactly one hidden culprit and 3--5 distinct
    suspects as specified by case length.
-   [ ] Evidence references are valid and the solution is fairly
    inferable.
-   [ ] The UI presents fictional evidence with clear labels and text
    alternatives.
-   [ ] Hidden solution data never appears in player-facing responses
    before accusation.
-   [ ] Evidence progress and hint usage persist.
-   [ ] Hints are limited to 3 and cannot invent facts.
-   [ ] One final accusation is accepted and evaluated by the server.
-   [ ] Result explanation cites evidence in the case.
-   [ ] Rate limits, access checks, safe errors, and secret handling are
    implemented.
-   [ ] Unit, integration, and end-to-end tests pass without live AI
    calls.
-   [ ] Lint, typecheck, and production build pass.
-   [ ] README documents setup, env vars, scripts, architecture,
    limitations, and deployment.

# 22. Decisions and open questions

The following choices are intentionally set to MVP defaults to prevent
implementation from stalling. Change only when the product owner
explicitly decides otherwise.

  -----------------------------------------------------------------------
  Topic                   MVP default             Change trigger
  ----------------------- ----------------------- -----------------------
  Authentication          Anonymous case access   Need accounts, history,
                          using opaque token      or cross-device sync

  Case length             Short or standard       User research supports
                                                  more formats

  Accusations             One final attempt       Product owner approves
                                                  retry/scoring mechanics

  Hints                   Up to 3 progressive     Difficulty playtests
                          hints                   require different hint
                                                  rules

  Image generation        Optional separate       Provider, budget, and
                          provider;               storage selected
                          text/illustration       
                          fallback                

  Audio/video             Transcript/log first;   Media pipeline approved
                          real media later        

  Hosting                 Not prescribed          Deployment target
                                                  selected

  Retention               Configurable,           Privacy and hosting
                          documented TTL          policy finalized

  Queue                   Simple bounded          Deployment/runtime
                          generation flow for     requires durable jobs
                          MVP; durable queue if   
                          needed                  

  User accounts           Not in MVP              Explicit product
                                                  requirement
  -----------------------------------------------------------------------

## 22.1 Decisions requiring owner input before production

-   Final hosting provider and domain.
-   Whether image generation should use a dedicated image
    model/provider, and its cost budget.
-   Whether cases are retained indefinitely, expire after a defined
    period, or can be deleted by users.
-   Whether authentication and a case-history dashboard are required.
-   Whether users may retry accusations or receive a score.
-   Whether audio/video evidence is required for the first public
    release.

These decisions must not block local implementation of the MVP using the
stated defaults.

# 23. Example case quality bar (illustrative only)

**Scenario seed:** "A rare painting disappears from a locked gallery
during a storm."

The generated case might include: - Suspects: gallery curator, night
guard, restoration specialist. - Evidence: fictional access log, message
transcript, witness statement, storm-related power log, and a labeled
illustrative camera still. - A hidden blueprint that explains how the
disappearance occurred and why one suspect's timeline is impossible. -
At least two independent clues that support the culprit and a clue that
exonerates a different suspect. - A result explanation that links to
actual evidence items.

This example is not a fixed plot and must not be hard-coded as the only
mystery. Each case should be generated from the user's scenario while
satisfying the same structural and fairness rules.

# 24. Final implementation rule

**Build the smallest complete, secure, testable mystery loop first:
scenario → validated case → evidence inspection → final accusation →
evidence-based reveal.** Do not prioritize decorative animations, real
media generation, accounts, multiplayer, or extra features above
correctness, coherence, privacy, and a working end-to-end experience.
