#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import socket
import time
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")
MUSICIANS_PATH = ROOT / "musicians.csv"
ALIASES_PATH = ROOT / "musician-aliases.csv"
OUTPUT_PATH = ROOT / "apple-music-resolution-audit.csv"
ENV_PATH = Path(".env")


def normalize(value: str) -> str:
    value = html.unescape(value)
    value = unicodedata.normalize(
        "NFKD",
        value,
    )
    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )
    value = value.casefold()
    value = value.replace(".", "")
    value = value.replace("&", " and ")
    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )
    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    with path.open(
        newline="",
        encoding="utf-8",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}

    for raw_line in ENV_PATH.read_text(
        encoding="utf-8"
    ).splitlines():
        line = raw_line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split(
            "=",
            1,
        )

        values[
            key.strip()
        ] = value.strip().strip(
            "\"'"
        )

    return values


def search_apple_music(
    url: str,
    publishable_key: str,
    query: str,
) -> list[dict[str, object]]:
    query = html.unescape(query)

    for attempt in range(1, 4):
        request = urllib.request.Request(
            f"{url}/functions/v1/apple-music-search",
            data=json.dumps({
                "mode": "resolve",
                "resource": "artists",
                "query": query,
            }).encode("utf-8"),
            headers={
                "apikey":
                    publishable_key,
                "Content-Type":
                    "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=45,
            ) as response:
                payload = json.loads(
                    response.read().decode(
                        "utf-8"
                    )
                )

            results = payload.get(
                "results",
                [],
            )

            return (
                results
                if isinstance(results, list)
                else []
            )
        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
        ) as error:
            if attempt >= 3:
                raise

            delay = attempt * 2

            print(
                f"  RETRY: {type(error).__name__}; "
                f"waiting {delay}s"
            )

            time.sleep(delay)

    return []


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of musicians to audit.",
    )

    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Zero-based starting position.",
    )

    args = parser.parse_args()

    musicians = read_csv(
        MUSICIANS_PATH
    )

    aliases = read_csv(
        ALIASES_PATH
    )

    aliases_by_musician: dict[
        str,
        list[str],
    ] = defaultdict(list)

    for row in aliases:
        if (
            row.get("active", "")
            .strip()
            .lower()
            != "true"
        ):
            continue

        aliases_by_musician[
            row["musician_id"]
        ].append(
            row["alias"]
        )

    ids_by_normalized_name: dict[
        str,
        list[str],
    ] = defaultdict(list)

    for row in musicians:
        ids_by_normalized_name[
            normalize(row["name"])
        ].append(
            row["id"]
        )

    ambiguous_names = {
        key
        for key, ids
        in ids_by_normalized_name.items()
        if len(ids) > 1
    }

    env = load_env()

    supabase_url = env.get(
        "EXPO_PUBLIC_SUPABASE_URL",
        "",
    )

    publishable_key = env.get(
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "",
    )

    if (
        not supabase_url
        or not publishable_key
    ):
        raise SystemExit(
            "Missing Supabase environment variables."
        )

    selected = musicians[
        args.start:
        args.start + args.limit
    ]

    audit_rows: list[
        dict[str, str]
    ] = []

    for index, musician in enumerate(
        selected,
        start=args.start + 1,
    ):
        musician_id = musician["id"]
        name = musician["name"]

        canonical_normalized = normalize(
            name
        )

        accepted_names = [
            name,
            *aliases_by_musician.get(
                musician_id,
                [],
            ),
        ]

        accepted_normalized = {
            normalize(value)
            for value in accepted_names
        }

        print(
            f"[{index}/{len(musicians)}] "
            f"{name}"
        )

        if (
            canonical_normalized
            in ambiguous_names
        ):
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "ambiguous_catalogue_name",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    "Skipped because multiple catalogue musicians share this normalized canonical name.",
            })

            print(
                "  SKIP: ambiguous catalogue name"
            )
            continue

        try:
            results = search_apple_music(
                supabase_url,
                publishable_key,
                name,
            )
        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
            json.JSONDecodeError,
        ) as error:
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "request_error",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    str(error),
            })

            print(
                f"  ERROR: {error}"
            )
            continue

        matching_results = []

        for result in results:
            title = str(
                result.get(
                    "title",
                    "",
                )
            ).strip()

            if (
                normalize(title)
                not in accepted_normalized
            ):
                continue

            raw_id = str(
                result.get(
                    "id",
                    "",
                )
            ).strip()

            apple_id = re.sub(
                r"^apple-music-artist-",
                "",
                raw_id,
            )

            if not apple_id:
                continue

            matching_results.append({
                "id": apple_id,
                "title": title,
            })

        if not matching_results:
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "no_match",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    "",
            })

            print(
                "  NO MATCH"
            )
            continue

        chosen = matching_results[0]

        audit_rows.append({
            "musician_id":
                musician_id,
            "musician_name":
                name,
            "status":
                "matched",
            "apple_music_artist_id":
                chosen["id"],
            "apple_music_title":
                chosen["title"],
            "accepted_names":
                " | ".join(
                    accepted_names
                ),
            "matched_candidates":
                " | ".join(
                    f'{item["title"]}:{item["id"]}'
                    for item in matching_results
                ),
            "notes":
                "",
        })

        print(
            f'  MATCH: '
            f'{chosen["title"]} '
            f'({chosen["id"]})'
        )

        if len(
            matching_results
        ) > 1:
            print(
                "  Additional accepted-name candidates:",
                ", ".join(
                    f'{item["title"]} '
                    f'({item["id"]})'
                    for item in
                    matching_results[1:]
                ),
            )

    fieldnames = [
        "musician_id",
        "musician_name",
        "status",
        "apple_music_artist_id",
        "apple_music_title",
        "accepted_names",
        "matched_candidates",
        "notes",
    ]

    with OUTPUT_PATH.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(
            audit_rows
        )

    print()
    print(
        "Wrote:",
        OUTPUT_PATH,
    )

    counts = defaultdict(int)

    for row in audit_rows:
        counts[
            row["status"]
        ] += 1

    for status in sorted(
        counts
    ):
        print(
            f"{status}: "
            f"{counts[status]}"
        )


if __name__ == "__main__":
    main()
