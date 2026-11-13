<p align="center">
  <img src="docs/logo.png" alt="OX" width="360">
</p>

# BuSpot_1.0V

_Custom Theme, Dock & Wallpaper for SPOT UPI_

**Created by OBUSXERA**

**BuSpot** is a browser extension (Manifest V3) designed to enhance the appearance of **SPOT UPI** (`spot.upi.edu`): the sidebar menu becomes a macOS-style Dock, you can set your own cropped photos as the wallpaper, and there are several themes available.

> **Disclaimer:** this project is **not an official product** of the Indonesia University of Education (UPI) and is not affiliated with UPI. The extension only alters **the appearance within your own browser**. It does not alter academic data, does not send data to any servers, and does not read passwords.

[Preview](docs/preview.png)

## Features

- **macOS-style Dock** — the menu moves to the bottom of the screen, icons enlarge when hovered over, and the left-hand sidebar is hidden. The 🗂️ *Classic View* button restores the original layout.
- **Custom wallpaper + crop** — upload a photo (including 4K), set the area to use: full screen, 16:9, 4:3, 1:1, or freeform. Saved in IndexedDB.
- **Five themes** — Light, Dark, Warm, Classic, Cyberpunk (red-blue neon). Selection is automatically saved.
- **Customisable lists** — The ‘Course List’ is hidden and appears as a panel from the Dock.
- **Account menu (SB)** — semester history, language change, and logout in a single menu.
- **Clean header** — only the UPI SPOT logo in the centre.
- Small **BuSpot wordmark** in the bottom right (DotGothic16 font, with the UPI logo forming the letter ‘o’).
- Redesigned course details page: the banner, panel and “Access Time” chip adapt to the active theme.

## Installation (Chrome / Brave / Edge)

1. Download this repository (**Code → Download ZIP**) then extract it, or use `git clone`.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** then select this project folder.
5. Open `https://spot.upi.edu/` and refresh.

After modifying the files, click the **reload** button on the extension tab, then refresh SPOT.

## File structure

| File | Function |
|---|---|
| `manifest.json` | Extension configuration; active only on `spot.upi.edu` |
| `content.js` | Logic: wallpaper, crop, themes, Dock, account menu, OBUSXERA text |
| `icons.js` | Dock icons (96 px PNG, embedded as data URIs) |
| `style.css` | Theme and component styles |
| `dock.css` | Dock styles, account menu, clean header, list panel |
| `crop.css` | Wallpaper cropping window styles |
| `icons/` | Extension icons (16, 48, 128 px) |
| `docs/` | Logos and screenshots for the README |

## Quick customisation

- **BuSpot wordmark size:** `width: 104px` on `#spot-brand img` in `dock.css`.
- **Wordmark position:** `right` and `bottom` on `#spot-brand` in `dock.css`.
- **Crop size limit:** `CROP_MAX_SIDE = 3840` in `content.js`.
- **Dock colour:** `--dock-*` variables in `dock.css`.

## Privacy

All settings (themes, wallpapers) are stored **locally** in the browser (`localStorage` and IndexedDB). This extension makes no network requests. To delete a wallpaper, click the bin icon in the Dock.

## Notes

- SPOT may change its HTML structure at any time. If any part does not match, check the selectors in `content.js` / `dock.css` or open an *issue*.
- The theme font is loaded from Google Fonts via `style.css` (`@import`).

## Credits & licence

- Code: © 2026 **OBUSXERA**, licensed under the [MIT](LICENSE) licence. Reuse must include this copyright notice and licence.
- **OBUSXERA logo** (`docs/logo.png`, `icons/`): © 2026 OBUSXERA.
- **Dock icons** (painting, aperture, bin): `icons.js`. These icons are **not** covered by the MIT licence. Please cite the original source and creator here before publishing the repository, and follow the terms of the icon provider’s licence (e.g. Flaticon requires attribution):
  - Icon source: https://www.flaticon.com/free-icon/diaphragm_3249934
                https://www.flaticon.com/free-icon/recycle-bin_3976956
                https://www.flaticon.com/free-icon/starry-night_3157837
- The UPI logo (used as the letter ‘o’ in the BuSpot wordmark) and the SPOT logo are the property of the University of Education Indonesia. They are used solely for personal display purposes and are not part of the MIT licence. This project is not affiliated with UPI.


Translated with DeepL.com (free version)
