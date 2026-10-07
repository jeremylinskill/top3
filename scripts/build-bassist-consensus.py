#!/usr/bin/env python3

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT = (
    ROOT
    / "bassist-editorial-consensus.csv"
)

ALIASES_PATH = (
    ROOT
    / "editorial-identity-aliases.json"
)

SOURCES = [
    {
        "key": "rolling_stone",
        "label": "Rolling Stone",
        "path": (
            ROOT
            / "editorial-rankings-rolling-stone-bassists.csv"
        ),
        "rank_field": "rolling_stone_rank",
        "list_size": 50,
    },
    {
        "key": "bass_player",
        "label": "Bass Player",
        "path": (
            ROOT
            / "editorial-rankings-bass-player-bassists.csv"
        ),
        "rank_field": "bass_player_rank",
        "list_size": 100,
    },
    {
        "key": "musicradar_reader_poll",
        "label": "MusicRadar Reader Poll",
        "path": (
            ROOT
            / "editorial-rankings-musicradar-bassists.csv"
        ),
        "rank_field":
            "musicradar_reader_poll_rank",
        "list_size": 50,
    },
    {
        "key": "udiscover",
        "label": "uDiscover",
        "path": (
            ROOT
            / "editorial-rankings-udiscover-bassists.csv"
        ),
        "rank_field": "udiscover_rank",
        "list_size": 55,
    },
]

DISPLAY_PRIORITY = [
    "rolling_stone",
    "bass_player",
    "udiscover",
    "musicradar_reader_poll",
]


def normalize_name(value):
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


def load_aliases():
    if not ALIASES_PATH.exists():
        return {}

    raw = json.loads(
        ALIASES_PATH.read_text(
            encoding="utf-8"
        )
    )

    return {
        normalize_name(key):
            value
        for key, value in raw.items()
    }


def resolve_identity(name, aliases):
    normalized = normalize_name(name)

    canonical_name = aliases.get(
        normalized,
        name,
    )

    return (
        normalize_name(canonical_name),
        canonical_name,
    )


def rank_strength(rank, list_size):
    if list_size <= 1:
        return 1.0

    return (
        list_size - rank
    ) / (
        list_size - 1
    )


def main():
    aliases = load_aliases()

    records = defaultdict(
        lambda: {
            "variants": set(),
            "sources": {},
            "strengths": [],
        }
    )

    for source in SOURCES:
        with source["path"].open(
            newline="",
            encoding="utf-8",
        ) as f:
            rows = list(
                csv.DictReader(f)
            )

        for row in rows:
            source_name = (
                row["musician_name"]
                .strip()
            )

            rank = int(
                row["source_rank"]
            )

            (
                identity_key,
                canonical_name,
            ) = resolve_identity(
                source_name,
                aliases,
            )

            record = records[
                identity_key
            ]

            record["variants"].add(
                source_name
            )

            record["variants"].add(
                canonical_name
            )

            record["sources"][
                source["key"]
            ] = {
                "label":
                    source["label"],
                "rank":
                    rank,
                "rank_field":
                    source["rank_field"],
            }

            record["strengths"].append(
                rank_strength(
                    rank,
                    source["list_size"],
                )
            )

    output_rows = []

    for identity_key, record in records.items():
        source_count = len(
            record["sources"]
        )

        display_name = None

        for source_key in DISPLAY_PRIORITY:
            source_data = record[
                "sources"
            ].get(source_key)

            if not source_data:
                continue

            source = next(
                item
                for item in SOURCES
                if item["key"]
                == source_key
            )

            with source["path"].open(
                newline="",
                encoding="utf-8",
            ) as f:
                for row in csv.DictReader(f):
                    (
                        row_key,
                        canonical_name,
                    ) = resolve_identity(
                        row["musician_name"],
                        aliases,
                    )

                    if row_key == identity_key:
                        display_name = (
                            canonical_name
                        )
                        break

            if display_name:
                break

        if not display_name:
            display_name = sorted(
                record["variants"]
            )[0]

        average_rank_strength = (
            sum(
                record["strengths"]
            )
            / len(SOURCES)
        )

        consensus_score = (
            source_count * 100
            + average_rank_strength * 10
        )

        output = {
            "musician_name":
                display_name,
            "normalized_name":
                identity_key,
            "source_count":
                source_count,
            "sources":
                ", ".join(
                    source["label"]
                    for source in SOURCES
                    if source["key"]
                    in record["sources"]
                ),
            "average_rank_strength":
                f"{average_rank_strength:.6f}",
            "consensus_score":
                f"{consensus_score:.6f}",
            "name_variants":
                " | ".join(
                    sorted(
                        record["variants"]
                    )
                ),
        }

        for source in SOURCES:
            source_data = (
                record["sources"]
                .get(source["key"])
            )

            output[
                source["rank_field"]
            ] = (
                source_data["rank"]
                if source_data
                else ""
            )

        output_rows.append(output)

    output_rows.sort(
        key=lambda row: (
            -int(
                row["source_count"]
            ),
            -float(
                row[
                    "average_rank_strength"
                ]
            ),
            row[
                "musician_name"
            ].casefold(),
        )
    )

    for index, row in enumerate(
        output_rows,
        start=1,
    ):
        row["consensus_rank"] = index

    fieldnames = [
        "consensus_rank",
        "musician_name",
        "normalized_name",
        "source_count",
        "sources",
        "rolling_stone_rank",
        "bass_player_rank",
        "musicradar_reader_poll_rank",
        "udiscover_rank",
        "average_rank_strength",
        "consensus_score",
        "name_variants",
    ]

    with OUTPUT.open(
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
            output_rows
        )

    print("Wrote:", OUTPUT)
    print(
        "Unique bassist identities:",
        len(output_rows),
    )

    print()
    print("SOURCE CONSENSUS")

    for count in [4, 3, 2, 1]:
        tier = [
            row
            for row in output_rows
            if int(
                row["source_count"]
            ) == count
        ]

        print(
            f"  {count} sources: "
            f"{len(tier)}"
        )

    print()
    print("TOP 20 PROVISIONAL CONSENSUS")

    for row in output_rows[:20]:
        print(
            f'{row["consensus_rank"]:>3}. '
            f'{row["musician_name"]:<24} '
            f'{row["source_count"]} sources'
        )


if __name__ == "__main__":
    main()
