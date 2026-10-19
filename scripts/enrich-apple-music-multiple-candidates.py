#!/usr/bin/env python3

import argparse
import csv
import json
import time
import urllib.request
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path("data/musician-catalogue")


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def candidates(row):
    result = []
    for entry in row["all_candidates"].split(" | "):
        name, artist_id = entry.strip().rsplit(":", 1)
        if not artist_id.isdigit():
            raise ValueError(f"Invalid artist ID: {entry}")
        result.append((name, artist_id))
    return result


def load_env():
    values = {}
    for line in Path(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    return values


def enrich(url, key, ids):
    last_error = None

    for attempt in range(3):
        try:
            request = urllib.request.Request(
                f"{url}/functions/v1/apple-music-search",
                data=json.dumps({
                    "mode": "enrich",
                    "resource": "artists",
                    "ids": ids,
                    "includePreview": True,
                }).encode("utf-8"),
                headers={
                    "apikey": key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)

            results = payload.get("results")
            if not isinstance(results, list):
                raise ValueError("Invalid enrichment response")

            return results

        except (OSError, ValueError, TimeoutError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(2 * (attempt + 1))

    raise RuntimeError(f"Enrichment failed: {last_error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    if args.start < 0 or not 1 <= args.limit <= 10:
        parser.error("Start must be >= 0; limit must be 1–10")

    master = read_csv(ROOT / "apple-music-master-audit.csv")

    multiple = sorted(
        [
            row for row in master
            if row["discovery_status"] == "multiple_candidates"
        ],
        key=lambda row: (
            len(candidates(row)),
            row["musician_name"].casefold(),
            row["musician_id"],
        ),
    )

    if len(multiple) != 146:
        raise SystemExit("Expected 146 ambiguous musicians.")

    selected = multiple[args.start:args.start + args.limit]

    if not selected:
        raise SystemExit("No musicians in requested range.")

    output = ROOT / (
        f"apple-music-multiple-profile-review-"
        f"{args.start}-{args.limit}.csv"
    )

    if output.exists():
        raise SystemExit(f"Existing report preserved: {output}")

    env = load_env()
    url = env.get("EXPO_PUBLIC_SUPABASE_URL", "")
    key = env.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")

    if (
        urlparse(url).hostname != "kkltzygebomopysklaqq.supabase.co"
        or not key
    ):
        raise SystemExit("Safety check failed: DEV Supabase required.")

    requested = []
    for musician in selected:
        for name, artist_id in candidates(musician):
            requested.append((musician, name, artist_id))

    ids = [entry[2] for entry in requested]

    if len(set(ids)) != len(ids):
        raise SystemExit("Duplicate candidate IDs in selected batch.")

    print(f"Musicians: {len(selected)}")
    print(f"Candidate profiles: {len(ids)}")

    profiles = {}

    for start in range(0, len(ids), 10):
        batch = ids[start:start + 10]

        for profile in enrich(url, key, batch):
            artist_id = str(
                profile.get("id", "")
            ).removeprefix("apple-music-artist-")

            if artist_id in profiles:
                raise SystemExit(f"Duplicate profile: {artist_id}")

            if artist_id not in ids:
                raise SystemExit(f"Unexpected profile: {artist_id}")

            profiles[artist_id] = profile

        print(f"  Processed {min(start + 10, len(ids))} profiles")
        time.sleep(1)

    rows = []

    for musician, discovery_name, artist_id in requested:
        profile = profiles.get(artist_id)

        def field(name):
            return str(profile.get(name) or "") if profile else ""

        rows.append({
            "musician_id": musician["musician_id"],
            "musician_name": musician["musician_name"],
            "roles": musician["roles"],
            "candidate_apple_music_id": artist_id,
            "discovery_artist_name": discovery_name,
            "profile_status": "returned" if profile else "missing",
            "profile_title": field("title"),
            "genre": field("subtitle"),
            "preview_song": field("previewSongTitle"),
            "recording_artist": field("previewRecordingArtist"),
            "has_playable_preview": (
                "true" if profile and profile.get("previewUrl")
                else "false"
            ),
            "apple_music_url": field("appleMusicUrl"),
            "identity_review": "pending",
            "preview_review": "pending",
            "review_notes": "",
        })

    with output.open("x", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["profile_status"] for row in rows)

    print(f"\nWrote: {output}")
    print("Profiles returned:", counts["returned"])
    print("Profiles missing:", counts["missing"])
    print("Playable previews:", sum(
        row["has_playable_preview"] == "true" for row in rows
    ))
    print("All identities remain unverified.")
    print("No database changes.")


if __name__ == "__main__":
    main()
