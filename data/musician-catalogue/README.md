# Top 3 Musician Catalogue

A curated catalogue of notable individual musicians and their musical roles.

## Roles

- vocalist
- guitarist
- drummer
- bassist
- mc
- dj

## Runtime catalogue files

### musicians.csv

One row per unique musician.

Columns:

- `id` — permanent Top 3 musician ID
- `name` — canonical Top 3 display name
- `sort_name` — sorting name
- `musicbrainz_id` — MusicBrainz artist MBID when available
- `wikidata_id` — Wikidata QID when available
- `apple_music_artist_id` — verified Apple Music artist ID when available
- `image_status` — enrichment/artwork status
- `active` — `true` or `false`
- `notes` — editorial notes

### musician_roles.csv

One row per musician/role relationship.

Columns:

- `musician_id` — references `musicians.id`
- `role` — vocalist, guitarist, drummer, bassist, mc, or dj
- `rank` — editorial rank within that role
- `confidence` — editorial confidence
- `source` — principal source supporting the role assignment
- `source_reference` — source ID or reference
- `approved` — `true` or `false`
- `notes` — editorial notes

A musician may belong to multiple roles while retaining one canonical musician identity.

### musician-aliases.csv

Runtime aliases used to resolve searches to canonical musicians.

Columns:

- `musician_id` — references `musicians.id`
- `alias` — searchable alternate name
- `normalized_alias` — normalized lookup value
- `alias_type` — type of alias, such as stage name or former stage name
- `active` — `true` or `false`
- `notes` — editorial notes

Aliases do not create separate musicians. For example, `2Pac` resolves to the canonical Top 3 musician `Tupac Shakur`.

## Editorial and build files

The remaining CSV and JSON files in this directory preserve source rankings, consensus calculations, identity overrides, exclusions, and intermediate catalogue-building data.

They are intentionally source-controlled so the catalogue can be reproduced and audited.

Build-time identity aliases and overrides are separate from runtime search aliases.

## Apple Music

Apple Music is an enrichment source, not the canonical musician catalogue.

Top 3 owns:

- musician identity
- canonical display name
- role membership
- role ranking
- aliases
- active/inactive status

Apple Music may provide:

- artist artwork
- genre metadata
- Apple Music URLs
- media previews where appropriate

Verified Apple Music artist IDs are stored in `musicians.csv` and in the Supabase `musicians` table.

Catalogue resolution is performed by:

`scripts/resolve-apple-music-musicians.py`

The resolver uses canonical names and approved aliases, preserves ambiguous identities for manual review, and does not replace Top 3 musician IDs.

## Server-driven behaviour

The musician catalogue is stored in Supabase and loaded at runtime.

Adding, removing, re-ranking, activating, or deactivating musicians within the existing roles does not require an App Store or Google Play release.

Introducing a new musician role currently requires application and database changes because supported role keys are explicitly defined in the application contract and database constraint.

## Principles

- A musician has one canonical Top 3 identity.
- One musician may belong to multiple roles.
- Role membership is curated rather than inferred at runtime.
- Editorial sources generate and validate candidates; Top 3 owns the final catalogue.
- Aliases resolve alternate identities without creating duplicate musicians.
- External provider IDs enrich canonical Top 3 records rather than replacing them.
- IDs must remain stable even if a musician's display name changes.
- Ambiguous identities should remain unresolved rather than being guessed.
