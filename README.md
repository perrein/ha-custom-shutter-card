# Custom Shutter Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A custom card for Home Assistant that provides an interactive visualization for window shutters/blinds with drag-and-drop positioning capabilities.

![Screenshot of the Custom Shutter Card](https://via.placeholder.com/600x400/45aaf2/ffffff?text=Custom+Shutter+Card)

## Features

- Visual representation of a window shutter/blind
- Interactive UI allowing direct positioning with mouse or touch
- Clean, modern Home Assistant compatible design
- Visual feedback showing current position of the shutter
- Responsive design for different screen sizes
- Drag and drop positioning of window shutters
- Display of current shutter position percentage
- Integration with Home Assistant cover entities
- Visual representation of shutter state (open/closed/partial)
- Additional info panel showing shutter details

## Installation

### HACS (Recommended)

1. Make sure you have [HACS](https://hacs.xyz/) installed in your Home Assistant instance.
2. Go to the HACS panel in Home Assistant.
3. Click on "Frontend".
4. Click the "+ Explore & Download Repositories" button in the bottom right.
5. Search for "Custom Shutter Card".
6. Click on the "Custom Shutter Card" item in the list.
7. Click "Download".
8. Refresh your browser.

### Manual Installation

1. Download the `custom-shutter-card.js` file from the [latest release](https://github.com/yourusername/custom-shutter-card/releases).
2. Copy the file to the `config/www` directory of your Home Assistant instance.
3. Add the resource reference to your Lovelace configuration:

```yaml
resources:
  - url: /local/custom-shutter-card.js
    type: module
