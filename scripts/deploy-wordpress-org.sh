#!/usr/bin/env bash

set -euo pipefail

export LC_ALL=C
export TZ=UTC

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${PLUGIN_ROOT}/wordpress-org/deployment.json"
ARCHIVE_PATH="${1:?Usage: deploy-wordpress-org.sh <archive> <checksum> <vX.Y.Z> [--sync-assets]}"
CHECKSUM_PATH="${2:?A SHA-256 file is required.}"
TAG_NAME="${3:?An immutable vX.Y.Z GitHub release tag is required.}"
shift 3

SYNC_ASSETS=false
for argument in "$@"; do
	case "${argument}" in
		--sync-assets) SYNC_ASSETS=true ;;
		*) echo "Unknown deployment option: ${argument}" >&2; exit 1 ;;
	esac
done

if ! jq -e '(.enabled | type == "boolean") and (.syncListingAssets | type == "boolean")' "${CONFIG_PATH}" >/dev/null; then
	echo "Invalid committed WordPress.org deployment contract: ${CONFIG_PATH}." >&2
	exit 1
fi
ENABLED="$(jq -r '.enabled' "${CONFIG_PATH}")"
if [[ "${ENABLED}" != true ]]; then
	echo "Routine WordPress.org deployment is disabled in ${CONFIG_PATH}." >&2
	exit 1
fi
if [[ "${SYNC_ASSETS}" == true && "$(jq -r '.syncListingAssets' "${CONFIG_PATH}")" != true ]]; then
	echo 'Listing asset synchronization is not enabled by the committed deployment contract.' >&2
	exit 1
fi

if [[ ! "${TAG_NAME}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
	echo 'An immutable semantic vX.Y.Z GitHub release tag is required.' >&2
	exit 1
fi
VERSION="${TAG_NAME#v}"

WORDPRESS_ORG_SLUG="$(jq -er '.wordpressOrgSlug | select(length > 0)' "${CONFIG_PATH}")"
PACKAGE_SLUG="$(jq -er '.packageSlug' "${CONFIG_PATH}")"
MAIN_PLUGIN_FILE="$(jq -er '.mainPluginFile' "${CONFIG_PATH}")"
ASSETS_DIRECTORY="$(jq -er '.listingAssetsDirectory' "${CONFIG_PATH}")"
test "$(git -C "${PLUGIN_ROOT}" rev-parse "${TAG_NAME}^{commit}")" = "$(git -C "${PLUGIN_ROOT}" rev-parse HEAD)"
PLUGIN_VERSION="$(sed -n 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*\([^[:space:]]*\).*$/\1/p' "${PLUGIN_ROOT}/${MAIN_PLUGIN_FILE}")"
test "${PLUGIN_VERSION}" = "${VERSION}"
test "$(basename "${ARCHIVE_PATH}")" = "${PACKAGE_SLUG}-${VERSION}.zip"
test "$(basename "${CHECKSUM_PATH}")" = "$(basename "${ARCHIVE_PATH}").sha256"
ARCHIVE_SHA256="$(sha256sum "${ARCHIVE_PATH}" | awk '{ print $1 }')"
test "$(< "${CHECKSUM_PATH}")" = "$(printf '%s  %s' "${ARCHIVE_SHA256}" "$(basename "${ARCHIVE_PATH}")")"
unzip -tqq "${ARCHIVE_PATH}"
archive_entries="$(unzip -Z1 "${ARCHIVE_PATH}")"
test -n "${archive_entries}"
while IFS= read -r entry; do
	case "${entry}" in
		"${PACKAGE_SLUG}/"*) ;;
		*) echo "Unexpected release archive entry: ${entry}" >&2; exit 1 ;;
	esac
	if [[ "${entry}" == *"../"* || "${entry}" == *"/./"* || "${entry}" == *"\\"* ]]; then
		echo "Unsafe release archive entry: ${entry}" >&2
		exit 1
	fi
done <<< "${archive_entries}"
ZIP_PLUGIN_VERSION="$(unzip -p "${ARCHIVE_PATH}" "${PACKAGE_SLUG}/${MAIN_PLUGIN_FILE}" | sed -n 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*\([^[:space:]]*\).*$/\1/p')"
test "${ZIP_PLUGIN_VERSION}" = "${VERSION}"

WORK_DIRECTORY="$(mktemp -d)"
cleanup() {
	rm -rf "${WORK_DIRECTORY}"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

unzip -q "${ARCHIVE_PATH}" -d "${WORK_DIRECTORY}/release"
if [[ ! -f "${WORK_DIRECTORY}/release/${PACKAGE_SLUG}/${MAIN_PLUGIN_FILE}" ]]; then
	echo "The verified archive does not contain the configured main plugin file." >&2
	exit 1
fi

: "${WORDPRESS_ORG_USERNAME:?WORDPRESS_ORG_USERNAME is required.}"
: "${WORDPRESS_ORG_PASSWORD:?WORDPRESS_ORG_PASSWORD is required.}"

SVN_URL="https://plugins.svn.wordpress.org/${WORDPRESS_ORG_SLUG}"
SVN_AUTH=(--non-interactive --no-auth-cache --username "${WORDPRESS_ORG_USERNAME}" --password "${WORDPRESS_ORG_PASSWORD}")
svn checkout "${SVN_URL}" "${WORK_DIRECTORY}/svn" "${SVN_AUTH[@]}"

rsync -a --delete --exclude='.svn' "${WORK_DIRECTORY}/release/${PACKAGE_SLUG}/" "${WORK_DIRECTORY}/svn/trunk/"
while IFS= read -r missing_path; do
	[[ -n "${missing_path}" ]] || continue
	svn rm --force "${missing_path}"
done < <(svn status "${WORK_DIRECTORY}/svn/trunk" | sed -n 's/^!.......//p')
svn add --force "${WORK_DIRECTORY}/svn/trunk" --parents

if [[ "${SYNC_ASSETS}" == true ]]; then
	rsync -a --delete --exclude='README.md' --exclude='drafts/' --exclude='.svn' \
		"${PLUGIN_ROOT}/${ASSETS_DIRECTORY}/" "${WORK_DIRECTORY}/svn/assets/"
	svn add --force "${WORK_DIRECTORY}/svn/assets" --parents
fi

if svn ls "${SVN_URL}/tags/${VERSION}" "${SVN_AUTH[@]}" >/dev/null 2>&1; then
	echo "WordPress.org tag ${VERSION} already exists; refusing to replace it." >&2
	exit 1
fi

svn status "${WORK_DIRECTORY}/svn"
svn commit "${WORK_DIRECTORY}/svn" -m "Release ${VERSION}" "${SVN_AUTH[@]}"
svn copy "${SVN_URL}/trunk" "${SVN_URL}/tags/${VERSION}" -m "Tag ${VERSION}" "${SVN_AUTH[@]}"
