#!/bin/sh
set -eu

action=${1:-install}
case "$action" in
    install|uninstall) ;;
    *) printf '%s\n' 'Usage: sh lyssna-lyrics.sh [install|uninstall]' >&2; exit 2 ;;
esac

if ! command -v spicetify >/dev/null 2>&1; then
    printf '%s\n' 'Install and set up Spicetify first: https://spicetify.app/docs/getting-started' >&2
    exit 1
fi

config_file=$(spicetify -c)
if [ ! -f "$config_file" ]; then
    printf '%s\n' 'Spicetify has no config file yet. Finish Spicetify setup before continuing.' >&2
    exit 1
fi
extension_directory="${config_file%/*}/Extensions"
launcher_name='lyssna-lyrics-legacy.mjs'
pixel_launcher_name='spicy-lyrics-pixel.mjs'
previous_launcher_name='lyssna-lyrics.mjs'
launcher_url="https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/builds/$launcher_name"
previous_launcher_path="$extension_directory/$previous_launcher_name"

# The rewrite also uses the old filename. Only migrate copies that point to Legacy.
legacy_entrypoint='https://(cdn\.jsdelivr\.net/gh/(iPixelGalaxy/(lyssna-lyrics|spicy-lyrics)|LyssnaHQ/lyssna-lyrics-legacy)@[^/]+/builds/(v2\.0|main)/entrypoint\.mjs|ipixelgalaxy\.com/(lyssna-plugin/)?entrypoint\.mjs)'
set -- "$pixel_launcher_name"
if [ -f "$previous_launcher_path" ] && grep -Eq "$legacy_entrypoint" "$previous_launcher_path"; then
    set -- "$@" "$previous_launcher_name"
fi

download_path=''
cleanup() {
    if [ -n "$download_path" ]; then
        rm -f "$download_path"
    fi
}
trap cleanup 0
trap 'exit 1' 1 2 15

if [ "$action" = install ]; then
    if ! command -v curl >/dev/null 2>&1; then
        printf '%s\n' 'curl is required to download Lyssna Lyrics.' >&2
        exit 1
    fi
    mkdir -p "$extension_directory"
    download_path=$(mktemp "$extension_directory/.lyssna-lyrics.XXXXXX")
    curl --fail --silent --show-error --location --connect-timeout 15 --max-time 60 "$launcher_url" -o "$download_path"
    chmod 644 "$download_path"
    mv -f "$download_path" "$extension_directory/$launcher_name"
    download_path=''

    spicetify config extensions "$launcher_name"
    for name in "$@"; do
        spicetify config extensions "$name-"
    done
    spicetify apply
    printf '%s\n' 'Lyssna Lyrics installed. Open lyrics with the microphone button in Spotify.'
else
    set -- "$launcher_name" "$@"
    for name in "$@"; do
        spicetify config extensions "$name-"
    done
    spicetify apply
    for name in "$@"; do
        rm -f "$extension_directory/$name"
    done
    printf '%s\n' 'Lyssna Lyrics uninstalled. Your saved lyric settings have been kept.'
fi
