Analyze this entire repository like a senior software engineer preparing documentation for a long-term team project.

Your job is to understand the project completely and generate or update the following files.

==========================================================
1. PROJECT.md
==========================================================

Create a complete project overview including:

# Project Name

# One Line Description

# Business Goal

# Tech Stack
- Frontend
- Backend
- Database
- Authentication
- Storage
- Deployment
- Package Manager

# Folder Structure

# Core Features

# Current Progress
- Completed
- In Progress
- Pending

# API Structure

# Environment Variables

# Coding Standards

# Architecture Overview

# Important Notes

Do NOT invent information.
If something cannot be determined, write "Unknown".

==========================================================
2. TASKS.md
==========================================================

Generate:

# Completed

# Currently Working

# Next Priority

# Known Bugs

# Technical Debt

# Refactoring Opportunities

# Nice To Have

# Blockers

Determine these from:
- existing implementation
- TODO comments
- FIXME comments
- partially completed features
- repository structure

Never remove completed tasks.

==========================================================
3. AGENTS.md
==========================================================

Create a permanent operating manual for every future AI.

Include instructions such as:

- Read PROJECT.md before coding.
- Read TASKS.md before coding.
- Read SESSION.md before coding.
- Read docs/decisions.md before coding.
- Reuse components.
- Never duplicate logic.
- Follow existing architecture.
- Search before creating files.
- Keep code modular.
- Follow naming conventions.
- Minimize breaking changes.
- Update documentation after every session.
- Explain major architectural decisions.
- Keep code clean and maintainable.

The document should describe HOW the AI should work, not WHAT the project is.

==========================================================
4. SESSION.md
==========================================================

Generate:

# Current Task

# Current Progress

# Files Recently Modified

# Next Step

# Open Questions

# Notes For Next Session

This document should only describe the latest working state of the project and should be updated after every coding session.

==========================================================
5. docs/decisions.md
==========================================================

Document every important architectural decision.

For each decision include:

Date

Decision

Reason

Alternatives Considered

Tradeoffs

Impact

Never invent reasons.

If the reason cannot be determined, clearly state that it is inferred or unknown.

==========================================================
GENERAL RULES
==========================================================

Think before writing.

Understand the project before making conclusions.

Never hallucinate.

Never fabricate architecture.

Never fabricate APIs.

Never fabricate dependencies.

If uncertain, explicitly mention the uncertainty.

Keep documentation concise but complete.

After generating these files, provide a short summary of your understanding of the project.

From this point onward, whenever you complete a development task, automatically update PROJECT.md, TASKS.md, SESSION.md, and docs/decisions.md whenever they are affected.