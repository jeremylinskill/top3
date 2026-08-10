Engineering Principles

Project: Top3Version: 1.2Status: ActiveOwner: Jeremy Linskill

Purpose

This document defines the engineering principles that guide theimplementation of Top3.

The AI Development Charter defines how we work.

This document defines how we build software.

Engineering Philosophy

Our goal is to build software that remains understandable years after itis written.

Every engineering decision should reduce cognitive load.

Code should communicate intent more clearly than comments ever could.

Verify Before Building

When implementing infrastructure or integrating external platforms,verify the current documentation before writing production code.

This includes:

External APIs

Supabase

Expo SDK

React Native platform features

Authentication

Third-party libraries

Do not rely on memory when authoritative documentation is available.

Verified implementations reduce debugging time and improve long-termmaintainability.

Foundational Principle

Optimize for clarity over cleverness.

Simple code is easier to understand.

Understandable code is easier to maintain.

Maintainable code is easier to improve.

This principle should guide every architectural decision.

Simplicity First

Prefer the simplest solution that correctly solves the problem.

Every abstraction introduces maintenance cost.

Only create abstractions when they make the codebase easier tounderstand.

Clear Responsibilities

Every file should have one primary responsibility.

Screens

Responsible for: - Layout - Navigation - Composing UI

Should contain very little business logic.

Components

Responsible for: - User interface - User interaction - Local state

Components should remain reusable and focused.

Services

Responsible for: - Business logic - Authentication - Persistence - APIcommunication - External integrations

Services should never know how the UI is presented.

Providers

Responsible for: - Shared application state - Cross-screen context

Providers should remain lightweight.

Hooks

Responsible for: - Encapsulating reusable React behavior - Improvingreadability - Reducing duplication

Hooks should simplify components---not hide complexity.

Business Logic Belongs Outside the UI

Components should describe what happens.

Services should decide how it happens.

This separation makes testing easier and components easier tounderstand.

Prefer Composition

Build small pieces.

Compose them into larger features.

Small, understandable components scale better than large multifunctioncomponents.

Minimize State

Only store information that cannot be derived.

Prefer: - Local state - Context only when necessary - Persistent storageonly when required

Every additional state variable increases complexity.

Consistency Over Cleverness

Consistency makes software predictable.

If two features solve similar problems, they should be implementedsimilarly.

Future contributors should recognize patterns instead of learningexceptions.

Naming Matters

Names should communicate intent.

Good:

EmailSignInForm
CollectionService
MovieCard
AuthProvider

Avoid:

Helper
Manager
Util
Thing
Misc
Data

The best documentation is well-named code.

Folder Structure

Folders represent responsibility.

app/
components/
constants/
context/
hooks/
lib/
providers/
services/
supabase/
types/
utils/

Avoid unnecessary nesting.

Developers should know where something belongs without thinking aboutit.

Dependency Direction

Dependencies should always flow downward.

Screen
↓
Component
↓
Hook
↓
Service
↓
External API

Lower layers should never depend on higher layers.

Integration Boundaries

External services should never be coupled directly to the applicationUI.

UI
↓
Service
↓
Application API
↓
External Provider

Depend on stable internal interfaces rather than third-partyimplementations.

Error Handling

Handle errors close to where they occur.

Errors should: - Explain what happened. - Fail gracefully. - Helpdebugging. - Preserve application consistency.

Log detailed errors for developers.

Display clear, actionable messages to users.

Never expose sensitive implementation details.

Security

Secrets should never exist in client applications.

All privileged credentials should remain on trusted infrastructure.

Prefer server-side integration over exposing third-party credentials.

Performance

Correctness comes before optimization.

Optimize only after measuring.

Readable code usually outlives clever optimizations.

Refactoring

Refactor when: - Patterns become obvious. - Responsibilities becomeunclear. - Duplication increases maintenance cost. - Naming becomesconfusing.

Do not refactor simply because something could be more elegant.

External Dependencies

Every dependency becomes a long-term commitment.

Before adding one, ask: - Does React Native already solve this? - DoesExpo already solve this? - Is it actively maintained? - Does the valueoutweigh the maintenance cost?

Prefer fewer dependencies.

Environment Validation

Validate code using the tooling for the environment in which it runs.

Examples:

React Native
npm run typecheck

Supabase Edge Functions
deno check

Observability

Systems should provide enough information to diagnose problems withoutmodifying production code.

Log meaningful events.

Log failures.

Avoid excessive logging.

Remove temporary debugging code once its purpose has been served.

Production Quality

Production-ready code should be:

Typed

Tested

Predictable

Readable

Maintainable

Resilient

Observable

Consistent

Architecture Evolution

Architecture should emerge from experience.

Do not introduce complexity in anticipation of future requirements.

Refactor when patterns become stable.

Grow the architecture as the product grows.

Long-Term Vision

Top3 should become a codebase that feels obvious.

A new contributor should be able to understand its architecture,navigate its folders, and confidently implement a feature with minimalexplanation.

When faced with two valid solutions, choose the one that makes the nextdeveloper's job easier.