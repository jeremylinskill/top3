#!/usr/bin/env python3

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT = ROOT / "mc-editorial-consensus.csv"

ALIASES_PATH = (
    ROOT / "editorial-identity-aliases.json"
)

SOURCES = [
    {
        "key": "billboard_vibe",
        "label": "Billboard/VIBE",
        "path": (
            ROOT
            / "editorial-rankings-billboard-vibe-mcs.csv"
        ),
        "rank_field": "billboard_vibe_rank",
        "list_size": 50,
    },
    {
        "key": "hiphop_golden_age",
        "label": "Hip Hop Golden Age",
        "path": (
            ROOT
            / "editorial-rankings-hiphop-golden-age-mcs.csv"
        ),
        "rank_field": "hiphop_golden_age_rank",
        "list_size": 50,
    },
    {
        "key": "beats_rhymes_lists",
        "label": "Beats, Rhymes & Lists",
        "path": (
            ROOT
            / "editorial-rankings-beats-rhymes-lists-mcs.csv"
        ),
        "rank_field": "beats_rhymes_lists_rank",
        "list_size": 100,
    },
    {
        "key": "ranker",
        "label": "Ranker",
        "path": (
            ROOT
            / "editorial-rankings-ranker-mcs.csv"
        ),
        "rank_field": "ranker_rank",
        "list_size": 256,
    },
]

DISPLAY_PRIORITY = [
    "billboard_vibe",
    "hiphop_golden_age",
    "beats_rhymes_lists",
    "ranker",
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
    if not ALIASES_PATH.exists():
        return {}

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
            "ranker_entity_ids": set(),
        }
    )

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
                "display_name":
                    canonical_name,
            }

            record["strengths"].append(
                rank_strength(
                    rank,
                    source["list_size"],
                )
            )

            entity_id = (
                row.get(
                    "source_entity_id",
                    "",
                )
                .strip()
            )

            if entity_id:
                record[
                    "ranker_entity_ids"
                ].add(entity_id)

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

        average_rank_strength = (
            sum(record["strengths"])
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
            "source_entity_ids":
                " | ".join(
                    f"ranker:{entity_id}"
                    for entity_id in sorted(
                        record[
                            "ranker_entity_ids"
                        ]
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
        "billboard_vibe_rank",
        "hiphop_golden_age_rank",
        "beats_rhymes_lists_rank",
        "ranker_rank",
        "average_rank_strength",
        "consensus_score",
        "name_variants",
        "source_entity_ids",
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
        "Unique MC identities:",
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
