#!/usr/bin/env python3

import csv
import json
import urllib.parse
import urllib.request
from pathlib import Path

BASE = (
    "https://www.ranker.com/api/data/"
    "lists/855723/items"
)

PAGE_URL = (
    "https://www.ranker.com/crowdranked-list/"
    "the-greatest-rappers-of-all-time"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-ranker-mcs.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": PAGE_URL,
}


def fetch_batch(offset, limit=100):
    params = urllib.parse.urlencode({
        "limit": limit,
        "offset": offset,
        "include": (
            "votes,wikiText,rankings,"
            "openListItemContributors"
        ),
        "propertyFetchType": "ALL",
        "xr-client": "ranker-v3-client",
    })

    url = f"{BASE}?{params}"

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


def main():
    all_items = []
    offset = 0
    limit = 100

    while True:
        data = fetch_batch(
            offset,
            limit,
        )

        items = data.get(
            "listItems",
            [],
        )

        print(
            f"Fetched offset {offset}: "
            f"{len(items)}"
        )

        if not items:
            break

        all_items.extend(items)

        if len(items) < limit:
            break

        offset += limit

    rows = []

    for item in all_items:
        node = item.get("node") or {}

        rank = item.get("rank")
        name = (
            node.get("nameD")
            or item.get("name")
            or ""
        ).strip()

        node_id = node.get("id")

        if rank is None or not name:
            continue

        rows.append({
            "source_id":
                "ranker_greatest_rappers",
            "source_rank":
                int(rank),
            "source_entry_name":
                name,
            "musician_name":
                name,
            "source_entity_id":
                str(node_id or ""),
        })

    rows.sort(
        key=lambda row:
            row["source_rank"]
    )

    ranks = [
        row["source_rank"]
        for row in rows
    ]

    expected = list(
        range(
            1,
            len(rows) + 1,
        )
    )

    if ranks != expected:
        raise RuntimeError(
            "Ranker ranks are not "
            "contiguous from 1."
        )

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
                "musician_name",
                "source_entity_id",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print()
    print("Wrote:", OUTPUT)
    print("Entries:", len(rows))
    print(
        "Rank range:",
        f'{rows[0]["source_rank"]}–'
        f'{rows[-1]["source_rank"]}',
    )
    print(
        "Contiguous:",
        ranks == expected,
    )

    print()
    print("Top 5:")

    for row in rows[:5]:
        print(
            f'{row["source_rank"]}: '
            f'{row["musician_name"]} '
            f'[{row["source_entity_id"]}]'
        )

    print()
    print("Bottom 5:")

    for row in rows[-5:]:
        print(
            f'{row["source_rank"]}: '
            f'{row["musician_name"]} '
            f'[{row["source_entity_id"]}]'
        )


if __name__ == "__main__":
    main()
