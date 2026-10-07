import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path("data/musician-catalogue")

CONFIG_PATH = (
    ROOT
    / "role-catalogue-config.json"
)


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


def rank_strength(rank, list_size):
    if list_size <= 1:
        return 1.0

    return (
        list_size - rank
    ) / (
        list_size - 1
    )


def main():
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: "
            "python3 scripts/"
            "finalize-musician-role-catalogue.py "
            "<role>"
        )

    role = sys.argv[1].strip()

    config = json.loads(
        CONFIG_PATH.read_text()
    )

    if role not in config:
        raise RuntimeError(
            f"No catalogue config for role: {role}"
        )

    role_config = config[role]

    target_count = int(
        role_config["target_count"]
    )

    selection_mode = role_config.get(
        "selection_mode",
        "target_count",
    )

    excluded_names = {
        normalize_name(name)
        for name in role_config.get(
            "excluded_names",
            [],
        )
    }

    sources_config = role_config[
        "sources"
    ]

    consensus_path = (
        ROOT
        / f"{role}-editorial-consensus.csv"
    )

    candidates_path = (
        ROOT
        / f"{role}-catalogue-candidates.csv"
    )

    output_path = (
        ROOT
        / f"{role}-catalogue-final.csv"
    )

    with consensus_path.open(
        newline="",
    ) as handle:
        consensus_rows = list(
            csv.DictReader(handle)
        )

    consensus_by_name = {
        row["normalized_name"]: row
        for row in consensus_rows
    }

    source_denominator = max(
        int(row["source_count"])
        for row in consensus_rows
    )

    excluded = []
    core = []
    selected_expansion = []
    not_selected = []

    if (
        selection_mode
        == "all_editorial_except_exclusions"
    ):
        final_rows = []

        for source_row in consensus_rows:
            row = dict(source_row)

            key = normalize_name(
                row["musician_name"]
            )

            if key in excluded_names:
                excluded.append(row)
                continue

            strengths = []

            for source in sources_config.values():
                rank_field = source[
                    "rank_field"
                ]

                value = row.get(
                    rank_field,
                    "",
                )

                if not value:
                    continue

                strengths.append(
                    rank_strength(
                        int(value),
                        int(
                            source[
                                "list_size"
                            ]
                        ),
                    )
                )

            average_strength = (
                sum(strengths)
                / len(strengths)
                if strengths
                else 0.0
            )

            coverage = (
                int(row["source_count"])
                / source_denominator
            )

            row["_priority_score"] = (
                coverage * 0.50
                + average_strength * 0.50
            )

            if int(row["source_count"]) >= 2:
                row["selection_basis"] = (
                    "multi_source_core"
                )
                core.append(row)
            else:
                row["selection_basis"] = (
                    "single_source_editorial"
                )
                selected_expansion.append(row)

            row["notes"] = ""

            final_rows.append(row)

        final_rows.sort(
            key=lambda row: (
                -row["_priority_score"],
                -int(row["source_count"]),
                row["musician_name"].casefold(),
            )
        )

        if len(final_rows) != target_count:
            raise RuntimeError(
                f"Expected {target_count} final "
                f"musicians, got {len(final_rows)}."
            )

    else:
        with candidates_path.open(
            newline="",
        ) as handle:
            candidate_rows = list(
                csv.DictReader(handle)
            )

        expansion = []

        for row in candidate_rows:
            key = normalize_name(
                row["musician_name"]
            )

            if key in excluded_names:
                excluded.append(row)
                continue

            if (
                row["selection_basis"]
                == "multi_source_core"
            ):
                consensus = consensus_by_name[
                    row["normalized_name"]
                ]

                strengths = []

                for source in sources_config.values():
                    rank_field = source[
                        "rank_field"
                    ]

                    value = consensus.get(
                        rank_field,
                        "",
                    )

                    if not value:
                        continue

                    strengths.append(
                        rank_strength(
                            int(value),
                            int(
                                source[
                                    "list_size"
                                ]
                            ),
                        )
                    )

                average_strength = (
                    sum(strengths)
                    / len(strengths)
                    if strengths
                    else 0.0
                )

                coverage = (
                    int(
                        row["source_count"]
                    )
                    / source_denominator
                )

                row["_priority_score"] = (
                    coverage * 0.50
                    + average_strength * 0.50
                )

                core.append(row)

            else:
                row["_priority_score"] = float(
                    row["expansion_strength"]
                )

                expansion.append(row)

        core.sort(
            key=lambda row: (
                -row["_priority_score"],
                -int(row["source_count"]),
                row["musician_name"].casefold(),
            )
        )

        expansion.sort(
            key=lambda row: (
                -row["_priority_score"],
                row["musician_name"].casefold(),
            )
        )

        remaining_slots = (
            target_count - len(core)
        )

        if remaining_slots < 0:
            raise RuntimeError(
                f"Core contains {len(core)} musicians, "
                f"which exceeds target {target_count}."
            )

        if len(expansion) < remaining_slots:
            raise RuntimeError(
                f"Only {len(expansion)} expansion "
                f"candidates available for "
                f"{remaining_slots} remaining slots."
            )

        selected_expansion = expansion[
            :remaining_slots
        ]

        not_selected = expansion[
            remaining_slots:
        ]

        final_rows = (
            core
            + selected_expansion
        )

    base_fields = [
        "final_rank",
        "role",
        "musician_name",
        "normalized_name",
        "source_count",
        "sources",
        "selection_basis",
        "priority_score",
    ]

    diagnostic_fields = {
        "consensus_rank",
        "global_source_count",
        "global_rank_strength",
        "average_rank_strength",
        "consensus_score",
    }

    passthrough_fields = [
        field
        for field in consensus_rows[0].keys()
        if (
            field not in base_fields
            and field not in diagnostic_fields
        )
    ]

    fieldnames = (
        base_fields
        + passthrough_fields
        + ["notes"]
    )

    with output_path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for index, row in enumerate(
            final_rows,
            1,
        ):
            output_row = {
                "final_rank":
                    index,
                "role":
                    role,
                "musician_name":
                    row["musician_name"],
                "normalized_name":
                    row["normalized_name"],
                "source_count":
                    row["source_count"],
                "sources":
                    row["sources"],
                "selection_basis":
                    row["selection_basis"],
                "priority_score":
                    round(
                        row["_priority_score"],
                        6,
                    ),
                "notes":
                    row["notes"],
            }

            for field in passthrough_fields:
                output_row[field] = row.get(
                    field,
                    "",
                )

            writer.writerow(output_row)

    print(
        f"Role: {role}"
    )
    print(
        f"Selection mode: {selection_mode}"
    )
    print(
        f"Multi-source musicians: "
        f"{len(core)}"
    )
    print(
        f"Single-source musicians: "
        f"{len(selected_expansion)}"
    )
    print(
        f"Explicit exclusions: "
        f"{len(excluded)}"
    )
    print(
        f"Final catalogue: "
        f"{len(final_rows)}"
    )
    print(
        f"Wrote {output_path}"
    )

    print()
    print("EXCLUDED")

    if excluded:
        for row in excluded:
            print(
                f'  {row["musician_name"]}'
            )
    else:
        print("  none")

    if (
        selection_mode
        != "all_editorial_except_exclusions"
    ):
        print()
        print("EXPANSION CUTOFF")

        if selected_expansion:
            last = selected_expansion[-1]

            print(
                "  Last included: "
                f'{last["musician_name"]} '
                f'({last["_priority_score"]:.3f})'
            )

        if not_selected:
            first = not_selected[0]

            print(
                "  First not selected: "
                f'{first["musician_name"]} '
                f'({first["_priority_score"]:.3f})'
            )


if __name__ == "__main__":
    main()
