# Top3 Roadmap

Top3 is a mobile app that allows users to create and share Top 3 lists across different categories of media and interests.

# Product Vision

Top3 helps people express their taste and discover others who share it.

Create Top 3 lists of your favorite things—from movies and books to TV shows and games—and connect through what you love.

---

# Current Status

## Completed

### v0.1
- Core app architecture
- Collection creation
- Top 3 ranking

### v0.2
- Movies
- TMDB integration

### v0.3
- Books
- Google Books integration
- Open Library fallback
- Generic search architecture
- Search UX improvements

### v0.4
- TV Shows
- Shared category architecture
- Search caching
- Category placeholder icons
- UI polish

---

# Current Categories

## Movies
Provider:
- TMDB

Topics:
- General
- Action
- Adventure
- Comedy
- Drama
- Fantasy
- Horror
- Romance
- Sci-Fi
- Thriller

---

## Books
Provider:
- Google Books
- Open Library (fallback)

Topics:
- General
- Biography
- Business
- Children's
- Fantasy
- Fiction
- History
- Mystery
- Non-Fiction
- Romance
- Sci-Fi
- Self-Help

---

## TV Shows
Provider:
- TMDB

Topics:
- General
- Comedy
- Crime
- Documentary
- Drama
- Fantasy
- Reality
- Sci-Fi
- Animated

---

# Next Release

## v0.5
Video Games

Provider:
- RAWG

Future Provider:
- IGDB (after backend)

Topics:
- General
- Action
- Adventure
- RPG
- Shooter
- Strategy
- Simulation
- Racing
- Sports
- Puzzle

---

# Planned Releases

## v0.6
Podcasts

## v0.7
Restaurants

## v0.8
Additional client-side category

---

# Version 1.0 Goals

- Stable architecture
- Excellent search experience
- Beautiful UI
- Multiple media categories
- Shareable Top 3 collections

---

# Version 2.0

Introduce a backend.

Goals:

- User accounts
- Public profiles
- Sharing
- Friends
- Notifications
- AI recommendations

Provider upgrades:

Games:
- RAWG → IGDB

Albums:
- Spotify

---

# Design Principles

- Categories should be configuration-driven.
- Search providers should be replaceable.
- UI should remain category-agnostic.
- New categories should require minimal code changes.
- Prefer long-term maintainability over short-term hacks.

### Video Games

Current provider:
- RAWG

Future provider:
- IGDB

Reason:
IGDB provides dedicated cover artwork that better matches the portrait card layout used throughout the app.