import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path("data/musician-catalogue")

MUSICIANS_PATH = ROOT / "musicians.csv"
ROLES_PATH = ROOT / "musician_roles.csv"
IDENTITY_OVERRIDES_PATH = (
    ROOT
    / "musician-identity-overrides.json"
)


def normalize(value):
    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )

    value = value.casefold()
    value = value.replace(".", "")

    value = re.sub(
        r"[^a-z0-9]+",
        "-",
        value,
    )

    return value.strip("-")


def sort_name(name):
    return name


def read_csv(path):
    if not path.exists() or path.stat().st_size == 0:
        return []

    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python3 scripts/"
            "apply-role-catalogue.py <role>"
        )

    role = sys.argv[1].strip()

    source_path = (
        ROOT
        / f"{role}-catalogue-final.csv"
    )

    if not source_path.exists():
        raise RuntimeError(
            f"Missing final catalogue: {source_path}"
        )

    with source_path.open(newline="") as handle:
        final_rows = list(csv.DictReader(handle))

    musicians = read_csv(
        MUSICIANS_PATH
    )

    roles = read_csv(
        ROLES_PATH
    )

    if IDENTITY_OVERRIDES_PATH.exists():
        identity_overrides = json.loads(
            IDENTITY_OVERRIDES_PATH.read_text(
                encoding="utf-8"
            )
        )
    else:
        identity_overrides = {}

    musicians_by_id = {
        row["id"]: row
        for row in musicians
        if row.get("id")
    }

    roles_by_key = {
        (
            row.get("musician_id", ""),
            row.get("role", ""),
        ): row
        for row in roles
    }

    added_musicians = 0
    added_roles = 0
    updated_roles = 0

    for row in final_rows:
        name = row["musician_name"].strip()

        normalized_name = (
            row.get("normalized_name", "")
            or ""
        ).strip()

        identity_override = (
            identity_overrides.get(
                normalized_name
            )
        )

        if identity_override:
            musician_id = (
                identity_override[
                    "musician_id"
                ].strip()
            )
        else:
            musician_id = (
                "musician-"
                + normalize(name)
            )

        if musician_id not in musicians_by_id:
            musician = {
                "id": musician_id,
                "name": name,
                "sort_name": sort_name(name),
                "musicbrainz_id": "",
                "wikidata_id": "",
                "apple_music_artist_id": "",
                "image_status": "pending",
                "active": "true",
                "notes": "",
            }

            musicians.append(musician)

            musicians_by_id[
                musician_id
            ] = musician

            added_musicians += 1

        role_key = (
            musician_id,
            role,
        )

        role_data = {
            "musician_id":
                musician_id,
            "role":
                role,
            "rank":
                row["final_rank"],
            "confidence":
                (
                    "high"
                    if int(row["source_count"]) >= 2
                    else "editorial"
                ),
            "source":
                row["sources"],
            "source_reference":
                row["selection_basis"],
            "approved":
                "true",
            "notes":
                "",
        }

        existing_role = roles_by_key.get(
            role_key
        )

        if existing_role is not None:
            existing_role.update(
                role_data
            )

            updated_roles += 1
            continue

        roles.append(
            role_data
        )

        roles_by_key[
            role_key
        ] = role_data

        added_roles += 1

    with MUSICIANS_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "name",
                "sort_name",
                "musicbrainz_id",
                "wikidata_id",
                "apple_music_artist_id",
                "image_status",
                "active",
                "notes",
            ],
        )

        writer.writeheader()
        writer.writerows(musicians)

    with ROLES_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "musician_id",
                "role",
                "rank",
                "confidence",
                "source",
                "source_reference",
                "approved",
                "notes",
            ],
        )

        writer.writeheader()
        writer.writerows(roles)

    print(
        f"Role applied: {role}"
    )
    print(
        f"Final role entries: {len(final_rows)}"
    )
    print(
        f"New musicians added: {added_musicians}"
    )
    print(
        f"New role assignments added: {added_roles}"
    )
    print(
        f"Existing role assignments updated: {updated_roles}"
    )
    print(
        f"Total musicians: {len(musicians)}"
    )
    print(
        f"Total role assignments: {len(roles)}"
    )


if __name__ == "__main__":
    main()
