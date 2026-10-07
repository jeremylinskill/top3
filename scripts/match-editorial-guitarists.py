import csv
import re
import unicodedata
from pathlib import Path

ROOT = Path("data/musician-catalogue")

EDITORIAL_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists-normalized.csv"
)

CANDIDATES_PATH = (
    ROOT
    / "candidates-guitarist-signals.csv"
)

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists-matched.csv"
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

    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )

    return " ".join(
        value.split()
    )


def main():
    with EDITORIAL_PATH.open(
        newline="",
    ) as handle:
        editorial_rows = list(
            csv.DictReader(handle)
        )

    with CANDIDATES_PATH.open(
        newline="",
    ) as handle:
        candidate_rows = list(
            csv.DictReader(handle)
        )

    candidates_by_name = {}

    for candidate in candidate_rows:
        key = normalize_name(
            candidate["name"]
        )

        candidates_by_name.setdefault(
            key,
            [],
        ).append(candidate)

    output_rows = []

    matched_count = 0
    ambiguous_count = 0
    unmatched_count = 0

    for row in editorial_rows:
        musician_name = row[
            "musician_name"
        ]

        key = normalize_name(
            musician_name
        )

        matches = candidates_by_name.get(
            key,
            [],
        )

        output_row = dict(row)

        if len(matches) == 1:
            candidate = matches[0]

            output_row.update({
                "match_status": "matched",
                "wikidata_id":
                    candidate["wikidata_id"],
                "canonical_name":
                    candidate["name"],
                "musicbrainz_id":
                    candidate.get(
                        "musicbrainz_id",
                        "",
                    ),
                "apple_music_artist_id":
                    candidate.get(
                        "apple_music_artist_id",
                        "",
                    ),
            })

            matched_count += 1

        elif len(matches) > 1:
            output_row.update({
                "match_status": "ambiguous",
                "wikidata_id": "",
                "canonical_name": "",
                "musicbrainz_id": "",
                "apple_music_artist_id": "",
            })

            ambiguous_count += 1

        else:
            output_row.update({
                "match_status": "unmatched",
                "wikidata_id": "",
                "canonical_name": "",
                "musicbrainz_id": "",
                "apple_music_artist_id": "",
            })

            unmatched_count += 1

        output_rows.append(
            output_row
        )

    fieldnames = [
        "source_id",
        "source_rank",
        "source_entry_name",
        "musician_name",
        "source_member_index",
        "source_member_count",
        "match_status",
        "wikidata_id",
        "canonical_name",
        "musicbrainz_id",
        "apple_music_artist_id",
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
        f"Editorial musicians: "
        f"{len(editorial_rows)}"
    )
    print(
        f"Matched: {matched_count}"
    )
    print(
        f"Ambiguous: {ambiguous_count}"
    )
    print(
        f"Unmatched: {unmatched_count}"
    )
    print(
        f"Wrote {OUTPUT_PATH}"
    )

    print()
    print("UNMATCHED:")

    for row in output_rows:
        if (
            row["match_status"]
            == "unmatched"
        ):
            print(
                f'{int(row["source_rank"]):>3}. '
                f'{row["musician_name"]}'
            )


if __name__ == "__main__":
    main()
