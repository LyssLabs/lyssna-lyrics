<div align="center">

<img src="assets/lyssna-lyrics-banner.svg" alt="Lyssna Lyrics. Keep the lyrics close. Synchronized lyrics for Spotify through Spicetify." width="100%" />

<p>
  <a href="https://discord.gg/qfYAsFQawp"><img src="https://img.shields.io/badge/Join_our_Discord-5865F2?style=for-the-badge&amp;logo=discord&amp;logoColor=white" alt="Join the Lyssna Discord" /></a>
  <a href="#install"><img src="https://img.shields.io/badge/Install_Lyssna_Lyrics-1ed760?style=for-the-badge&amp;labelColor=151917&amp;color=1ed760" alt="Install Lyssna Lyrics" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/AGPL--3.0-303d34?style=for-the-badge" alt="AGPL version 3 license" /></a>
</p>

**Rewrite planned.**

**[Discord & support](https://discord.gg/qfYAsFQawp) · [Launcher file](https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/builds/lyssna-lyrics-legacy.mjs) · [Releases](https://github.com/LyssnaHQ/lyssna-lyrics-legacy/releases) · [Lyssna Standalone](https://lyssna.org/lyssna_setup.exe)**

</div>

Lyssna Lyrics puts synchronized lyrics inside Spotify, with a microphone button to open them, a toolbar that follows your layout, and settings you can make your own.

This is iPixelGalaxy's fork of [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics), bringing the look of [Lyssna](https://github.com/Stormanzanii/Lyssna) to Spicetify. If you knew this repo as Pixel Edition, you're in the right place.

## In the lyrics view

| | What you can do |
| :-- | :-- |
| **Follow the song** | Word and line timing, duet alignment, romanization, and a button to return to the active line. Timing depends on the lyrics available for each track. |
| **Pick a view** | Keep lyrics on the page, go fullscreen or Cinema, open a popout, or use the Now Playing sidebar. |
| **Make it yours** | Change the font and lyric size, choose the Lyssna or Apple Music visual style, try Space Gravity, and adjust backgrounds and animation limits. Dialogs are solid by default, with optional Liquid Glass. |
| **Work with TTML** | Load lyrics temporarily, for the session, or persistently. Browse your local TTML database and apply a reviewer profile while checking a file. |
| **Choose your sources** | Reorder and enable lyric sources, choose the toolbar's cache action, and keep provider and contributor credits beside the lyrics. |

Open the gear in the lyrics toolbar for **Appearance, Lyrics, Layout, Enhancements, Sources, Advanced, and Credits**. The toolbar moves into a vertical strip when the lyrics pane gets narrow.

## Install

Start with **Spotify's desktop app and a working [Spicetify installation](https://spicetify.app/docs/getting-started)**. The commands below install the extension and apply Spicetify; Spotify may restart.

### Windows · PowerShell

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/scripts/lyssna-lyrics.ps1'))) -Action install
```

### macOS / Linux · Terminal

```sh
sh -c 'lyssna_script=$(curl -fsSL https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/scripts/lyssna-lyrics.sh) && sh -c "$lyssna_script" -- install'
```

The installer downloads and enables `lyssna-lyrics-legacy.mjs`. It disables earlier Legacy launchers it recognizes. Spicy Lyrics can stay installed and enabled alongside Lyssna, with a separate button and settings panel for each.

You can read the [launcher source](builds/lyssna-lyrics-legacy.mjs), [PowerShell script](scripts/lyssna-lyrics.ps1), or [shell script](scripts/lyssna-lyrics.sh) here. The launcher loads this repository's main entrypoint through jsDelivr. Run the install command again to update an existing Legacy installation.

<details>
<summary><strong>Install manually</strong></summary>

1. Use **Save link as** on [lyssna-lyrics-legacy.mjs](https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/builds/lyssna-lyrics-legacy.mjs) and keep that exact filename.
2. Run `spicetify config-dir` and place the file in its **Extensions** folder.
3. Enable Lyssna and replace the old Pixel entry:

   ```sh
   spicetify config extensions lyssna-lyrics-legacy.mjs
   spicetify config extensions spicy-lyrics-pixel.mjs-
   spicetify apply
   ```

After Spotify reloads, open lyrics with the microphone button. [Spicetify's extension guide](https://spicetify.app/docs/customization/extensions) covers its manual installation process.

</details>

## Uninstall

### Windows · PowerShell

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/scripts/lyssna-lyrics.ps1'))) -Action uninstall
```

### macOS / Linux · Terminal

```sh
sh -c 'lyssna_script=$(curl -fsSL https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/scripts/lyssna-lyrics.sh) && sh -c "$lyssna_script" -- uninstall'
```

This disables recognized Legacy launchers, reapplies Spicetify, and removes their files. **Your saved lyric preferences are kept**, including settings shared with Spicy Lyrics.

## Switching from Pixel Edition or Spicy Lyrics

The new installer handles the old Pixel extension entry. Lyssna and Spicy Lyrics can run together. Their pages, controls, local TTML collections, branch selections, and update history stay separate. Existing local TTML files are copied into Lyssna's collection on first use.

Compatible preferences remain shared by default. Enable **Don't sync settings to Spicy Lyrics counterparts** under **Advanced** to keep your Lyssna setup independent. Turning it off resumes sharing compatible preferences.

In **Settings → Advanced → Build Channel**, **Lyssna** is the default. **Spicy Lyrics** loads the official plugin when it isn't already enabled separately. You can also manage custom branches or pin a version. The entrypoint and the in-plugin picker use the same Lyssna channel selection.

The Lyssna channel follows the latest published GitHub release automatically when Spotify starts. Custom branches and pinned versions keep their selected source. Integrated builds include Spotify+ enhancements and let the updated standalone Spotify+ stay installed without loading duplicate menus or handlers.

Lyssna's release series begins at **0.1.0**. Historical **100.10.x** Pixel Edition versions come before the new series in update checks and patch notes.

The Lyssna launcher runs the official Spicy Lyrics plugin in a hidden frame. **Spicy Lyrics** reads lyrics and credits from that plugin's track cache and saved TTML library. Other sources include lrc.red, Musixmatch, Spotify, LRCLIB, and NetEase. Manage source order in **Settings → Sources**.

## Transfer settings between Lyssna apps

Open **Settings → Advanced → Import and export settings** in either Lyssna Lyrics or Lyssna Standalone. Choose **Export settings**, then open the resulting `.lyssna.json` file with **Import settings** in the other app. Review the settings and lyric counts, then choose **Apply import**.

Exports include preferences, animator presets, per-song timing offsets, and the local lyrics database with its track associations. Compatible settings apply immediately. App-specific settings are kept in subsequent exports so they can be restored when moving back. Matching local lyrics are replaced; other saved songs remain. Each import saves a backup, available through **Download previous backup**.

TTML and LRC files transfer in both directions. Older JSON lyric entries remain in the transfer file for restoring in standalone. Build-channel selection and Spotify sign-in sessions stay local. Standalone window and editor preferences take effect when reopened. Custom font files must also be available on the destination. Exported plugin preferences can contain saved provider tokens, so keep transfer files private.

## Want a break from the lag?

**[Download Lyssna Standalone for Windows](https://lyssna.org/lyssna_setup.exe)**, or visit [Arashii's Lyssna project](https://github.com/Stormanzanii/Lyssna).

If you're staying in Spotify, try **Limit Animation Frame Rate** in Appearance and turn off effects you don't use.

## Bugs, ideas, and updates

**[Join the Lyssna Discord](https://discord.gg/qfYAsFQawp)** for fork updates and support.

For a bug report, open **Settings → Report a bug** and copy the diagnostics. Post them in **#extension-bugs**, along with what happened, how to reproduce it, and a screenshot when it helps. The report includes the versions, lyric source, and settings that help us investigate.

Please include the song and the affected view when reporting a lyrics problem.

Release notes and full versioned plugin downloads are available on **[GitHub Releases](https://github.com/LyssnaHQ/lyssna-lyrics-legacy/releases)**. The launcher remains available for following your selected update branch.

## Credits

- **[Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics)** by Spikerko and its contributors, for the plugin and lyric renderer this fork is built on.
- **[Lyssna](https://github.com/Stormanzanii/Lyssna) · Arashii**, for the name, microphone icon, settings and toolbar designs.
- **[iPixelGalaxy](https://github.com/iPixelGalaxy)**, for maintaining this fork.

## License and history

See [LICENSE](LICENSE) for the GNU Affero General Public License, version 3, and [the icon license](src/assets/LUCIDE_LICENSE.txt) for the microphone artwork.

[GitHub Releases](https://github.com/LyssnaHQ/lyssna-lyrics-legacy/releases) · [DevTools help](docs/devtools.md) · [Integration notes](docs/integration.md) · **[Archived README](docs/archive/README.md)**
