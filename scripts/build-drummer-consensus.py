#!/usr/bin/env python3

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "drummer-editorial-consensus.csv"
)

ALIASES_PATH = (
    ROOT
    / "editorial-identity-aliases.json"
)

SOURCES = {
    "rolling_stone": {
        "label": "Rolling Stone",
        "path": (
            ROOT
            / "editorial-rankings-rolling-stone-drummers.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "rolling_stone_rank",
        "list_size": 100,
    },
    "drumeo": {
        "label": "Drumeo",
        "path": (
            ROOT
            / "editorial-rankings-drumeo-drummers.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "drumeo_rank",
        "list_size": 100,
    },
    "consequence": {
        "label": "Consequence",
        "path": (
            ROOT
            / "editorial-rankings-consequence-drummers.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "consequence_rank",
        "list_size": 100,
    },
    "musicradar_reader_poll": {
        "label": "MusicRadar Reader Poll",
        "path": (
            ROOT
            / "editorial-rankings-musicradar-reader-poll-drummers.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "musicradar_reader_poll_rank",
        "list_size": 50,
    },
}

DISPLAY_PRIORITY = [
    "rolling_stone",
    "drumeo",
    "consequence",
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

    return " ".join(
        value.split()
    )


IDENTITY_ALIASES = json.loads(
    ALIASES_PATH.read_text(
        encoding="utf-8"
    )
)

CANONICAL_DISPLAY_NAMES = {}

for alias in IDENTITY_ALIASES.values():
    canonical_name = alias[
        "canonical_name"
    ].strip()

    CANONICAL_DISPLAY_NAMES[
        normalize_name(canonical_name)
    ] = canonical_name


def resolve_identity(name):
    source_key = normalize_name(name)

    alias = IDENTITY_ALIASES.get(
        source_key
    )

    if alias:
        canonical_name = alias[
            "canonical_name"
        ].strip()
    else:
        canonical_name = name.strip()

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


records = defaultdict(
    lambda: {
        "variants": set(),
        "sources": set(),
        "strengths": {},
        "rolling_stone_rank": "",
        "drumeo_rank": "",
        "consequence_rank": "",
        "musicradar_reader_poll_rank": "",
    }
)

display_candidates = defaultdict(dict)


for source_key, spec in SOURCES.items():
    with spec["path"].open(
        newline="",
        encoding="utf-8",
    ) as handle:
        rows = list(
            csv.DictReader(handle)
        )

    for row in rows:
        name = row[
            "musician_name"
        ].strip()

        key, canonical_name = (
            resolve_identity(name)
        )

        rank = int(
            row[
                spec["rank_field"]
            ]
        )

        record = records[key]

        record["variants"].add(name)
        record["sources"].add(
            spec["label"]
        )

        record["strengths"][
            source_key
        ] = rank_strength(
            rank,
            spec["list_size"],
        )

        record[
            spec["output_rank_field"]
        ] = rank

        display_candidates[
            key
        ][source_key] = canonical_name


output_rows = []

for key, record in records.items():
    display_name = ""

    for source_key in DISPLAY_PRIORITY:
        candidate = (
            display_candidates[
                key
            ].get(source_key)
        )

        if candidate:
            display_name = candidate
            break

    display_name = (
        CANONICAL_DISPLAY_NAMES.get(
            key,
            display_name,
        )
    )

    source_count = len(
        record["sources"]
    )

    average_rank_strength = (
        sum(
            record[
                "strengths"
            ].values()
        )
        / len(SOURCES)
    )

    consensus_score = (
        source_count * 100
        + average_rank_strength * 10
    )

    output_rows.append({
        "musician_name":
            display_name,
        "normalized_name":
            key,
        "source_count":
            source_count,
        "sources":
            " | ".join(
                sorted(
                    record["sources"]
                )
            ),
        "rolling_stone_rank":
            record[
                "rolling_stone_rank"
            ],
        "drumeo_rank":
            record[
                "drumeo_rank"
            ],
        "consequence_rank":
            record[
                "consequence_rank"
            ],
        "musicradar_reader_poll_rank":
            record[
                "musicradar_reader_poll_rank"
            ],
        "average_rank_strength":
            round(
                average_rank_strength,
                6,
            ),
        "consensus_score":
            round(
                consensus_score,
                6,
            ),
        "name_variants":
            " | ".join(
                sorted(
                    record["variants"],
                    key=str.casefold,
                )
            ),
    })


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
    1,
):
    row["consensus_rank"] = index


fieldnames = [
    "consensus_rank",
    "musician_name",
    "normalized_name",
    "source_count",
    "sources",
    "rolling_stone_rank",
    "drumeo_rank",
    "consequence_rank",
    "musicradar_reader_poll_rank",
    "average_rank_strength",
    "consensus_score",
    "name_variants",
]


with OUTPUT_PATH.open(
    "w",
    newline="",
    encoding="utf-8",
) as handle:
    writer = csv.DictWriter(
        handle,
        fieldnames=fieldnames,
    )

    writer.writeheader()
    writer.writerows(output_rows)


print(
    f"Wrote: {OUTPUT_PATH}"
)
print(
    f"Unique drummer identities: "
    f"{len(output_rows)}"
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
