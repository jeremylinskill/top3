#!/usr/bin/env python3

import csv
import json
import urllib.request
from pathlib import Path
from html.parser import HTMLParser

URL = "https://consequence.net/list/the-100-best-vocalists-of-all-time"

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-consequence-vocalists.csv"
)

SOURCE_ID = "consequence_100_best_vocalists_2026"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}


class JsonLdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_json_ld = False
        self.current = []
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return

        attrs_dict = dict(attrs)

        if attrs_dict.get("type") == "application/ld+json":
            self.in_json_ld = True
            self.current = []

    def handle_data(self, data):
        if self.in_json_ld:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.in_json_ld:
            self.blocks.append("".join(self.current))
            self.in_json_ld = False
            self.current = []


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers=HEADERS)

    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def find_item_list(raw: str) -> dict:
    parser = JsonLdParser()
    parser.feed(raw)

    for block in parser.blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue

        candidates = []

        if isinstance(data, dict):
            candidates.append(data)

            graph = data.get("@graph")
            if isinstance(graph, list):
                candidates.extend(
                    item for item in graph
                    if isinstance(item, dict)
                )

        elif isinstance(data, list):
            candidates.extend(
                item for item in data
                if isinstance(item, dict)
            )

        for candidate in candidates:
            if candidate.get("@type") != "ItemList":
                continue

            name = candidate.get("name", "")

            if "100 Best Vocalists of All Time" in name:
                return candidate

    raise RuntimeError("Consequence vocalist ItemList not found")


def extract_entries(item_list: dict) -> dict[int, str]:
    entries: dict[int, str] = {}

    for item in item_list.get("itemListElement", []):
        if not isinstance(item, dict):
            continue

        position = item.get("position")
        name = item.get("name")

        try:
            rank = int(position)
        except (TypeError, ValueError):
            continue

        if not isinstance(name, str) or not name.strip():
            continue

        if 1 <= rank <= 100:
            if rank in entries:
                raise RuntimeError(f"Duplicate rank found: {rank}")

            entries[rank] = name.strip()

    return entries


def main() -> None:
    raw = fetch(URL)
    item_list = find_item_list(raw)

    number_of_items = int(item_list.get("numberOfItems", 0))

    if number_of_items != 100:
        raise RuntimeError(
            f"Expected Consequence numberOfItems 100, got {number_of_items}"
        )

    entries = extract_entries(item_list)

    expected_ranks = set(range(1, 101))
    actual_ranks = set(entries)

    missing = sorted(expected_ranks - actual_ranks)
    unexpected = sorted(actual_ranks - expected_ranks)

    if missing or unexpected or len(entries) != 100:
        raise RuntimeError(
            "Consequence extraction failed validation: "
            f"entries={len(entries)}, "
            f"missing={missing}, "
            f"unexpected={unexpected}"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

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

            writer.writerow(
                {
                    "source_id": SOURCE_ID,
                    "source_rank": rank,
                    "source_entry_name": name,
                    "musician_name": name,
                }
            )

    print(f"Entries extracted: {len(entries)}")
    print(f"Rank range: {min(entries)}–{max(entries)}")
    print(f"Missing ranks: {missing}")
    print(f"Wrote: {OUTPUT_PATH}")
    print()
    print("Top 5:")
    for rank in range(1, 6):
        print(f"{rank}: {entries[rank]}")
    print()
    print("Bottom 5:")
    for rank in range(96, 101):
        print(f"{rank}: {entries[rank]}")


if __name__ == "__main__":
    main()
