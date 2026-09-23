#!/usr/bin/env bash

set -euo pipefail

file_list="$(mktemp)"
cleanup() {
	rm -f "$file_list"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

if ! find . \
	-path './build' -prune -o \
	-path './dist' -prune -o \
	-path './node_modules' -prune -o \
	-path './vendor' -prune -o \
	-path './.git' -prune -o \
	-type f -name '*.php' -print0 > "$file_list"; then
	echo 'Unable to discover PHP files for syntax linting.' >&2
	exit 1
fi

while IFS= read -r -d '' file; do
	php -l "$file"
done < "$file_list"
