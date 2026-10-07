#!/usr/bin/env python3

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT = ROOT / "dj-editorial-consensus.csv"

ALIASES_PATH = (
    ROOT / "editorial-identity-aliases.json"
)

EXCLUSIONS_PATH = (
    ROOT / "dj-non-person-entities.json"
)

SOURCES = [
    {
        "key": "djmag",
        "label": "DJ Mag",
        "path": (
            ROOT
            / "editorial-rankings-djmag-djs.csv"
        ),
        "rank_field": "djmag_rank",
        "position_field": "",
        "ranked": True,
        "list_size": 100,
    },
    {
        "key": "xxl",
        "label": "XXL",
        "path": (
            ROOT
            / "editorial-rankings-xxl-hiphop-djs.csv"
        ),
        "rank_field": "",
        "position_field": "xxl_position",
        "ranked": False,
        "list_size": 48,
    },
    {
        "key": "musicradar",
        "label": "MusicRadar",
        "path": (
            ROOT
            / "editorial-rankings-musicradar-greatest-djs.csv"
        ),
        "rank_field": "",
        "position_field": "musicradar_position",
        "ranked": False,
        "list_size": 20,
    },
    {
        "key": "skiddle",
        "label": "Skiddle",
        "path": (
            ROOT
            / "editorial-rankings-skiddle-greatest-djs.csv"
        ),
        "rank_field": "",
        "position_field": "skiddle_position",
        "ranked": False,
        "list_size": 35,
    },
]

DISPLAY_PRIORITY = [
    "xxl",
    "musicradar",
    "skiddle",
    "djmag",
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


def alias_name(value):
    if isinstance(value, str):
        return value

    if isinstance(value, dict):
        return value.get(
            "canonical_name",
            "",
        )

    return ""


def load_aliases():
    raw = json.loads(
        ALIASES_PATH.read_text(
            encoding="utf-8"
        )
    )

    aliases = {}

    for key, value in raw.items():
        canonical = alias_name(value)

        if canonical:
            aliases[
                normalize_name(key)
            ] = canonical

    return aliases


def load_exclusions():
    raw = json.loads(
        EXCLUSIONS_PATH.read_text(
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
    return (
        list_size - rank
    ) / (
        list_size - 1
    )


def main():
    aliases = load_aliases()
    exclusions = load_exclusions()

    records = defaultdict(
        lambda: {
            "variants": set(),
            "sources": {},
        }
    )

    excluded_rows = []

    for source in SOURCES:
        with source["path"].open(
            newline="",
            encoding="utf-8",
        ) as f:
            rows = list(csv.DictReader(f))

        for row in rows:
            source_name = (
                row["musician_name"]
                .strip()
            )

            (
                identity_key,
                canonical_name,
            ) = resolve_identity(
                source_name,
                aliases,
            )

            if identity_key in exclusions:
                excluded_rows.append(
                    {
                        "source":
                            source["label"],
                        "name":
                            source_name,
                        "reason":
                            exclusions[
                                identity_key
                            ]["reason"],
                    }
                )
                continue

            record = records[
                identity_key
            ]

            record["variants"].add(
                source_name
            )
            record["variants"].add(
                canonical_name
            )

            source_data = {
                "label":
                    source["label"],
                "display_name":
                    canonical_name,
            }

            if source["ranked"]:
                rank = int(
                    row["source_rank"]
                )

                source_data["rank"] = rank
                source_data[
                    "rank_strength"
                ] = rank_strength(
                    rank,
                    source["list_size"],
                )

            else:
                source_data[
                    "position"
                ] = int(
                    row["source_position"]
                )

            record["sources"][
                source["key"]
            ] = source_data

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

            if source_data:
                display_name = (
                    source_data[
                        "display_name"
                    ]
                )
                break

        if not display_name:
            display_name = sorted(
                record["variants"]
            )[0]

        djmag_data = record[
            "sources"
        ].get("djmag")

        djmag_strength = (
            djmag_data[
                "rank_strength"
            ]
            if djmag_data
            else 0.0
        )

        consensus_score = (
            source_count * 100
            + djmag_strength * 10
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
            "djmag_rank":
                (
                    djmag_data["rank"]
                    if djmag_data
                    else ""
                ),
            "xxl_position":
                "",
            "musicradar_position":
                "",
            "skiddle_position":
                "",
            "djmag_rank_strength":
                f"{djmag_strength:.6f}",
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
            if source["ranked"]:
                continue

            source_data = record[
                "sources"
            ].get(source["key"])

            if source_data:
                output[
                    source[
                        "position_field"
                    ]
                ] = source_data[
                    "position"
                ]

        output_rows.append(output)

    output_rows.sort(
        key=lambda row: (
            -int(
                row["source_count"]
            ),
            -float(
                row[
                    "djmag_rank_strength"
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
        "djmag_rank",
        "xxl_position",
        "musicradar_position",
        "skiddle_position",
        "djmag_rank_strength",
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
        writer.writerows(output_rows)

    print("Wrote:", OUTPUT)
    print(
        "Unique individual DJ identities:",
        len(output_rows),
    )
    print(
        "Excluded non-person source entries:",
        len(excluded_rows),
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
            f'{row["source_count"]} sources '
            f'DJMag={row["djmag_rank"] or "-"}'
        )

    print()
    print("EXCLUDED NON-PERSON ENTRIES")

    for row in excluded_rows:
        print(
            f'{row["source"]}: '
            f'{row["name"]} — '
            f'{row["reason"]}'
        )


if __name__ == "__main__":
    main()
