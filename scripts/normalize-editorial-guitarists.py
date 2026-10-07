import csv
import html
import json
import re
from pathlib import Path

ROOT = Path("data/musician-catalogue")

SOURCE_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists.csv"
)

OVERRIDES_PATH = (
    ROOT
    / "editorial-name-overrides.json"
)

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists-normalized.csv"
)

SOURCE_ID = "rolling-stone-250-guitarists-2023"


def clean_name(value):
    value = html.unescape(value)

    value = re.sub(
        r"<[^>]+>",
        "",
        value,
    )

    return " ".join(
        value.split()
    )


def main():
    with SOURCE_PATH.open(
        newline="",
    ) as handle:
        source_rows = list(
            csv.DictReader(handle)
        )

    overrides = json.loads(
        OVERRIDES_PATH.read_text()
    ).get(
        SOURCE_ID,
        {},
    )

    normalized_rows = []

    for row in source_rows:
        rank = row["source_rank"]
        source_entry_name = row[
            "source_entry_name"
        ]

        override_names = overrides.get(
            rank
        )

        if override_names:
            musician_names = override_names
        else:
            musician_names = [
                clean_name(
                    source_entry_name
                )
            ]

        member_count = len(
            musician_names
        )

        for index, musician_name in enumerate(
            musician_names,
            1,
        ):
            normalized_rows.append({
                "source_id": row["source_id"],
                "source_rank": rank,
                "source_entry_name":
                    source_entry_name,
                "musician_name":
                    clean_name(musician_name),
                "source_member_index":
                    index,
                "source_member_count":
                    member_count,
            })

    expected_count = (
        len(source_rows)
        + sum(
            len(names) - 1
            for names in overrides.values()
        )
    )

    if len(normalized_rows) != expected_count:
        raise RuntimeError(
            f"Expected {expected_count} "
            f"normalized musicians, got "
            f"{len(normalized_rows)}"
        )

    with OUTPUT_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
                "musician_name",
                "source_member_index",
                "source_member_count",
            ],
        )

        writer.writeheader()
        writer.writerows(
            normalized_rows
        )

    print(
        f"Source entries: {len(source_rows)}"
    )
    print(
        f"Individual musician records: "
        f"{len(normalized_rows)}"
    )
    print(
        f"Multi-person entries expanded: "
        f"{len(overrides)}"
    )
    print(
        f"Wrote {OUTPUT_PATH}"
    )

    print()
    print("Normalized special entries:")

    for row in normalized_rows:
        if (
            int(
                row["source_member_count"]
            ) > 1
            or "<" in row["source_entry_name"]
        ):
            print(
                f'  {int(row["source_rank"]):>3}. '
                f'{row["musician_name"]}'
            )


if __name__ == "__main__":
    main()
