# Top3 Design System

Version: 1.1
Status: Active
Owner: Jeremy Linskill
Last Updated: September 16, 2026

## Document Purpose

This document defines the visual language, interaction principles, reusable UI components, and interface patterns that make up Top3.

It exists to ensure consistency across every screen. New features should build upon this system rather than introduce new visual patterns.

Whenever possible, existing components should be reused before new ones are created.

## Revision History

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 1.0 | July 31, 2026 | Jeremy Linskill | Introduced reusable PageHeader and Chip components, standardized collection flow, expanded the reusable component library, and documented UI architecture. |
| 1.1 | September 16, 2026 | Jeremy Linskill | Added semantic light/dark theming, AppText, inverted preview-sheet themes, shared authentication-button rules, DiscoverListCard reuse, UserAvatar, and the current reusable presentation architecture. |

## Design Philosophy

The interface should quietly disappear.

Top3 is about discovering people through shared taste—not showcasing interface design.

Every visual decision should reduce cognitive load and help people understand content more quickly.

## Design Principles

### Content Before Chrome

Content is always the hero.

### Simplicity Over Decoration

Every visual element must have a purpose.

### Consistency Creates Confidence

Users should never relearn an interaction.

### Recognition Over Explanation

Use familiar visual patterns before explanatory text.

### Progressive Disclosure

Only reveal information when it becomes useful.

### Structure Over Decoration

Hierarchy, spacing, alignment, and reusable patterns should do more work than ornamental styling.

### Semantic Before Screen-Specific

Typography and colour should be expressed through shared semantic roles rather than duplicated per-screen values.

## Foundations

### Appearance

Top3 follows the device appearance automatically.

The active application supports both light and dark mode.

Application theming is owned by:

- `hooks/use-app-colors.ts`
- `components/app-text.tsx`

Screens and components should consume semantic roles rather than recreate light- and dark-mode values locally.

### Colour Philosophy

Colours communicate meaning rather than decoration.

The design system distinguishes between:

- application background;
- primary and secondary surfaces;
- primary text;
- secondary / muted text;
- borders and separators;
- primary action states;
- Top 3 brand / secondary-interaction accent;
- destructive / error states;
- ranking-specific colour;
- Taste Match accent treatment.

Current application foundations include:

| Role | Light | Dark |
| --- | --- | --- |
| Application background | `#FAFAFA` | `#000000` |
| Primary dark surface | — | `#171717` |
| Secondary dark surface | — | `#242424` |
| Top 3 purple accent | `#5928ED` | `#8B6CFF` |

Additional colours should come from the semantic colour system rather than be duplicated in individual screens.

Do not reintroduce legacy global `COLORS` usage on migrated surfaces.

Exact black / white values may remain where they are part of a deliberate native splash bridge or media treatment rather than normal application theming.

### Preview Theme Philosophy

Book, trailer, and audio preview sheets intentionally use the opposite visual theme from the application:

```text
Light app → Dark preview
Dark app  → Light preview
```

Preview-sheet colours are owned by:

`hooks/use-preview-sheet-colors.ts`

This inversion is intentional and should not be “corrected” to match the surrounding app theme.

Trailer video itself remains black.

### Typography

Typography establishes hierarchy through semantic roles, weight, size, and spacing.

Shared semantic text presentation is owned by:

`components/app-text.tsx`

`AppText` should be preferred for application text when an existing semantic role fits.

Typical roles include:

- display;
- page title;
- section title;
- card title;
- body;
- label;
- form label;
- metadata;
- caption;
- action;
- badge;
- empty-state title / supporting copy.

Intentional exceptions include emoji, icon glyphs, media-provider artwork labels, and specialized typography without a meaningful shared semantic role.

Avoid screen-local font definitions when a shared role already exists.

### Spacing Scale

Prefer the established shared spacing tokens.

The core rhythm remains based on:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Avoid arbitrary spacing when an existing token fits.

### Shape & Radius

Reusable components should use the shared radius system where applicable.

Cards, chips, buttons, preview controls, and other repeated shapes should not introduce visually similar but slightly different radii without a product reason.

### Touch Targets

Interactive controls should provide comfortable touch targets even when the visible icon or label is compact.

Do not shrink interaction areas simply to make controls appear visually smaller.

## Core UI Components

These components form the current reusable presentation foundation.

## Layout

### ScreenHeader

**Purpose**

- top navigation;
- optional back navigation;
- centered Top 3 branding;
- divider / navigation boundary.

**Rules**

- Does not own the page title.
- Appears at the top of primary application screens where the standard app navigation is required.
- Uses semantic theme colours.

### PageHeader

**Purpose**

Communicates page identity below `ScreenHeader`.

**Supports**

- title;
- optional subtitle;
- left or centred alignment.

**Rules**

- Owns standard page-heading spacing.
- Do not create custom page-title layouts when `PageHeader` fits.

## Typography & Theme

### AppText

**Purpose**

Shared semantic text presentation across light and dark mode.

**Rules**

- Prefer semantic variants over direct font-size / colour declarations.
- Keep text colour tied to semantic application roles.
- Extend shared variants when repeated real use cases emerge.
- Do not create a new variant for a single isolated visual exception.

### useAppColors

**Purpose**

Shared semantic application colour source.

**Rules**

- Components should request meaning, not hard-coded light/dark values.
- Keep application theming separate from intentionally inverted preview-sheet theming.
- Avoid reintroducing legacy global colour constants on migrated surfaces.

### usePreviewSheetColors

**Purpose**

Shared inverted preview-sheet colour system.

**Used by**

- Book preview;
- Trailer preview;
- Audio preview.

**Rules**

- Light app produces dark preview presentation.
- Dark app produces light preview presentation.
- Do not replace this with ordinary application theme colours.

## Controls

### Chip

**Purpose**

Reusable selectable pill.

**Used for**

- categories;
- topics;
- search suggestions;
- future filters.

**Supports**

- optional emoji / icon;
- selected state;
- press interaction;
- semantic light / dark presentation.

**Rules**

- Use the shared component.
- Do not create custom chip styles without first determining whether the shared component should evolve.

### PrimaryButton

**Purpose**

Primary call-to-action.

**Examples**

- Continue
- Publish Top 3
- Save
- Create a Top 3

**Rules**

- Use the shared primary-action treatment.
- Preserve consistent sizing, type hierarchy, pressed state, disabled state, and dark-mode behaviour.

### Authentication Buttons

Current shared authentication-button components include:

- `AuthProviderButton`
- `GoogleAuthButton`
- `EmailAuthButton`

Apple, Google, and Email provider-choice screens should share the same overall layout and spacing system.

Provider-specific identity requirements remain respected, but visual presentation should not drift independently between Sign In and Create Account.

The button presentation layer must not own authentication service logic.

## Content Components

### DiscoverListCard

**Purpose**

Shared category and genre / topic row for Discover.

**Used by**

- default / suggested Discover categories;
- default / suggested genre rows;
- Discover category search results;
- Discover genre search results.

**Rules**

- Search and default Discover rows should use the same component when their product role is the same.
- Do not recreate search-only category or topic card styling.
- If the card treatment changes globally, update `DiscoverListCard`.

### RankedItemCard

**Purpose**

Display an individual ranked item.

**Supports**

- rank;
- artwork;
- metadata;
- ratings where applicable;
- media preview controls;
- category-specific artwork proportions;
- light / dark presentation.

**Rules**

- Use shared category artwork rules.
- Do not duplicate category-specific artwork sizing inside the card.

### Top3Card

**Purpose**

Primary presentation for a published Top 3 list across social and discovery surfaces.

**Supports**

- creator identity;
- list title;
- three ranked items;
- artwork;
- ratings / metadata;
- media preview controls;
- likes;
- comments;
- recommendation context where applicable.

**Rules**

- Feed, Profile, Published Top 3, and relevant Category Feed surfaces should reuse this component when the same list presentation is intended.
- Avoid screen-specific forks of the same card.

### CommentsSheet

**Purpose**

Reusable comments experience.

**Rules**

- Published Top 3 and other supported list surfaces should open the shared sheet.
- Do not recreate separate inline comment composers when the shared interaction is appropriate.

### SearchInput

**Purpose**

Shared search-field presentation.

**Rules**

- Preserve semantic text / placeholder colours.
- Media preview interaction may dismiss the keyboard before playback where appropriate.

### UserAvatar

**Purpose**

Shared avatar presentation.

**Supports**

- uploaded profile photo;
- generated fallback initial;
- shared gradient fallback treatment.

**Rules**

- Use `UserAvatar` rather than duplicating profile-initial / image logic.
- Preserve uploaded profile photos whenever available.

### TasteMatchBadge

**Purpose**

Shared compact presentation for Taste Match information.

Use the shared Top 3 purple accent role rather than introducing a separate local purple.

## Forms

### CollectionForm

**Purpose**

Shared list creation / editing experience.

User-facing terminology should use **List** even where internal code and filenames continue to use `Collection`.

### EmailSignUpForm

Shared email account-creation form.

### EmailSignInForm

Shared email sign-in form.

Authentication forms should use the shared semantic typography, colour, input, validation, and action patterns.

## Media Preview Components

### Audio Preview Sheet

`components/audio-preview-sheet.tsx`

**Purpose**

Shared Apple Music / Apple Podcasts preview presentation.

**Supports**

- provider-aware title / metadata;
- artwork;
- progress;
- play / pause;
- external provider destination;
- inverted preview theme.

**Rules**

- Apple Music and Apple Podcasts should share this presentation rather than maintain separate sheets.
- Provider-specific behaviour belongs behind the shared component.
- Do not create card-specific audio players.

### Trailer Preview

Movie and TV trailer playback uses the shared in-app trailer presentation.

**Rules**

- Preserve the intentional black video presentation.
- Use the inverted preview-sheet chrome where applicable.
- Trailer playback should coordinate with shared audio playback.

### Book Preview

Book preview uses the shared inverted preview-sheet theme.

Preserve the responsive book-preview sizing behaviour.

## Category Artwork Rules

Category artwork proportions are centralized in:

`constants/category-artwork-rules.ts`

Current rules:

| Category | Size |
| --- | --- |
| Movies | 64 × 96 |
| Books | 64 × 96 |
| TV Shows | 64 × 96 |
| Video Games | 64 × 96 |
| Songs | 64 × 64 |
| Albums | 64 × 64 |
| Artists | 64 × 64 |
| Podcasts | 64 × 64 |

These rules should be reused across:

- Search;
- SearchResultSkeleton;
- RankedItemCard;
- Top3Card;
- Overall ranking rows in Category Feed;
- Community / Overall Top3 ranking rows;
- onboarding presentations that show ranked media.

Do not hard-code separate artwork dimensions on individual surfaces unless the product intentionally calls for a different presentation.

## Layout Patterns

The standard application hierarchy remains:

```text
ScreenHeader
    ↓
PageHeader
    ↓
Content
    ↓
Primary Action
```

Not every screen requires every layer, but deviations should be intentional.

### Cards

Top 3 cards remain the primary content container.

Principles:

- semantic surface colour;
- minimal chrome;
- clear ranking;
- easy scanning;
- consistent spacing;
- category-appropriate artwork;
- accessible actions;
- shared light / dark treatment.

### Empty States

Empty states should use shared semantic typography and shared actions.

When the product offers a clear next step, use `PrimaryButton` rather than inventing a one-off CTA style.

## Onboarding Presentation

The native splash and onboarding intro are designed to feel like one continuous branded handoff.

The onboarding icon:

- is positioned within the intro stage;
- remains stationary during the opening presentation;
- fades out with the intro content;
- does not remain as a persistent overlay above the category screen.

Onboarding categories are derived from `TOP3_CATEGORIES` and sorted alphabetically.

Do not maintain a separate manual onboarding category list solely for layout.

The category grid should adapt naturally as categories are added.

## Motion

Motion should support understanding.

Examples:

- press feedback;
- drag interactions;
- onboarding staged fades;
- Published → Overall transitions;
- Taste Match score animation;
- preview-sheet presentation;
- screen transitions.

Animations should be subtle, purposeful, and fast enough that they do not delay task completion.

Do not animate elements merely to draw attention.

## Accessibility

Maintain accessible contrast in both light and dark mode.

Support screen readers.

Use accessibility labels for controls that are not fully described by visible text.

Maintain comfortable touch targets.

Do not rely on colour alone.

Ensure selected, disabled, loading, and error states remain understandable in both themes.

Media controls should expose clear accessible actions.

## Component Reuse

Before creating a component, ask:

**Can an existing component solve this problem?**

Current reusable library:

### Layout

- ScreenHeader
- PageHeader

### Typography & Theme

- AppText
- useAppColors
- usePreviewSheetColors

### Controls

- Chip
- PrimaryButton
- AuthProviderButton
- GoogleAuthButton
- EmailAuthButton

### Content

- DiscoverListCard
- RankedItemCard
- Top3Card
- CommentsSheet
- SearchInput
- UserAvatar
- TasteMatchBadge
- Card
- SecondaryActionPill
- SectionHeader

### Forms

- CollectionForm
- EmailSignUpForm
- EmailSignInForm

### Preview Presentation

- Audio Preview Sheet
- Trailer Preview
- Book Preview

## Reuse Rules

When two interfaces represent the same product concept, prefer one shared component.

Examples:

- Discover category search results and category suggestions → `DiscoverListCard`
- Discover genre search results and genre suggestions → `DiscoverListCard`
- Apple Music and Apple Podcasts playback → shared Audio Preview Sheet
- avatar photo / fallback presentation → `UserAvatar`
- application text → `AppText`
- application colours → `useAppColors()`

Do not solve visual inconsistency by creating a second component with nearly identical styling.

## Design System Evolution

The design system should evolve with the product.

Preferred workflow:

1. Build a feature.
2. Identify genuine duplication.
3. Extract or extend a reusable component.
4. Reuse it consistently.
5. Verify light and dark presentation.
6. Verify accessibility.
7. Update this document.

Avoid creating highly configurable components until multiple real use cases justify the added complexity.

Do not prematurely generalize a one-off interaction.

## Design Review Checklist

Before shipping any screen:

- uses shared components where appropriate;
- uses semantic `AppText` roles where available;
- uses `useAppColors()` rather than duplicated light / dark colours;
- respects the intentional preview-theme inversion where applicable;
- uses the standard spacing and radius system;
- uses category artwork rules;
- maintains accessibility;
- has been checked in both light and dark mode;
- prioritizes content;
- avoids unnecessary decoration;
- avoids visually duplicating an existing shared component;
- preserves provider-specific requirements without fragmenting the shared UI system.

## Guiding Principle

Great design should feel inevitable.

People should remember the Lists they discovered—not the interface they used to discover them.

## Document Maintenance

Whenever a reusable component, interaction pattern, theme rule, or layout convention changes, update this document before considering the feature complete.

Implementation status belongs in `CURRENT_STATE.md`.

Architectural ownership belongs in `ARCHITECTURE.md`.

Historical changes belong in `CHANGELOG.md`.
