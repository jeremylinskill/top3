#!/usr/bin/env python3

from __future__ import annotations

import csv
import re
import unicodedata
from pathlib import Path

ROOT = Path("data/musician-catalogue")

MIGRATION = Path(
    "supabase/migrations/"
    "20261006224810_seed_musician_catalogue.sql"
)

MUSICIANS_PATH = ROOT / "musicians.csv"
ROLES_PATH = ROOT / "musician_roles.csv"
ALIASES_PATH = ROOT / "musician-aliases.csv"


def normalize(value: str) -> str:
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
    value = value.replace(".", "")

    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )

    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def sql_text(
    value: str | None,
) -> str:
    if value is None:
        return "null"

    value = value.strip()

    if not value:
        return "null"

    escaped = value.replace(
        "'",
        "''",
    )

    return f"'{escaped}'"


def sql_required_text(
    value: str,
) -> str:
    escaped = value.strip().replace(
        "'",
        "''",
    )

    return f"'{escaped}'"


def sql_bool(
    value: str,
) -> str:
    return (
        "true"
        if value.strip().lower()
        == "true"
        else "false"
    )


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    with path.open(
        newline="",
        encoding="utf-8",
    ) as f:
        return list(
            csv.DictReader(f)
        )


musicians = read_csv(
    MUSICIANS_PATH
)

roles = read_csv(
    ROLES_PATH
)

aliases = read_csv(
    ALIASES_PATH
)

lines: list[str] = []

lines.extend([
    "-- Generated from:",
    "--   data/musician-catalogue/musicians.csv",
    "--   data/musician-catalogue/musician_roles.csv",
    "--   data/musician-catalogue/musician-aliases.csv",
    "--",
    f"-- Musicians: {len(musicians)}",
    f"-- Role assignments: {len(roles)}",
    f"-- Aliases: {len(aliases)}",
    "",
])


lines.extend([
    "insert into public.musicians (",
    "  id,",
    "  name,",
    "  normalized_name,",
    "  sort_name,",
    "  musicbrainz_id,",
    "  wikidata_id,",
    "  apple_music_artist_id,",
    "  image_status,",
    "  active,",
    "  notes",
    ")",
    "values",
])

musician_values = []

for row in musicians:
    musician_values.append(
        "  ("
        + ", ".join([
            sql_required_text(
                row["id"]
            ),
            sql_required_text(
                row["name"]
            ),
            sql_required_text(
                normalize(
                    row["name"]
                )
            ),
            sql_required_text(
                row["sort_name"]
            ),
            sql_text(
                row["musicbrainz_id"]
            ),
            sql_text(
                row["wikidata_id"]
            ),
            sql_text(
                row[
                    "apple_music_artist_id"
                ]
            ),
            sql_required_text(
                row["image_status"]
            ),
            sql_bool(
                row["active"]
            ),
            sql_text(
                row["notes"]
            ),
        ])
        + ")"
    )

lines.append(
    ",\n".join(
        musician_values
    )
    + ";"
)

lines.append("")


lines.extend([
    "insert into public.musician_roles (",
    "  musician_id,",
    "  role,",
    "  rank,",
    "  confidence,",
    "  source,",
    "  source_reference,",
    "  approved,",
    "  notes",
    ")",
    "values",
])

role_values = []

for row in roles:
    role_values.append(
        "  ("
        + ", ".join([
            sql_required_text(
                row["musician_id"]
            ),
            sql_required_text(
                row["role"]
            ),
            str(
                int(
                    row["rank"]
                )
            ),
            sql_required_text(
                row["confidence"]
            ),
            sql_text(
                row["source"]
            ),
            sql_text(
                row[
                    "source_reference"
                ]
            ),
            sql_bool(
                row["approved"]
            ),
            sql_text(
                row["notes"]
            ),
        ])
        + ")"
    )

lines.append(
    ",\n".join(
        role_values
    )
    + ";"
)

lines.append("")


lines.extend([
    "insert into public.musician_aliases (",
    "  musician_id,",
    "  alias,",
    "  normalized_alias,",
    "  alias_type,",
    "  active,",
    "  notes",
    ")",
    "values",
])

alias_values = []

for row in aliases:
    alias_values.append(
        "  ("
        + ", ".join([
            sql_required_text(
                row["musician_id"]
            ),
            sql_required_text(
                row["alias"]
            ),
            sql_required_text(
                row["normalized_alias"]
            ),
            sql_required_text(
                row["alias_type"]
            ),
            sql_bool(
                row["active"]
            ),
            sql_text(
                row["notes"]
            ),
        ])
        + ")"
    )

lines.append(
    ",\n".join(
        alias_values
    )
    + ";"
)

lines.append("")

MIGRATION.write_text(
    "\n".join(lines),
    encoding="utf-8",
)

print(
    "Wrote:",
    MIGRATION,
)
print(
    "Musicians:",
    len(musicians),
)
print(
    "Role assignments:",
    len(roles),
)
print(
    "Aliases:",
    len(aliases),
)
