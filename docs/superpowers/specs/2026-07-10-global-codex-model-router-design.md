# Global Codex Executor/Advisor Model Router

**Date:** 2026-07-10
**Status:** Disabled by explicit user request on 2026-07-14. Do not reinstall or re-enable without a new explicit request.

## Purpose

Reduce routine Codex token consumption across all new local sessions while keeping every consequential deliverable subject to frontier-model planning or review.

The system uses a low-cost main executor for routine work and a frontier advisor for decisions and quality gates:

- **Executor:** `gpt-5.6-luna` with `model_reasoning_effort = "medium"`.
- **Advisor:** `gpt-5.6-sol` with `model_reasoning_effort = "xhigh"`.

This is not a claim that Luna becomes equivalent to Sol. Quality parity is approached by requiring Sol to plan difficult work and approve consequential output before the executor reports completion.

## Scope

The router applies through user-level Codex configuration, so it affects new Codex Desktop, CLI, and IDE sessions regardless of the opened project.

It covers:

- coding and code review;
- debugging and architecture;
- research and analysis;
- plans, documents, and other reusable artifacts;
- short operational actions and conversational responses.

It does not:

- call the OpenAI API through project credentials;
- change production application model selection;
- guarantee byte-for-byte output identical to a Sol-only session;
- force an advisor call for status messages or inconsequential actions.

## Architecture

### Main executor

The root session runs on Luna. It owns conversation continuity, tool use, routine inspection, mechanical edits, command execution, and incorporation of advisor feedback.

### Advisor

A user-level custom agent named `advisor` runs on Sol at xhigh reasoning. It has three modes:

1. **Plan:** identify risks, constraints, acceptance criteria, and an execution strategy before difficult work begins.
2. **Review:** inspect the actual artifact, diff, and verification evidence; return either `APPROVED` or actionable blocking findings.
3. **Expert ownership:** directly handle reasoning for architecture, security, intricate root-cause analysis, and other work where delegating the core decision would create unacceptable quality risk.

One advisor agent is used at a time. Recursive delegation and broad agent fan-out are disabled for this workflow.

## Routing Policy

| Task class | Examples | Required flow |
| --- | --- | --- |
| Inconsequential | status, file lookup, command output, acknowledgement, simple navigation | Luna only |
| Consequential and bounded | code change, document, research result, implementation plan, reusable analysis | Luna executes, Sol reviews |
| Complex or ambiguous | multi-file feature, unclear bug, substantial design choice, high-cost decision | Sol plans, Luna executes, Sol reviews |
| Critical reasoning | architecture, security, authentication, payments, destructive migration, intricate root-cause analysis | Sol owns the core reasoning, Luna performs delegated routine work, Sol reviews |

A result is consequential when the user is likely to use, publish, merge, deploy, send, or rely on it. When uncertain, the executor must classify the result as consequential.

## Completion Gate

For consequential work, the executor may report completion only when all of the following are true:

1. Proportionate verification has completed.
2. The advisor has reviewed the actual final state, not only the proposed plan.
3. The advisor returned `APPROVED` with no blocking findings.
4. Any advisor-requested fixes were applied and re-reviewed.

The advisor must not approve based on a summary alone when a diff, artifact, source file, or test evidence is locally available.

## Context Transfer

To control advisor cost without hiding evidence, the executor sends a compact review packet:

- the user's objective and explicit constraints;
- relevant project instructions;
- decisions already made;
- affected file paths or artifact locations;
- the final diff or precise output under review;
- verification commands and their material results;
- unresolved uncertainties.

Large raw logs and unrelated conversation history are excluded. The advisor may inspect the workspace directly when the packet is insufficient.

## Failure Handling

- If the advisor rejects the work, Luna fixes only the reported issues and resubmits the final state.
- If the second review exposes a broader design flaw, Sol produces a revised plan before execution continues.
- If Sol is unavailable, times out, or cannot inspect required evidence, the executor must state that frontier review did not complete and must not describe the result as fully verified.
- If Luna and Sol disagree on a consequential technical decision, Sol's decision wins unless it conflicts with an explicit user instruction or a higher-priority safety/project rule.
- The executor must ask the user when resolving the conflict requires a product decision or additional authority.

## Global Configuration Touchpoints

Implementation will make narrow, backed-up changes to user-level Codex files:

- `C:\Users\badlo\.codex\config.toml`
  - set the root model to Luna and reasoning to medium;
  - set `agents.max_depth = 1` and `agents.max_threads = 2`, allowing the root executor and one direct advisor while preventing recursive or parallel fan-out.
- `C:\Users\badlo\.codex\agents\advisor.toml`
  - define the Sol/xhigh advisor role and its plan/review contract.
- `C:\Users\badlo\.codex\AGENTS.md`
  - replace the non-operative Sonnet/Opus routing section with executable Luna/Sol routing rules;
  - preserve all unrelated global instructions.

No project `AGENTS.md`, application source, API key, or production model configuration is changed.

## Safety and Cost Controls

- Do not invoke Sol for acknowledgements, status checks, or trivial read-only operations.
- Use at most one planning call and one review call for a normal consequential task.
- Additional Sol calls are allowed only after a rejection, newly discovered critical risk, or material scope change.
- Do not spawn parallel advisors for the same question.
- Do not use project OpenAI API credentials; routing uses the Codex client's configured model access.
- Preserve existing permissions, sandboxing, and approval behavior unless a separate user request changes them.

## Verification Plan

Implementation verification must use fresh sessions because the root model is selected when a new session starts.

Run four smoke scenarios:

1. **Trivial request:** confirm Luna responds without spawning Sol.
2. **Bounded code change:** confirm Luna performs the work and Sol reviews the final diff before completion.
3. **Architecture request:** confirm Sol participates before implementation begins and again at final review.
4. **Advisor failure simulation:** confirm the executor reports the missing review instead of claiming frontier approval.

Also verify:

- new sessions default to Luna/medium;
- the advisor session identifies as Sol/xhigh;
- existing global instructions remain intact;
- no project files or credentials are modified by the router;
- no recursive or duplicate advisor agents are spawned.

## Acceptance Criteria

The design is implemented successfully when:

- every new local Codex session starts with Luna as the executor;
- routing rules apply regardless of the opened workspace;
- consequential outputs cannot be marked complete without Sol approval;
- complex and critical work receives Sol input before execution;
- trivial interactions avoid Sol calls;
- failures are explicit and fail closed with respect to the quality claim;
- the original global configuration can be restored from a timestamped backup.

## Reference

OpenAI Codex supports user-level custom agents under `~/.codex/agents/` and allows each agent to override `model` and `model_reasoning_effort`: <https://learn.chatgpt.com/docs/agent-configuration/subagents>.
