# Plyer-Video

A beautiful, responsive, and feature-rich web video player built with Vanilla JavaScript and CSS. Designed to be easily integrated into any project via npm.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.1-green.svg)

## Features

- 🎨 **Beautiful UI**: Modern dark theme with glassmorphism effects.
- 📱 **Fully Responsive**: Works seamlessly on mobile, tablet, and desktop.
- 📡 **DASH/HLS Support**: Built-in support for adaptive streaming using `hls.js` and `dashjs`.
- ⚡ **Buffering Loader**: Shows a spinner when the video is loading.
- 📥 **Download Progress**: Real-time visualization of buffered data in the timeline.
- ⏩ **Playback Speed**: Toggle between 0.5x, 1x, 1.5x, and 2x speeds.
- 🖼️ **Picture-in-Picture**: Supports browser native PiP mode.
- 📺 **Fullscreen**: Native fullscreen support with custom UI.
- ⌨️ **Keyboard Shortcuts**: Full control via keyboard.
- 🖱️ **Smart Controls**: Auto-hides controls on inactivity; toggle visibility by clicking the video.

## Installation

Install via npm:

```bash
npm install plyer-video
```

## Usage

### Simple Integration

```javascript
import Plyer from 'plyer-video';
import 'plyer-video/dist/style.css';

const myPlayer = new Plyer('#player-container', {
    src: 'path/to/your/video.mp4'
});
```

### HLS & DASH Streaming

The player automatically detects the stream type based on the file extension (`.m3u8` for HLS, `.mpd` for DASH).

```javascript
// HLS Example
const hlsPlayer = new Plyer('#player-hls', {
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
});

// DASH Example
const dashPlayer = new Plyer('#player-dash', {
    src: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd'
});

// Dynamic Source Switching
myPlayer.loadSource('https://example.com/stream.m3u8');
```

### HTML Structure

```html
<div id="player-container"></div>
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `Arrow Right` | Skip 5s Forward |
| `Arrow Left` | Skip 5s Backward |
| `Arrow Up` | Increase Volume |
| `Arrow Down` | Decrease Volume |

## API

### `new Plyer(selector, options)`

- **`selector`**: (String | HTMLElement) The container where the player will be rendered.
- **`options`**: (Object)
    - `src`: (String) The URL of the video source.

## License

MIT © [Your Name](https://github.com/yourusername)
