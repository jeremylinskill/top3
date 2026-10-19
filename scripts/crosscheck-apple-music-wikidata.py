#!/usr/bin/env python3

import argparse
import csv
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/musician-catalogue"
ENDPOINT = "https://query.wikidata.org/sparql"
CONTROL_ID = "32940"  # Michael Jackson


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def query_wikidata(artist_ids):
    values = " ".join(
        f'"{artist_id}"'
        for artist_id in [CONTROL_ID, *artist_ids]
    )

    sparql = f"""
    SELECT ?artistId ?item ?itemLabel WHERE {{
      VALUES ?artistId {{ {values} }}
      ?item wdt:P2850 ?artistId.
      OPTIONAL {{
        ?item rdfs:label ?itemLabel.
        FILTER(LANG(?itemLabel) = "en")
      }}
    }}
    """

    url = ENDPOINT + "?" + urllib.parse.urlencode({
        "query": sparql,
        "format": "json",
    })

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Top3App/0.1 musician-catalogue-audit",
            "Accept": "application/sparql-results+json",
        },
    )

    for attempt in range(4):
        try:
            with urllib.request.urlopen(
                request, timeout=90
            ) as response:
                return json.load(response)

        except urllib.error.HTTPError as error:
            if error.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt == 3:
                raise

            retry_after = error.headers.get("Retry-After")
            try:
                wait = max(2, min(60, int(retry_after)))
            except (TypeError, ValueError):
                wait = 5 * (attempt + 1)

            print(f"HTTP {error.code}; retrying in {wait}s")
            time.sleep(wait)

        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))

    raise RuntimeError("Wikidata query failed")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    if args.start < 0 or not 1 <= args.limit <= 25:
        parser.error("Start must be >= 0; limit must be 1–25")

    master = read_csv(DATA / "apple-music-master-audit.csv")
    reviewed = {
        row["musician_id"]
        for row in read_csv(
            DATA / "apple-music-reviewed-identities.csv"
        )
    }

    pending = [
        row for row in master
        if row["discovery_status"] == "single_candidate"
        and row["musician_id"] not in reviewed
    ]

    if len(pending) != 347:
        raise SystemExit(
            f"Expected 347 pending candidates; found {len(pending)}."
        )

    selected = pending[
        args.start:args.start + args.limit
    ]

    if not selected:
        raise SystemExit("No candidates in requested range.")

    output = DATA / (
        f"apple-music-wikidata-crosscheck-"
        f"{args.start}-{args.limit}.csv"
    )

    if output.exists():
        raise SystemExit(f"Existing report preserved: {output}")

    ids = [
        row["candidate_apple_music_id"]
        for row in selected
    ]

    if not all(artist_id.isdigit() for artist_id in ids):
        raise SystemExit("Unexpected Apple Music artist ID.")

    print(
        f"Checking candidates "
        f"{args.start + 1}–{args.start + len(selected)}"
    )

    payload = query_wikidata(ids)
    matches = defaultdict(list)

    for result in payload["results"]["bindings"]:
        artist_id = result["artistId"]["value"]
        matches[artist_id].append({
            "qid": result["item"]["value"].split("/")[-1],
            "label": result.get(
                "itemLabel", {}
            ).get("value", ""),
        })

    if not any(
        entry["qid"] == "Q2831"
        for entry in matches.get(CONTROL_ID, [])
    ):
        raise SystemExit(
            "Wikidata control failed. No report written."
        )

    output_rows = []

    for row in selected:
        artist_id = row["candidate_apple_music_id"]
        found = matches.get(artist_id, [])

        if len(found) == 0:
            status = "no_wikidata_id_match"
        elif len(found) == 1:
            status = "single_wikidata_id_match"
        else:
            status = "multiple_wikidata_id_matches"

        output_rows.append({
            "musician_id": row["musician_id"],
            "musician_name": row["musician_name"],
            "apple_music_artist_id": artist_id,
            "wikidata_status": status,
            "wikidata_qids": " | ".join(
                item["qid"] for item in found
            ),
            "wikidata_labels": " | ".join(
                item["label"] for item in found
            ),
            "identity_review": "pending",
        })

    with output.open(
        "x", newline="", encoding="utf-8"
    ) as handle:
        writer = csv.DictWriter(
            handle, fieldnames=list(output_rows[0])
        )
        writer.writeheader()
        writer.writerows(output_rows)

    counts = Counter(
        row["wikidata_status"]
        for row in output_rows
    )

    print(f"\nWrote: {output}")
    print("Candidates checked:", len(output_rows))

    for status, count in sorted(counts.items()):
        print(f"{status}: {count}")

    print("\n===== WIKIDATA MATCHES =====")
    for row in output_rows:
        if row["wikidata_qids"]:
            print(
                f"{row['musician_name']} | "
                f"{row['wikidata_qids']} | "
                f"{row['wikidata_labels']}"
            )

    print("\nAll identities remain pending verification.")
    print("No database changes.")


if __name__ == "__main__":
    main()
