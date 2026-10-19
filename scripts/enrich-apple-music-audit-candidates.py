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
MASTER = ROOT / "apple-music-master-audit.csv"

def read_csv(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))

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
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    if args.start < 0 or args.limit < 1:
        parser.error("Invalid start or limit")

    candidates = [
        row for row in read_csv(MASTER)
        if row["discovery_status"] == "single_candidate"
    ]

    selected = candidates[args.start:args.start + args.limit]

    if not selected:
        raise SystemExit("No candidates in requested range")

    output = ROOT / (
        f"apple-music-profile-review-{args.start}-{args.limit}.csv"
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
        raise SystemExit("Safety check failed: DEV Supabase required")

    print(f"Enriching {len(selected)} of {len(candidates)} candidates")

    profiles = {}

    for start in range(0, len(selected), 10):
        batch = selected[start:start + 10]
        ids = [row["candidate_apple_music_id"] for row in batch]

        for profile in enrich(url, key, ids):
            artist_id = str(profile.get("id", "")).removeprefix(
                "apple-music-artist-"
            )
            profiles[artist_id] = profile

        print(f"  Processed {min(start + 10, len(selected))} candidates")
        time.sleep(1)

    rows = []

    for candidate in selected:
        artist_id = candidate["candidate_apple_music_id"]
        profile = profiles.get(artist_id)

        def field(name):
            return str(profile.get(name) or "") if profile else ""

        rows.append({
            "musician_id": candidate["musician_id"],
            "musician_name": candidate["musician_name"],
            "roles": candidate["roles"],
            "candidate_apple_music_id": artist_id,
            "candidate_artist_name": candidate["candidate_artist_name"],
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

    with output.open("x", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote: {output}")
    print("Profiles returned:", sum(r["profile_status"] == "returned" for r in rows))
    print("Playable previews:", sum(r["has_playable_preview"] == "true" for r in rows))
    print("All identities remain unverified.")
    print("No database changes.")

if __name__ == "__main__":
    main()
