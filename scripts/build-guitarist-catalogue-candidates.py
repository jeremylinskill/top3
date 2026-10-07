import csv
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/musician-catalogue")

CONSENSUS_PATH = (
    ROOT
    / "guitarist-editorial-consensus.csv"
)

GW_PATH = (
    ROOT
    / "editorial-rankings-guitar-world-guitarists-normalized.csv"
)

OUTPUT_PATH = (
    ROOT
    / "guitarist-catalogue-candidates.csv"
)

EXPANSION_THRESHOLD = 0.30


def rank_strength(rank, list_size):
    if list_size <= 1:
        return 1.0

    return (
        list_size - rank
    ) / (
        list_size - 1
    )


with CONSENSUS_PATH.open(newline="") as handle:
    rows = list(csv.DictReader(handle))

with GW_PATH.open(newline="") as handle:
    gw_rows = list(csv.DictReader(handle))


gw_category_sizes = defaultdict(int)

for row in gw_rows:
    category = row["source_category"]
    rank = int(row["category_rank"])

    gw_category_sizes[category] = max(
        gw_category_sizes[category],
        rank,
    )


def single_source_strength(row):
    source = row["sources"]

    if source == "Rolling Stone":
        return rank_strength(
            int(row["rolling_stone_rank"]),
            250,
        )

    if source == "uDiscover":
        return rank_strength(
            int(row["udiscover_rank"]),
            75,
        )

    if source == "SPIN":
        return rank_strength(
            int(row["spin_rank"]),
            100,
        )

    if source == "Guitar World":
        category = row[
            "guitar_world_category"
        ]

        return rank_strength(
            int(
                row[
                    "guitar_world_category_rank"
                ]
            ),
            gw_category_sizes[category],
        )

    raise RuntimeError(
        f"Unknown source: {source}"
    )


selected = []

for row in rows:
    source_count = int(
        row["source_count"]
    )

    if source_count >= 2:
        selection_basis = (
            "multi_source_core"
        )

        expansion_strength = ""

    else:
        strength = single_source_strength(
            row
        )

        if strength < EXPANSION_THRESHOLD:
            continue

        selection_basis = (
            "single_source_expansion"
        )

        expansion_strength = round(
            strength,
            6,
        )

    selected.append({
        "musician_name":
            row["musician_name"],
        "normalized_name":
            row["normalized_name"],
        "source_count":
            source_count,
        "sources":
            row["sources"],
        "selection_basis":
            selection_basis,
        "expansion_strength":
            expansion_strength,
        "role_validation":
            "pending",
        "selection_status":
            "candidate",
        "rolling_stone_rank":
            row["rolling_stone_rank"],
        "guitar_world_category":
            row["guitar_world_category"],
        "guitar_world_category_rank":
            row[
                "guitar_world_category_rank"
            ],
        "udiscover_rank":
            row["udiscover_rank"],
        "spin_rank":
            row["spin_rank"],
        "name_variants":
            row["name_variants"],
        "notes":
            "",
    })


core = [
    row
    for row in selected
    if row["selection_basis"]
    == "multi_source_core"
]

expansion = [
    row
    for row in selected
    if row["selection_basis"]
    == "single_source_expansion"
]


core.sort(
    key=lambda row: (
        -row["source_count"],
        row["musician_name"].casefold(),
    )
)

expansion.sort(
    key=lambda row: (
        -float(
            row["expansion_strength"]
        ),
        row["musician_name"].casefold(),
    )
)

selected = core + expansion


with OUTPUT_PATH.open(
    "w",
    newline="",
) as handle:
    writer = csv.DictWriter(
        handle,
        fieldnames=[
            "musician_name",
            "normalized_name",
            "source_count",
            "sources",
            "selection_basis",
            "expansion_strength",
            "role_validation",
            "selection_status",
            "rolling_stone_rank",
            "guitar_world_category",
            "guitar_world_category_rank",
            "udiscover_rank",
            "spin_rank",
            "name_variants",
            "notes",
        ],
    )

    writer.writeheader()
    writer.writerows(selected)


print(
    f"Multi-source core: {len(core)}"
)
print(
    f"Single-source expansion: "
    f"{len(expansion)}"
)
print(
    f"Total catalogue candidates: "
    f"{len(selected)}"
)
print(
    f"Expansion threshold: "
    f"{EXPANSION_THRESHOLD:.2f}"
)
print(
    f"Wrote {OUTPUT_PATH}"
)

print()
print(
    "All candidates remain pending "
    "guitarist-role validation."
)
