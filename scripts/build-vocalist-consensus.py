#!/usr/bin/env python3

import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "vocalist-editorial-consensus.csv"
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
            / "editorial-rankings-rolling-stone-vocalists.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "rolling_stone_rank",
        "list_size": 200,
    },
    "consequence": {
        "label": "Consequence",
        "path": (
            ROOT
            / "editorial-rankings-consequence-vocalists.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "consequence_rank",
        "list_size": 100,
    },
    "ranker": {
        "label": "Ranker",
        "path": (
            ROOT
            / "editorial-rankings-ranker-vocalists.csv"
        ),
        "rank_field": "source_rank",
        "output_rank_field": "ranker_rank",
        "list_size": 547,
    },
}

DISPLAY_PRIORITY = [
    "rolling_stone",
    "consequence",
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


source_rows = {}

for source_key, spec in SOURCES.items():
    with spec["path"].open(
        newline="",
        encoding="utf-8",
    ) as handle:
        source_rows[source_key] = list(
            csv.DictReader(handle)
        )


# Detect same-name collisions within an individual
# editorial source. If the source supplies distinct entity
# IDs, preserve those people as separate identities.
source_collision_keys = {}

for source_key, rows in source_rows.items():
    base_keys = []

    for row in rows:
        name = row["musician_name"].strip()
        key, _ = resolve_identity(name)
        base_keys.append(key)

    counts = Counter(base_keys)

    collision_keys = {
        key
        for key, count in counts.items()
        if count > 1
    }

    source_collision_keys[
        source_key
    ] = collision_keys


records = defaultdict(
    lambda: {
        "variants": set(),
        "sources": set(),
        "strengths": {},
        "rolling_stone_rank": "",
        "consequence_rank": "",
        "ranker_rank": "",
        "source_entity_ids": set(),
        "display_name": "",
    }
)

display_candidates = defaultdict(dict)


for source_key, spec in SOURCES.items():
    for row in source_rows[source_key]:
        name = row[
            "musician_name"
        ].strip()

        base_key, canonical_name = (
            resolve_identity(name)
        )

        key = base_key

        if (
            base_key
            in source_collision_keys[
                source_key
            ]
        ):
            source_entity_id = (
                row.get(
                    "source_entity_id",
                    "",
                )
                or ""
            ).strip()

            if not source_entity_id:
                raise RuntimeError(
                    "Ambiguous duplicate identity "
                    f"in {source_key}: {name!r} "
                    "has no source_entity_id."
                )

            key = (
                f"{base_key}::"
                f"{source_key}:"
                f"{source_entity_id}"
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

        source_entity_id = (
            row.get(
                "source_entity_id",
                "",
            )
            or ""
        ).strip()

        if source_entity_id:
            record[
                "source_entity_ids"
            ].add(
                f"{source_key}:"
                f"{source_entity_id}"
            )

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

    base_key = key.split(
        "::",
        1,
    )[0]

    display_name = (
        CANONICAL_DISPLAY_NAMES.get(
            base_key,
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
        "consequence_rank":
            record[
                "consequence_rank"
            ],
        "ranker_rank":
            record[
                "ranker_rank"
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
        "source_entity_ids":
            " | ".join(
                sorted(
                    record[
                        "source_entity_ids"
                    ]
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
        row["normalized_name"],
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
    "consequence_rank",
    "ranker_rank",
    "average_rank_strength",
    "consensus_score",
    "name_variants",
    "source_entity_ids",
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
    f"Unique vocalist identities: "
    f"{len(output_rows)}"
)

print()
print("SOURCE CONSENSUS")

for count in [3, 2, 1]:
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
print("SAME-NAME DISAMBIGUATED IDENTITIES")

disambiguated = [
    row
    for row in output_rows
    if "::" in row[
        "normalized_name"
    ]
]

if disambiguated:
    for row in disambiguated:
        print(
            f"  {row['musician_name']} -> "
            f"{row['normalized_name']} "
            f"({row['source_entity_ids']})"
        )
else:
    print("  none")


print()
print("TOP 20 PROVISIONAL CONSENSUS")

for row in output_rows[:20]:
    print(
        f'{row["consensus_rank"]:>3}. '
        f'{row["musician_name"]:<24} '
        f'{row["source_count"]} sources'
    )
