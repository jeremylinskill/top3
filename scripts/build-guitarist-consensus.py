import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "guitarist-editorial-consensus.csv"
)

ALIASES_PATH = (
    ROOT
    / "editorial-identity-aliases.json"
)

GLOBAL_SOURCES = {
    "rolling_stone": {
        "label": "Rolling Stone",
        "path": (
            ROOT
            / "editorial-rankings-rolling-stone-guitarists-normalized.csv"
        ),
        "rank_field": "source_rank",
        "list_size": 250,
    },
    "udiscover": {
        "label": "uDiscover",
        "path": (
            ROOT
            / "editorial-rankings-udiscover-guitarists-normalized.csv"
        ),
        "rank_field": "source_rank",
        "list_size": 75,
    },
    "spin": {
        "label": "SPIN",
        "path": (
            ROOT
            / "editorial-rankings-spin-guitarists-normalized.csv"
        ),
        "rank_field": "source_rank",
        "list_size": 100,
    },
}

GUITAR_WORLD = {
    "label": "Guitar World",
    "path": (
        ROOT
        / "editorial-rankings-guitar-world-guitarists-normalized.csv"
    ),
}


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

    # Keep compact initials equivalent:
    # B.B. King -> bb king
    # K.K. Downing -> kk downing
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
    ALIASES_PATH.read_text()
)

CANONICAL_DISPLAY_NAMES = {}

for alias in IDENTITY_ALIASES.values():
    canonical_name = alias[
        "canonical_name"
    ].strip()

    CANONICAL_DISPLAY_NAMES[
        normalize_name(
            canonical_name
        )
    ] = canonical_name


def resolve_identity(name):
    source_key = normalize_name(
        name
    )

    alias = IDENTITY_ALIASES.get(
        source_key
    )

    if alias:
        canonical_name = alias[
            "canonical_name"
        ].strip()
    else:
        canonical_name = name

    return (
        normalize_name(
            canonical_name
        ),
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
        "global_strengths": {},
        "rolling_stone_rank": "",
        "udiscover_rank": "",
        "spin_rank": "",
        "guitar_world_category": "",
        "guitar_world_category_rank": "",
    }
)

display_priority = [
    "rolling_stone",
    "guitar_world",
    "udiscover",
    "spin",
]

display_candidates = defaultdict(dict)


for source_key, spec in GLOBAL_SOURCES.items():
    with spec["path"].open(
        newline="",
    ) as handle:
        rows = list(
            csv.DictReader(handle)
        )

    for row in rows:
        name = row[
            "musician_name"
        ].strip()

        key, _canonical_name = resolve_identity(
            name
        )

        rank = int(
            row[
                spec["rank_field"]
            ]
        )

        record = records[key]

        record["variants"].add(
            name
        )

        record["sources"].add(
            spec["label"]
        )

        record[
            "global_strengths"
        ][source_key] = rank_strength(
            rank,
            spec["list_size"],
        )

        record[
            f"{source_key}_rank"
        ] = rank

        display_candidates[
            key
        ][source_key] = name


with GUITAR_WORLD["path"].open(
    newline="",
) as handle:
    rows = list(
        csv.DictReader(handle)
    )

for row in rows:
    name = row[
        "musician_name"
    ].strip()

    key, _canonical_name = resolve_identity(
        name
    )

    record = records[key]

    record["variants"].add(
        name
    )

    record["sources"].add(
        GUITAR_WORLD["label"]
    )

    record[
        "guitar_world_category"
    ] = row[
        "source_category"
    ]

    record[
        "guitar_world_category_rank"
    ] = int(
        row[
            "category_rank"
        ]
    )

    display_candidates[
        key
    ]["guitar_world"] = name


output_rows = []

for key, record in records.items():
    display_name = ""

    for source_key in display_priority:
        candidate = display_candidates[
            key
        ].get(
            source_key
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

    global_source_count = len(
        record["global_strengths"]
    )

    # Missing global-list appearances count as zero.
    # This rewards both strong placement and repeated
    # appearance across the three globally ranked lists.
    global_rank_strength = (
        sum(
            record[
                "global_strengths"
            ].values()
        )
        / len(
            GLOBAL_SOURCES
        )
    )

    # Provisional only:
    # source consensus dominates absolutely.
    # Rank strength is only a tiebreaker within a tier.
    consensus_score = (
        source_count * 100
        + global_rank_strength * 10
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
        "global_source_count":
            global_source_count,
        "rolling_stone_rank":
            record[
                "rolling_stone_rank"
            ],
        "guitar_world_category":
            record[
                "guitar_world_category"
            ],
        "guitar_world_category_rank":
            record[
                "guitar_world_category_rank"
            ],
        "udiscover_rank":
            record[
                "udiscover_rank"
            ],
        "spin_rank":
            record[
                "spin_rank"
            ],
        "global_rank_strength":
            round(
                global_rank_strength,
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
        -row["source_count"],
        -row["global_rank_strength"],
        row["musician_name"].casefold(),
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
    "global_source_count",
    "rolling_stone_rank",
    "guitar_world_category",
    "guitar_world_category_rank",
    "udiscover_rank",
    "spin_rank",
    "global_rank_strength",
    "consensus_score",
    "name_variants",
]


with OUTPUT_PATH.open(
    "w",
    newline="",
) as handle:
    writer = csv.DictWriter(
        handle,
        fieldnames=fieldnames,
    )

    writer.writeheader()
    writer.writerows(
        output_rows
    )


print(
    f"Consensus musicians: "
    f"{len(output_rows)}"
)
print(
    f"Wrote {OUTPUT_PATH}"
)

print()
print("CONSENSUS TIERS")

for count in range(4, 0, -1):
    tier = [
        row
        for row in output_rows
        if row["source_count"] == count
    ]

    print(
        f"  {count} sources: "
        f"{len(tier)}"
    )

print()
print("TOP 30 PROVISIONAL CONSENSUS")

for row in output_rows[:30]:
    print(
        f'{row["consensus_rank"]:>3}. '
        f'{row["musician_name"]:<24} '
        f'{row["source_count"]} sources  '
        f'global={row["global_rank_strength"]:.3f}'
    )

print()
print(
    "NOTE: consensus_score and consensus_rank "
    "are diagnostic/provisional only."
)
print(
    "Guitar World category rank is preserved "
    "but does not affect global_rank_strength."
)
