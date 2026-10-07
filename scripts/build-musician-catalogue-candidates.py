import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")
ROLES_PATH = ROOT / "roles.json"
CANDIDATES_PATH = ROOT / "candidates.csv"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"
WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
PAGE_SIZE = 250


def fetch_role_candidates(role):
    occupation_id = role["wikidata_occupation_id"]
    min_sitelinks = role["min_sitelinks"]

    results_by_id = {}
    max_rows_per_query = 500
    max_sitelinks = 1000

    def fetch_bucket(
        bucket_min,
        bucket_max,
    ):
        query = f"""
SELECT DISTINCT
  ?person
  ?personLabel
  ?sitelinks
WHERE {{
  ?person wdt:P31 wd:Q5;
          wdt:P106 wd:{occupation_id};
          wikibase:sitelinks ?sitelinks;
          rdfs:label ?personLabel.

  FILTER(
    LANG(?personLabel) = "en" &&
    ?sitelinks >= {bucket_min} &&
    ?sitelinks < {bucket_max}
  )
}}
LIMIT {max_rows_per_query}
"""

        url = (
            WIKIDATA_ENDPOINT
            + "?"
            + urllib.parse.urlencode({"query": query})
        )

        request = urllib.request.Request(
            url,
            headers={
                "Accept": "text/csv",
                "User-Agent": USER_AGENT,
            },
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=120,
            ) as response:
                content = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            if (
                error.code in {429, 500, 502, 503, 504}
                and bucket_max - bucket_min > 1
            ):
                midpoint = (
                    bucket_min
                    + bucket_max
                ) // 2

                print(
                    f"  {bucket_min}-{bucket_max - 1}: "
                    f"HTTP {error.code}; splitting bucket"
                )

                time.sleep(1.0)

                fetch_bucket(
                    bucket_min,
                    midpoint,
                )
                time.sleep(1.0)
                fetch_bucket(
                    midpoint,
                    bucket_max,
                )
                return

            raise

        rows = list(
            csv.DictReader(
                content.splitlines()
            )
        )

        if (
            len(rows) >= max_rows_per_query
            and bucket_max - bucket_min > 1
        ):
            midpoint = (
                bucket_min
                + bucket_max
            ) // 2

            fetch_bucket(
                bucket_min,
                midpoint,
            )
            time.sleep(0.5)
            fetch_bucket(
                midpoint,
                bucket_max,
            )
            return

        if (
            len(rows) >= max_rows_per_query
            and bucket_max - bucket_min <= 1
        ):
            raise RuntimeError(
                f'Bucket {bucket_min}-{bucket_max} '
                f'for {role["label"]} reached '
                f'{max_rows_per_query} rows.'
            )

        for row in rows:
            person_url = row.get(
                "person",
                "",
            ).strip()

            wikidata_id = (
                person_url.rsplit("/", 1)[-1]
                if person_url
                else ""
            )

            name = row.get(
                "personLabel",
                "",
            ).strip()

            if (
                not wikidata_id
                or not name
                or name == wikidata_id
            ):
                continue

            results_by_id[wikidata_id] = {
                "role": role["id"],
                "wikidata_id": wikidata_id,
                "name": name,
                "musicbrainz_id": "",
                "apple_music_artist_id": "",
                "sitelinks": int(
                    row.get(
                        "sitelinks",
                        "0",
                    ) or 0
                ),
            }

        print(
            f"  {bucket_min}-{bucket_max - 1}: "
            f"{len(rows)} rows "
            f"({len(results_by_id)} unique total)"
        )

    fetch_bucket(
        min_sitelinks,
        max_sitelinks,
    )

    return sorted(
        results_by_id.values(),
        key=lambda row: (
            -row["sitelinks"],
            row["name"].casefold(),
        ),
    )


def main():
    roles = json.loads(
        ROLES_PATH.read_text()
    )

    if len(sys.argv) != 2:
        available_roles = ", ".join(
            role["id"]
            for role in roles
        )
        raise SystemExit(
            "Usage: python3 "
            "scripts/build-musician-catalogue-candidates.py "
            f"<role>\nAvailable roles: {available_roles}"
        )

    requested_role_id = (
        sys.argv[1]
        .strip()
        .lower()
    )

    role = next(
        (
            candidate_role
            for candidate_role in roles
            if candidate_role["id"]
            == requested_role_id
        ),
        None,
    )

    if role is None:
        available_roles = ", ".join(
            candidate_role["id"]
            for candidate_role in roles
        )
        raise SystemExit(
            f"Unknown role: {requested_role_id}\n"
            f"Available roles: {available_roles}"
        )

    print(
        f'Fetching {role["label"]}...'
    )

    rows = fetch_role_candidates(role)

    print(
        f'  {len(rows)} candidates'
    )

    candidates_path = (
        ROOT
        / f'candidates-{requested_role_id}.csv'
    )

    with candidates_path.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "role",
                "wikidata_id",
                "name",
                "musicbrainz_id",
                "apple_music_artist_id",
                "sitelinks",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(
        f"\nWrote {len(rows)} candidate records "
        f"to {candidates_path}"
    )


if __name__ == "__main__":
    main()
