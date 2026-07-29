# Top3 Design System

**Version:** 0.1 (Draft)  
**Status:** Active  
**Owner:** Jeremy Linskill  
**Last Updated:** July 28, 2026

---

## Document Purpose

This document defines the visual language, interaction principles, and reusable UI components that make up Top3.

It exists to ensure consistency across every screen and interaction. New features should build upon this system rather than introducing new visual patterns.

Whenever possible, existing components should be reused before new ones are created.

---

## Revision History

| Version | Date | Author | Summary |
|----------|------------|------------------|--------------------------------------------------------------|
| 0.1 | July 28, 2026 | Jeremy Linskill | Initial design system documenting the visual language and reusable components used throughout Top3. |

---

# Design Philosophy

The interface should quietly disappear.

Top3 is not about interface design.

It is about helping people discover one another through shared taste.

Every design decision should make content easier to understand—not draw attention to itself.

---

# Design Principles

## Content Before Chrome

The ranked items are always the primary focus.

Visual styling exists only to support understanding.

---

## Simplicity Over Decoration

Every visual element should have a purpose.

If an element does not improve understanding or usability, it should be removed.

---

## Consistency Creates Confidence

Users should never have to learn the same interaction twice.

Buttons, cards, spacing, typography, and interactions should behave consistently throughout the app.

---

## Recognition Over Explanation

Where possible, communicate visually instead of through text.

Examples:

- Shared picks are highlighted.
- Taste Match uses consistent colors.
- Follow buttons always look and behave the same.

---

## Progressive Disclosure

Show only what users need at each moment.

Avoid overwhelming users with options or information.

---

# Visual Language

## Color Philosophy

Colors communicate meaning.

They should rarely be decorative.

### Primary

Used for:

- Primary actions
- Primary buttons

---

### Surface

Used for:

- Cards
- Elevated content
- Containers

---

### Background

Used for:

- Screen backgrounds
- Secondary row backgrounds

---

### Shared Taste

Lavender

Represents:

- Shared favorites
- Taste Match highlights

This color should only appear when there is a meaningful connection.

---

### Gold

Reserved exclusively for:

- Shared #1 picks
- Trophy icon

Gold represents exceptional alignment.

---

### Secondary Text

Used for:

- Metadata
- Supporting information

---

### Error

Reserved only for destructive actions or validation.

---

# Typography

Typography should create hierarchy through weight—not excessive size.

## Display

Reserved for hero numbers and key metrics.

Examples:

- Taste Match %
- Counts

---

## Heading

Used for:

- Screen titles
- Card titles

---

## Body

Used for:

- Descriptions
- Bios
- Comments

---

## Caption

Used for:

- Ranked items
- Metadata
- Supporting labels

---

# Spacing

Whitespace is intentional.

It should improve readability rather than simply fill space.

## Base Scale

```
4
8
12
16
20
24
32
40
48
```

Spacing should always use this scale.

Avoid arbitrary values whenever possible.

---

# Corner Radius

Rounded corners communicate friendliness.

They should be used consistently.

Standard radius values are defined centrally in:

```
constants/radius.ts
```

---

# Shadows

Shadows should be subtle.

They exist only to separate surfaces.

Avoid dramatic elevation.

Standard shadow styles are defined centrally in:

```
constants/shadows.ts
```

---

# Cards

Cards are the primary building block of Top3.

---

## Top3 Card

Purpose

Display a published Top 3.

Contains

- Category
- Topic
- Ranked items
- Likes
- Comments
- Author (optional)

### Rules

- White background
- Rounded corners
- 8px spacing between ranked rows
- Shared picks use lavender backgrounds
- Shared #1 uses trophy
- Shared picks use sparkle icon
- Minimal visual chrome

---

## Recommendation Card

Purpose

Introduce users with similar taste.

Contains

- Recommendation reason
- Taste Match
- Follow button
- Top3 Card

---

## Taste Match Card

Purpose

Summarize compatibility between two users.

Contains

- Match percentage
- Shared picks
- Follow button

---

## Profile Card

Purpose

Display profile statistics.

Contains

- Avatar
- Bio
- Stats
- Actions

---

# Buttons

Buttons communicate action.

---

## Primary Button

Used for:

- Save
- Publish
- Continue

---

## Secondary Button

Used for:

- Less prominent actions

---

## Follow Button

States

- Follow
- Following

Behavior

- Same appearance everywhere
- Reusable component
- Never duplicated

---

# Icons

Icons should reinforce meaning.

Never decorate.

---

## Sparkle

Meaning

Shared taste.

---

## Trophy

Meaning

Shared #1 pick.

Reserved only for exceptional alignment.

---

## Heart

Meaning

Like.

---

## Comment

Meaning

Conversation.

---

# Lists

Ranked lists are the heart of Top3.

Every ranked list should:

- Feel lightweight
- Be easy to scan
- Prioritize titles over controls

Rows should never feel cluttered.

---

# Motion

Animation should support understanding.

Never distract.

Examples:

- Button press feedback
- Card elevation
- Follow state transition
- Shared highlight fade

Animations should feel quick and subtle.

---

# Accessibility

Top3 should be usable by everyone.

Guidelines

- Maintain accessible contrast ratios.
- Do not rely solely on color.
- Support Dynamic Type where practical.
- Every interactive element should have an accessibility label.
- Touch targets should be comfortable.

---

# Component Reuse

Before creating a new component, ask:

Can an existing component be reused?

Existing reusable components include:

- Top3Card
- FollowButton
- TasteMatchBadge
- PrimaryButton
- SegmentedControl
- ScreenHeader
- CommentsSheet

New components should only be created when an existing one cannot reasonably be extended.

---

# Design Checklist

Before shipping any new screen, verify:

✓ Uses design system colors.

✓ Uses design system typography.

✓ Uses standard spacing scale.

✓ Reuses existing components.

✓ Maintains accessibility.

✓ Supports light visual hierarchy.

✓ Keeps content as the primary focus.

✓ Avoids unnecessary decoration.

---

# Guiding Principle

Great design should feel inevitable.

Users should focus on discovering people and ideas—not learning the interface.

If someone notices the interface before they notice the content, we've probably overdesigned it.

---

## Document Maintenance

This document should evolve alongside the design system.

Whenever a new reusable component, interaction pattern, or visual language is introduced, this document should be updated before the feature is considered complete.