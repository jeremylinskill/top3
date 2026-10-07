import csv
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

SOURCE_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists-matched.csv"
)

OUTPUT_PATH = (
    ROOT
    / "editorial-guitarist-wikidata-candidates.csv"
)

WIKIDATA_API = "https://www.wikidata.org/w/api.php"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"

SEARCH_LIMIT = 5


def search_wikidata(name, attempts=8):
    params = {
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "uselang": "en",
        "type": "item",
        "limit": SEARCH_LIMIT,
        "format": "json",
        "maxlag": 5,
    }

    url = (
        WIKIDATA_API
        + "?"
        + urllib.parse.urlencode(params)
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
        },
    )

    transient_codes = {
        429,
        500,
        502,
        503,
        504,
    }

    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(
                request,
                timeout=60,
            ) as response:
                return json.load(response).get(
                    "search",
                    [],
                )

        except urllib.error.HTTPError as error:
            if (
                error.code not in transient_codes
                or attempt == attempts
            ):
                raise

            retry_after = error.headers.get(
                "Retry-After"
            )

            try:
                retry_after_seconds = int(
                    retry_after
                )
            except (
                TypeError,
                ValueError,
            ):
                retry_after_seconds = 0

            wait_seconds = max(
                retry_after_seconds,
                min(
                    90,
                    5 * (2 ** (attempt - 1)),
                ),
            )

            print(
                f"    HTTP {error.code}; "
                f"retrying in {wait_seconds}s..."
            )

            time.sleep(wait_seconds)

        except urllib.error.URLError:
            if attempt == attempts:
                raise

            wait_seconds = min(
                90,
                5 * (2 ** (attempt - 1)),
            )

            print(
                f"    Network error; "
                f"retrying in {wait_seconds}s..."
            )

            time.sleep(wait_seconds)

    raise RuntimeError(
        f"Wikidata search failed for {name}"
    )


def main():
    with SOURCE_PATH.open(
        newline="",
    ) as handle:
        rows = list(
            csv.DictReader(handle)
        )

    unmatched = [
        row
        for row in rows
        if row["match_status"] == "unmatched"
    ]

    fieldnames = [
        "source_id",
        "source_rank",
        "musician_name",
        "candidate_rank",
        "wikidata_id",
        "wikidata_label",
        "wikidata_description",
    ]

    output_rows = []

    if OUTPUT_PATH.exists():
        with OUTPUT_PATH.open(
            newline="",
        ) as handle:
            output_rows = list(
                csv.DictReader(handle)
            )

    completed = {
        (
            row["source_rank"],
            row["musician_name"],
        )
        for row in output_rows
    }

    pending = [
        row
        for row in unmatched
        if (
            row["source_rank"],
            row["musician_name"],
        ) not in completed
    ]

    print(
        f"Unmatched musicians: {len(unmatched)}"
    )

    if output_rows:
        print(
            f"Resuming with "
            f"{len(completed)}/{len(unmatched)} "
            "already searched."
        )

    def save_checkpoint():
        with OUTPUT_PATH.open(
            "w",
            newline="",
        ) as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=fieldnames,
            )

            writer.writeheader()
            writer.writerows(output_rows)

    for index, row in enumerate(
        pending,
        1,
    ):
        name = row["musician_name"]

        overall_number = (
            len(completed)
            + index
        )

        print(
            f"  {overall_number}/{len(unmatched)}: "
            f"{name}"
        )

        results = search_wikidata(name)

        if not results:
            output_rows.append({
                "source_id": row["source_id"],
                "source_rank": row["source_rank"],
                "musician_name": name,
                "candidate_rank": "",
                "wikidata_id": "",
                "wikidata_label": "",
                "wikidata_description": "",
            })

        else:
            for candidate_rank, result in enumerate(
                results,
                1,
            ):
                output_rows.append({
                    "source_id": row["source_id"],
                    "source_rank": row["source_rank"],
                    "musician_name": name,
                    "candidate_rank": candidate_rank,
                    "wikidata_id": result.get(
                        "id",
                        "",
                    ),
                    "wikidata_label": result.get(
                        "label",
                        "",
                    ),
                    "wikidata_description": result.get(
                        "description",
                        "",
                    ),
                })

        save_checkpoint()

        time.sleep(1.5)

    print()
    print(
        f"Wrote {len(output_rows)} Wikidata "
        f"candidate matches to {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
