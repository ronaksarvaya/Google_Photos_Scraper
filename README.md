# Google Photos Scraper

A web-based tool and local API designed to scrape your Google Photos timeline to determine which days contain photos and which days are empty. 

Instead of dealing with complex Google API authentication or getting blocked by bot-detection, this tool connects directly to your **existing, already logged-in browser session** (Chrome, Brave, or Edge) using Puppeteer.

## 🚀 Features
- **Zero Login Automation:** Uses your real, active browser profile. If you are logged into Google Photos in Chrome, the scraper is too.
- **Visual Timeline:** Includes a frontend interface to visually scan through your timeline.
- **Smart Caching:** Results are cached in `cache.json` so you don't rescrape the same days twice, speeding up subsequent loads.
- **Local API:** Runs a local Express server on port 3000 to handle requests from the frontend.

---

## 🛠️ Setup & Installation

### Prerequisites
1. **Node.js**: Make sure you have Node.js installed on your system.
2. **Chromium Browser**: Google Chrome, Brave, or Microsoft Edge.

### Installation
1. Clone or download this repository.
2. Open your terminal in this project's folder.
3. Install the required dependencies:
   ```bash
   npm install express cors puppeteer
   ```

---

## 🏃‍♂️ How to Run

Because this scraper uses your active browser profile, **you cannot launch the scraper if your browser is already running normally**. You must start your browser in "Remote Debugging Mode" first.

### Step 1: Launch your browser with Remote Debugging
We have provided a convenient batch script to do this for Google Chrome.

1. **Completely close Chrome.** Ensure no instances are running in the background (check your system tray or Task Manager).
2. Double-click the `launch-chrome.bat` file.
   * *This will open a new Chrome window and a command prompt. Do not close the command prompt.*

> **Alternative (Manual Method):**
> Open the Windows Run dialog (`Win + R`) and paste:
> `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`

### Step 2: Start the Scraper Server
1. Open a new terminal in the project directory.
2. Run the server:
   ```bash
   node server.js
   ```
3. When prompted, type the number corresponding to the browser you just launched (e.g., `2` for Google Chrome) and press Enter.
4. The server will connect to your running browser and start listening on `http://localhost:3000`.

### Step 3: View the Timeline
1. Open the file located at `DO_NOT_TOUCH/googlePhotos.html` in your browser.
2. The UI will begin requesting dates, and you will see the script automating the hidden browser tab to check for photos!

---

## ⚠️ Troubleshooting

**Error: "Could not connect to OR launch..."**
This means the script could not connect to port 9222, and it could not launch a new instance because your browser is already running normally.
* **Fix:** Close ALL instances of your browser completely. Use `launch-chrome.bat` to open it correctly before starting the server.

**Google requires sign-in or verification:**
If the script opens a new tab and you are not logged in, simply click on the Chrome window that opened and log into your Google account manually. Once logged in, the scraper will be able to proceed.

## 📁 Project Structure
- `server.js` - The main Node.js/Express server and Puppeteer automation logic.
- `launch-chrome.bat` - Helper script to launch Chrome with the required debugging port.
- `cache.json` - Automatically generated cache file storing the `hasPhotos` boolean for specific dates.
- `DO_NOT_TOUCH/googlePhotos.html` - The frontend visual interface.
