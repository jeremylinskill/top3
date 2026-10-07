#!/usr/bin/env python3

import csv
import json
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

BASE_URL = (
    "https://consequence.net/list/"
    "100-best-drummers-of-all-time/"
)

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-consequence-drummers.csv"
)

SOURCE_ID = "consequence_100_best_drummers"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}


class JsonLdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_json_ld = False
        self.blocks = []
        self.current = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return

        attrs = dict(attrs)

        if attrs.get("type") == "application/ld+json":
            self.in_json_ld = True
            self.current = []

    def handle_data(self, data):
        if self.in_json_ld:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.in_json_ld:
            self.blocks.append(
                "".join(self.current)
            )

            self.in_json_ld = False
            self.current = []


def fetch(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers=HEADERS,
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        return response.read().decode(
            "utf-8",
            errors="replace",
        )


def find_item_list(value):
    if isinstance(value, dict):
        if value.get("@type") == "ItemList":
            name = str(
                value.get("name", "")
            )

            if (
                "drummer" in name.casefold()
                or "100 best" in name.casefold()
            ):
                return value

        for nested in value.values():
            found = find_item_list(nested)

            if found is not None:
                return found

    elif isinstance(value, list):
        for nested in value:
            found = find_item_list(nested)

            if found is not None:
                return found

    return None


def main() -> None:
    raw = fetch(BASE_URL)

    parser = JsonLdParser()
    parser.feed(raw)

    item_list = None

    for block in parser.blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue

        item_list = find_item_list(data)

        if item_list is not None:
            break

    if item_list is None:
        raise RuntimeError(
            "Consequence drummer ItemList not found"
        )

    entries: dict[int, str] = {}

    for item in item_list.get(
        "itemListElement",
        [],
    ):
        if not isinstance(item, dict):
            continue

        rank = item.get("position")

        nested = item.get("item") or {}

        if isinstance(nested, dict):
            name = (
                nested.get("name")
                or item.get("name")
            )
        else:
            name = item.get("name")

        try:
            rank = int(rank)
        except (TypeError, ValueError):
            continue

        if (
            not isinstance(name, str)
            or not name.strip()
        ):
            continue

        if 1 <= rank <= 100:
            entries[rank] = name.strip()

    expected_ranks = set(
        range(1, 101)
    )

    actual_ranks = set(entries)

    missing = sorted(
        expected_ranks - actual_ranks
    )

    unexpected = sorted(
        actual_ranks - expected_ranks
    )

    if (
        missing
        or unexpected
        or len(entries) != 100
    ):
        raise RuntimeError(
            "Consequence extraction "
            "failed validation: "
            f"entries={len(entries)}, "
            f"missing={missing}, "
            f"unexpected={unexpected}"
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
            ],
        )

        writer.writeheader()

        for rank in range(1, 101):
            name = entries[rank]

            writer.writerow({
                "source_id":
                    SOURCE_ID,
                "source_rank":
                    rank,
                "source_entry_name":
                    name,
                "musician_name":
                    name,
            })

    print(
        f"Entries extracted: {len(entries)}"
    )
    print(
        f"Rank range: "
        f"{min(entries)}–{max(entries)}"
    )
    print(
        f"Missing ranks: {missing}"
    )
    print(
        f"Wrote: {OUTPUT_PATH}"
    )

    print()
    print("Top 5:")

    for rank in range(1, 6):
        print(
            f"{rank}: {entries[rank]}"
        )

    print()
    print("Bottom 5:")

    for rank in range(96, 101):
        print(
            f"{rank}: {entries[rank]}"
        )


if __name__ == "__main__":
    main()
