#!/usr/bin/env python3
"""Check that every PHP file in the finished plugin ZIP is selected by PHPStan."""

from pathlib import Path
import sys
import tempfile
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
PREFIX = "ran-emailoctopus-jetpack-forms/"


def direct_paths(config):
    lines = config.read_text().splitlines()
    if any(line.lstrip().startswith(("includes:", "excludePaths:")) for line in lines):
        raise ValueError("Imported or excluded PHPStan paths need coverage review")
    if lines.count("    paths:") != 1:
        raise ValueError("Expected one direct PHPStan parameters.paths list")
    start = lines.index("    paths:") + 1
    paths = []
    for line in lines[start:]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith("        "):
            break
        if not line.startswith("        - ") or not line[10:].strip():
            raise ValueError("Unexpected PHPStan path syntax; review coverage parser")
        value = line[10:].strip()
        if any(char in value for char in "#*{}[]$'\"") or value.startswith(("/", "../")):
            raise ValueError("Unexpected PHPStan path; review coverage parser")
        paths.append(value.rstrip("/"))
    if not paths:
        raise ValueError("PHPStan has no direct analysis paths")
    return paths


def shipped_php(archive):
    with ZipFile(archive) as zipped:
        names = zipped.namelist()
    if any(name.endswith(".php") and not name.startswith(PREFIX) for name in names):
        raise ValueError("Plugin ZIP contains PHP outside its plugin directory")
    files = {name[len(PREFIX):] for name in names if name.startswith(PREFIX) and name.endswith(".php")}
    if not files or "ran-emailoctopus-jetpack-forms.php" not in files:
        raise ValueError("Plugin ZIP is missing its PHP entry point")
    return files


def uncovered(files, paths):
    return sorted(file for file in files if not any(
        file == path or file.startswith(path + "/") for path in paths
    ))


def main(archive):
    paths = direct_paths(ROOT / "phpstan.neon.dist")
    files = shipped_php(archive)
    missing = uncovered(files, paths)
    if missing:
        raise ValueError(f"Shipped PHP outside direct PHPStan paths: {', '.join(missing)}")

    # Prove that an additional root PHP file in a ZIP fails the actual comparison.
    with tempfile.TemporaryDirectory(prefix="emailoctopus-phpstan-coverage-") as directory:
        fixture = Path(directory) / "plugin.zip"
        with ZipFile(fixture, "w") as zipped:
            zipped.writestr(PREFIX + "ran-emailoctopus-jetpack-forms.php", "<?php\n")
            zipped.writestr(PREFIX + "new-entry.php", "<?php\n")
        if uncovered(shipped_php(fixture), paths) != ["new-entry.php"]:
            raise ValueError("Uncovered ZIP entry negative fixture did not fail")

    print(f"Direct PHPStan paths cover all {len(files)} shipped PHP files; negative fixture passed.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: phpstan-archive-coverage.py <plugin.zip>")
    try:
        main(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
