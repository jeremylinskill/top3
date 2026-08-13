# Top3 Technical Roadmap

## Purpose

Track engineering decisions, providers, architecture, and implementation milestones.

## Search Providers

### Movies

**Provider**

TMDB

**Status**

Complete

### Books

**Providers**

Google Books

Open Library (fallback)

**Status**

Complete

### Video Games

**Provider**

IGDB (via Supabase Edge Function)

**Status**

Complete

**Notes**

Server-side Twitch OAuth authentication

Supabase Edge Function (`video-game-search`)

Application-facing integration uses generic Video Games naming:

- `providers/video-games.ts`
- `lib/supabase/video-games.ts`

IGDB-specific naming remains inside the provider integration where it describes the external service.

The Edge Function accepts the app's publishable key so Video Games search works for signed-out users during onboarding as well as authenticated users.

Prefix matching and relevance scoring

Cover art, release year, and normalized ratings

## Backend

### Authentication

Complete

### Profiles

Complete

### Collections

Complete

### Likes

Complete

### Comments

Complete

### Following

Complete

### Notifications

Complete

### Storage

Complete

### Realtime Updates

Complete for Likes, Comments, Following, and Notifications

## Infrastructure Goals

Configuration-driven categories ✅

Shared search provider registry ✅

Provider abstraction ✅

Supabase Edge Functions ✅

Reusable search debounce hook ✅

Search result caching improvements

Realtime synchronization ✅

Continued discovery and recommendation improvements
