#!/usr/bin/env python3

import csv
import json
import urllib.parse
import urllib.request
from pathlib import Path

PAGE_URL = "https://www.ranker.com/crowdranked-list/20-greatest-singers"
API_BASE = "https://www.ranker.com/api/data"
LIST_ID = 611912

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-ranker-vocalists.csv"
)

SOURCE_ID = "ranker_best_singers_2026"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": PAGE_URL,
}

BATCH_SIZE = 100


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers=HEADERS,
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        return json.loads(
            response.read().decode(
                "utf-8",
                errors="replace",
            )
        )


def fetch_items(
    offset: int,
    limit: int,
) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "limit": limit,
            "offset": offset,
            "include": (
                "votes,wikiText,rankings,"
                "serviceProviders,"
                "openListItemContributors"
            ),
            "propertyFetchType": (
                "SHOWN_ON_LIST_ONLY"
            ),
            "xr-client": "ranker-v3-client",
        }
    )

    url = (
        f"{API_BASE}/lists/{LIST_ID}/items?"
        f"{params}"
    )

    data = fetch_json(url)

    items = data.get("listItems", [])

    if not isinstance(items, list):
        raise RuntimeError(
            "Ranker listItems was not a list"
        )

    return items


def main() -> None:
    entries: dict[int, dict] = {}

    offset = 0

    while True:
        items = fetch_items(
            offset=offset,
            limit=BATCH_SIZE,
        )

        print(
            f"Fetched offset {offset}: "
            f"{len(items)} items"
        )

        if not items:
            break

        for item in items:
            rank = item.get("rank")

            node = item.get("node") or {}

            node_id = node.get("id")
            name = node.get("nameD")

            if not isinstance(rank, int):
                continue

            if not isinstance(
                name,
                str,
            ) or not name.strip():
                continue

            if rank in entries:
                raise RuntimeError(
                    f"Duplicate rank found: {rank}"
                )

            entries[rank] = {
                "rank": rank,
                "node_id": node_id,
                "name": name.strip(),
            }

        if len(items) < BATCH_SIZE:
            break

        offset += BATCH_SIZE

    if not entries:
        raise RuntimeError(
            "No Ranker vocalist entries extracted"
        )

    max_rank = max(entries)

    expected_ranks = set(
        range(1, max_rank + 1)
    )
    actual_ranks = set(entries)

    missing = sorted(
        expected_ranks - actual_ranks
    )

    if missing:
        raise RuntimeError(
            "Ranker extraction failed validation: "
            f"entries={len(entries)}, "
            f"max_rank={max_rank}, "
            f"missing={missing}"
        )

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
                "musician_name",
                "source_entity_id",
            ],
        )

        writer.writeheader()

        for rank in range(
            1,
            max_rank + 1,
        ):
            entry = entries[rank]

            writer.writerow(
                {
                    "source_id": SOURCE_ID,
                    "source_rank": rank,
                    "source_entry_name": (
                        entry["name"]
                    ),
                    "musician_name": (
                        entry["name"]
                    ),
                    "source_entity_id": (
                        entry["node_id"]
                    ),
                }
            )

    print()
    print(
        f"Entries extracted: {len(entries)}"
    )
    print(
        f"Rank range: "
        f"{min(entries)}–{max(entries)}"
    )
    print(f"Missing ranks: {missing}")
    print(f"Wrote: {OUTPUT_PATH}")

    print()
    print("Top 5:")

    for rank in range(1, 6):
        print(
            f"{rank}: "
            f"{entries[rank]['name']}"
        )

    print()
    print("Bottom 5:")

    for rank in range(
        max_rank - 4,
        max_rank + 1,
    ):
        print(
            f"{rank}: "
            f"{entries[rank]['name']}"
        )


if __name__ == "__main__":
    main()
