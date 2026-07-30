# Engineering Principles

**Project:** Top3  
**Version:** 1.1 (Draft)  
**Status:** Active  
**Owner:** Jeremy Linskill

---

# Purpose

This document defines the engineering principles that guide the implementation of Top3.

The AI Development Charter defines *how we work.*

This document defines *how we build software.*

---

# Engineering Philosophy

Our goal is to build software that remains understandable years after it is written.

Every engineering decision should reduce cognitive load.

Code should communicate intent more clearly than comments ever could.

---

# Foundational Principle

> **Optimize for clarity over cleverness.**

Simple code is easier to understand.

Understandable code is easier to maintain.

Maintainable code is easier to improve.

This principle should guide every architectural decision.

---

# Simplicity First

Prefer the simplest solution that correctly solves the problem.

Every abstraction introduces maintenance cost.

Only create abstractions when they make the codebase easier to understand.

---

# Clear Responsibilities

Every file should have one primary responsibility.

### Screens

Responsible for:

- Layout
- Navigation
- Composing UI

Should contain very little business logic.

---

### Components

Responsible for:

- User interface
- User interaction
- Local state

Components should remain reusable and focused.

---

### Services

Responsible for:

- Business logic
- Authentication
- Persistence
- API communication
- External integrations

Services should never know how the UI is presented.

---

### Providers

Responsible for:

- Shared application state
- Cross-screen context

Providers should remain lightweight.

---

### Hooks

Responsible for:

- Encapsulating reusable React behavior
- Improving readability
- Reducing duplication

Hooks should simplify components—not hide complexity.

---

# Business Logic Belongs Outside the UI

Components should describe **what** happens.

Services should decide **how** it happens.

This separation makes testing easier and components easier to understand.

---

# Prefer Composition

Build small pieces.

Compose them into larger features.

Small, understandable components scale better than large multifunction components.

---

# Minimize State

Only store information that cannot be derived.

Prefer:

- Local state
- Context only when necessary
- Persistent storage only when required

Every additional state variable increases complexity.

---

# Consistency Over Cleverness

Consistency makes software predictable.

If two features solve similar problems, they should be implemented similarly.

Future contributors should recognize patterns instead of learning exceptions.

---

# Naming Matters

Names should communicate intent.

Good:

```
EmailSignInForm
CollectionService
MovieCard
AuthProvider
```

Avoid:

```
Helper
Manager
Util
Thing
Misc
Data
```

The best documentation is well-named code.

---

# Folder Structure

Folders represent responsibility.

```
app/
components/
constants/
hooks/
providers/
services/
types/
utils/
```

Avoid unnecessary nesting.

Developers should know where something belongs without thinking about it.

---

# Dependency Direction

Dependencies should always flow downward.

```
Screen

↓

Component

↓

Hook

↓

Service

↓

External API
```

Lower layers should never depend on higher layers.

---

# Error Handling

Handle errors close to where they occur.

Errors should:

- Explain what happened.
- Fail gracefully.
- Help debugging.
- Preserve application consistency.

Unexpected failures should always be visible during development.

---

# Performance

Correctness comes before optimization.

Optimize only after measuring.

Readable code usually outlives clever optimizations.

---

# Refactoring

Refactor when:

- Patterns become obvious.
- Responsibilities become unclear.
- Duplication increases maintenance cost.
- Naming becomes confusing.

Do not refactor simply because something could be "more elegant."

---

# External Dependencies

Every dependency becomes a long-term commitment.

Before adding one, ask:

- Does React Native already solve this?
- Does Expo already solve this?
- Is it actively maintained?
- Does the value outweigh the maintenance cost?

Prefer fewer dependencies.

---

# Production Quality

Production-ready code should be:

- Typed
- Predictable
- Readable
- Testable
- Resilient
- Consistent

Quality should be visible throughout the codebase.

---

# Long-Term Vision

Top3 should become a codebase that feels obvious.

A new contributor should be able to understand its architecture, navigate its folders, and confidently implement a feature with minimal explanation.

When faced with two valid solutions, choose the one that makes the next developer's job easier.