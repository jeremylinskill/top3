Top3 Design System

Version: 1.0Status: ActiveOwner: Jeremy LinskillLast Updated: July 31, 2026

Document Purpose

This document defines the visual language, interaction principles,reusable UI components, and interface patterns that make up Top3.

It exists to ensure consistency across every screen. New features shouldbuild upon this system rather than introducing new visual patterns.

Whenever possible, existing components should be reused before new onesare created.

Revision History

Version               Date         Author            Summary

1.0                   July 31,     Jeremy Linskill   Introduced reusable2026                           PageHeader andChip components,standardizedcollection flow,expanded reusablecomponent libraryand documented UIarchitecture.

Design Philosophy

The interface should quietly disappear.

Top3 is about discovering people through shared taste---not showcasinginterface design.

Every visual decision should reduce cognitive load and help peopleunderstand content more quickly.

Design Principles

Content Before Chrome

Content is always the hero.

Simplicity Over Decoration

Every visual element must have a purpose.

Consistency Creates Confidence

Users should never relearn an interaction.

Recognition Over Explanation

Use visual patterns before explanatory text.

Progressive Disclosure

Only reveal information when it becomes useful.

Foundations

Color Philosophy

Colors communicate meaning rather than decoration.

Purpose          Usage

Primary          Primary actions and selected statesSurface          Cards and elevated containersBackground       #F8F8F8 application backgroundSecondary Text   Metadata and supporting informationError            Destructive actionsGold             Shared #1 picks onlyLavender         Shared taste highlights

Typography

Typography establishes hierarchy primarily through weight.

Style             Usage

Display           Hero numbers and percentagesPage Title        Screen identitySection Heading   Group titlesBody              Primary reading textCaption           Metadata

Spacing Scale

Always use:

4
8
12
16
20
24
32
40
48

Avoid arbitrary spacing.

Core UI Components

These components form the foundation of every screen.

ScreenHeader

Purpose

Navigation

Back button

Centered "Top 3" branding

Rules

Never contains page titles.

Appears on every primary screen.

PageHeader

Purpose

Communicates page identity.

Supports

Title

Optional subtitle

Used by

Create Collection

Search

Collection

Rules

Always appears directly below ScreenHeader.

Owns page spacing.

Do not create custom page title layouts.

Chip

Purpose

Reusable selectable pill.

Used for

Categories

Topics

Search suggestions

Future filter chips

Supports

Optional emoji icon

Selected state

Press interaction

Rules

White by default

Dark when selected

Shared sizing and typography

Never create custom chip styles without updating this component.

PrimaryButton

Purpose

Primary call-to-action.

Examples

Continue

Publish Top 3

Save

RankedItemCard

Purpose

Display an individual ranked item.

Supports

Placeholder state

Artwork

Ranking

Metadata

Used throughout feed, profiles and collection editing.

CollectionForm

Purpose

Shared collection creation/editing experience.

CommentsSheet

Purpose

Reusable modal for comments.

Layout Patterns

ScreenHeader
      ↓
PageHeader
      ↓
Content
      ↓
Primary Action

Every primary screen should follow this hierarchy.

Cards

Top3 cards remain the primary content container.

Principles

White surface

Minimal chrome

Clear ranking

Easy scanning

Consistent spacing

Motion

Motion should support understanding.

Examples

Press feedback

Drag interactions

Screen transitions

Publishing confirmation

Animations should be subtle and fast.

Accessibility

Maintain accessible contrast.

Support screen readers.

Use accessibility labels.

Comfortable touch targets.

Do not rely on colour alone.

Component Reuse

Before creating a component ask:

Can an existing component solve this problem?

Current reusable library

Layout

ScreenHeader

PageHeader

Controls

Chip

PrimaryButton

Content

RankedItemCard

Top3Card

CommentsSheet

TasteMatchBadge

Forms

CollectionForm

Design System Evolution

The design system should evolve with the product.

Preferred workflow:

Build a feature.

Identify duplication.

Extract a reusable component.

Reuse it consistently.

Update this document.

Avoid creating highly configurable components until multiple real usecases justify the added complexity.

Design Review Checklist

Before shipping any screen:

Uses shared components.

Uses standard spacing.

Uses shared typography.

Uses shared colours.

Maintains accessibility.

Prioritizes content.

Avoids unnecessary decoration.

Guiding Principle

Great design should feel inevitable.

People should remember the collections they discovered---not theinterface they used to discover them.

Document Maintenance

Whenever a reusable component, interaction pattern, or layout conventionchanges, update this document before considering the feature complete.