# Spectrum Commercial Skipper

![Icon](icon128.png) <!-- Replace with your actual icon path if you want to display it in the README -->

A Chrome extension that mutes and covers the Spectrum TV video player during commercial breaks, featuring a bouncing countdown timer with color cycling for OLED TV protection. Use hotkeys to skip ads:  
- **3**: Start/stop a 30-second timer  
- **2**: Start/stop a 2-minute timer  
- **1**: Start a 1-minute timer or add 1 minute to the current one  

This extension is designed for Spectrum TV users who want to automate muting and screen covering during commercials, with built-in safeguards like cursor hiding and anti-burn-in features for OLED displays.

## Features

- **Hotkey Controls**:  
  - Press **3** to mute/cover for 30 seconds (toggle on/off).  
  - Press **2** to mute/cover for 2 minutes (toggle on/off).  
  - Press **1** to start a 1-minute timer (or extend the current timer by 1 minute if active).  

- **Visual Feedback**: A large, bouncing countdown timer (MM:SS format) displays on a black overlay, preventing accidental viewing of ads.  

- **OLED Protection**:  
  - The timer text cycles through darker, richer colors (deep blue, emerald green, amber, burgundy, steel gray) every 2 seconds.  
  - The timer bounces smoothly around the screen at a steady speed, avoiding static positioning to minimize screen burn-in.  

- **Additional Enhancements**:  
  - Automatically unmutes and uncovers the video when the timer expires.  
  - Hides the mouse cursor during inactivity for a distraction-free experience.  
  - Works only on Spectrum TV pages (`https://watch.spectrum.net/*`).  

## Installation

This extension is not published to the Chrome Web Store. To install it manually on Chrome (or any Chromium-based browser like Edge, Brave, or Vivaldi), enable Developer Mode and load it unpacked. Follow these steps:

1. **Download the Extension**:  
   - Clone or download this repository:  
     ```
     git clone https://github.com/JESShEart/mute-plugin.git
     ```  
     Or click the green "Code" button > "Download ZIP" and extract the files.  

2. **Open Chrome Extensions Page**:  
   - Go to `chrome://extensions/` (or `edge://extensions/` for Edge).  

3. **Enable Developer Mode**:  
   - Toggle "Developer mode" on in the top-right corner.  

4. **Load the Extension**:  
   - Click "Load unpacked."  
   - Navigate to the downloaded/extracted `mute-plugin` folder (the one containing `manifest.json` and `script.js`).  
   - Select the folder and click "Select Folder."  

5. **Verify Installation**:  
   - The extension should appear in the list with its icon.  
   - Navigate to a Spectrum TV page (e.g., `https://watch.spectrum.net/livetv`) to test.  
   - Press '3', '2', or '1' to activate— the video should mute, and the black overlay with bouncing timer should appear.  

**Note**: The extension will only work on Spectrum TV pages. Reload the page if needed after installation.

## Usage

1. **During a Live Stream or Game**:  
   - When commercials start, press **3** (30 seconds), **2** (2 minutes), or **1** (1 minute) to activate the overlay.  
   - The video mutes, a black cover appears, and a large bouncing timer starts counting down.  
   - The timer text changes colors every 2 seconds and moves steadily around the screen.  

2. **Extending or Canceling**:  
   - Press **3** or **2** again to cancel early (unmutes and removes the overlay).  
   - Press **1** while active to add 1 minute to the current timer.  
   - The timer auto-expires, restoring sound and visibility.  

3. **Cursor Hiding**:  
   - The mouse cursor hides during inactivity on the page for immersion (moves on hover/click).  

**Pro Tip**: Test on a non-critical stream first. The extension doesn't affect video playback— it just mutes and covers the player element.

## Screenshots

<!-- Add screenshots here for better visualization. You can upload images to the repo and reference them. Example: -->
![Active Timer Overlay](screenshots/timer-overlay.png)  
![Bouncing Timer in Action](screenshots/bouncing-timer.gif)  

(Upload GIFs or PNGs to a `screenshots/` folder in the repo and update the paths.)

## Troubleshooting

- **Hotkeys Not Working**: Ensure you're on a Spectrum TV page (`https://watch.spectrum.net/*`). Focus the video player and try again.  
- **Overlay Not Appearing**: Check the console (`F12` > Console) for errors. Reload the page or extension.  
- **Icon Not Showing**: Ensure `icon128.png` is in the root folder and `manifest.json` references it correctly. Restart the browser.  
- **Timer Closes Early**: This should be fixed in v1.1.0—update if needed.  
- **Browser Compatibility**: Works on Chrome 88+, Edge, Brave, Vivaldi. Not tested on Firefox (requires adjustments).  

If issues persist, open an issue on this repo or check the browser's extension errors.

## Development

- **Files**:  
  - `manifest.json`: Extension configuration (Manifest V3).  
  - `script.js`: Core logic for muting, overlay, timer, bouncing animation, and hotkeys.  
  - `icon128.png`: Extension icon (128x128 PNG).  

- **Building/Updating**:  
  - Edit `script.js` for features (e.g., adjust speeds in `dx`/`dy` variables).  
  - Reload the extension in `chrome://extensions/` (click the reload icon).  

- **License**: MIT (feel free to fork and modify).  

## Contributing

Pull requests welcome! For major changes, open an issue first.  

1. Fork the repo.  
2. Create a feature branch (`git checkout -b feature/amazing-feature`).  
3. Commit changes (`git commit -m 'Add amazing feature'`).  
4. Push to the branch (`git push origin feature/amazing-feature`).  
5. Open a Pull Request.  

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- Built with help from Grok (xAI) for debugging and features.  

---

*Last updated: September 21, 2025, 05:34 PM EDT*
