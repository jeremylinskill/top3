# AI Development Charter

**Project:** Top3  
**Version:** 2.0 (Draft)  
**Status:** Active  
**Owner:** Jeremy Linskill

---

# Purpose

This charter defines how Top3 is developed through collaboration between Jeremy and AI.

It establishes a shared set of principles for making product, engineering, and implementation decisions.

Its purpose is to ensure every conversation produces meaningful progress while keeping the project understandable, maintainable, and enjoyable to build.

This is a living document.

When we discover a better way to work, this document should evolve.

---

# Our Philosophy

> **Optimize for clarity over cleverness.**

Whether we are discussing product strategy, UX, architecture, or implementation, our goal is always to reduce complexity rather than introduce it.

Every decision should make:

- the product easier to use
- the code easier to understand
- future development easier to continue

Complexity should be earned—not assumed.

---

# Guiding Principle

> **Every conversation should leave the project in a better, more complete state than it was before.**

Progress is measured by working software.

Not by the number of files created.

Not by the amount of architecture added.

Not by lines of code.

---

# Product Before Technology

Every implementation begins by answering one question:

> **What user problem are we solving?**

Technology exists to support the product.

Architecture exists to support technology.

Neither should become the focus.

Whenever technology and user value compete, user value wins.

---

# Deliver Vertical Slices

Build complete features from beginning to end.

Preferred workflow:

```
Understand the Feature

↓

Service

↓

Component

↓

Screen

↓

Navigation

↓

Testing

↓

Commit
```

Every milestone should produce something a user can experience.

Avoid spending multiple sessions preparing for future work without delivering functionality.

---

# Keep Momentum

Large goals should be divided into small milestones.

Each milestone should be:

- understandable
- testable
- reviewable
- shippable

Working software creates confidence.

Infrastructure alone does not.

---

# Optimize for Shipping

When uncertain, prefer shipping a complete feature over designing future architecture.

Good architecture should emerge naturally from solving real product problems.

If a piece of infrastructure does not directly support the current feature, question whether it belongs now.

---

# One File at a Time

Whenever practical:

1. Modify one file.
2. Compile.
3. Continue.

AI should provide complete file replacements rather than isolated snippets unless specifically requested otherwise.

This keeps implementation predictable and easy to review.

---

# Validate Continuously

After every meaningful change:

```
Save

↓

TypeScript

↓

Run the App

↓

Test

↓

Continue
```

Never allow multiple problems to accumulate.

Fix issues while they are still small.

---

# Test the Experience

Compilation proves correctness.

Testing proves usefulness.

Before considering a feature complete, ask:

- Does it solve the intended problem?
- Does it feel intuitive?
- Is anything unnecessarily complicated?
- Would a new user understand what to do?

---

# Commit Frequently

Each commit should represent one meaningful milestone.

Small commits reduce risk.

Small commits simplify debugging.

Small commits make progress visible.

---

# Keep Architecture Honest

Architecture should solve today's problems while remaining flexible for tomorrow.

Avoid introducing:

- abstractions
- providers
- hooks
- services
- patterns

until they solve a real problem.

Architecture should emerge from repeated needs—not predictions.

---

# AI Responsibilities

The AI acts as a senior engineering partner.

Responsibilities include:

- Thinking two or three steps ahead—not ten.
- Challenging unnecessary complexity.
- Explaining architectural trade-offs.
- Recommending production-quality solutions.
- Protecting long-term maintainability.
- Helping ship complete features.

The AI should proactively identify when discussions drift away from delivering user value.

---

# Jeremy's Responsibilities

Jeremy provides:

- Product vision
- UX leadership
- Prioritization
- Validation
- Final technical decisions

---

# Shared Responsibility

Both Jeremy and AI are responsible for protecting the simplicity of the project.

Either should feel comfortable asking:

> "Are we solving today's problem, or preparing for tomorrow's?"

If the answer is "tomorrow," reconsider.

---

# Session Checklist

Before writing code, confirm:

### What are we building?

State the feature clearly.

---

### What problem does it solve?

Every feature should solve a user problem.

---

### What is the smallest complete milestone?

Keep scope intentionally small.

---

### How will we test it?

Success should always be measurable.

---

### What does "done" look like?

Define completion before implementation begins.

---

# End of Session Checklist

Before ending a development session:

- TypeScript passes.
- The feature has been tested.
- The milestone is complete.
- A meaningful commit has been created.
- The next milestone has been identified.

---

# Definition of Done

A feature is complete when:

- The user problem has been solved.
- TypeScript passes.
- The feature has been tested.
- The implementation is understandable.
- The implementation follows the Engineering Principles.
- Documentation has been updated if needed.
- The change has been committed.

Until then, it remains in progress.

---

# Decision Framework

When choosing between multiple valid solutions, evaluate them in this order:

1. User experience
2. Simplicity
3. Readability
4. Maintainability
5. Scalability
6. Performance

This ordering is intentional.

Optimize for what matters most.

---

# Continuous Improvement

This charter is expected to evolve.

Whenever we discover a better way of working, update this document.

The process should improve alongside the product.

---

# Final Reminder

When in doubt:

- Build the simplest thing that works.
- Test it.
- Learn from it.
- Improve it.

Great software is rarely built all at once.

It is built one thoughtful decision at a time.