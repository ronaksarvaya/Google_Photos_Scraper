const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
app.use(cors());
const PORT = 3000;

const CACHE_FILE = path.join(__dirname, 'cache.json');
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
        console.error("Could not parse cache file, starting fresh.");
        cache = {};
    }
}

let browser;
let queueLock = Promise.resolve();

async function initBrowser() {
    console.log('Initializing Puppeteer...');

    const basePath = process.env.LOCALAPPDATA || process.env.APPDATA || '';
    const homePath = process.env.HOME || '';

    // Candidate paths for browsers depending on your Operating System
    const browserPaths = {
        win32: [
            { name: 'Brave', path: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe', userData: basePath ? path.join(basePath, 'BraveSoftware', 'Brave-Browser', 'User Data') : null },
            { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', userData: basePath ? path.join(basePath, 'Google', 'Chrome', 'User Data') : null },
            { name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', userData: basePath ? path.join(basePath, 'Microsoft', 'Edge', 'User Data') : null },
            { name: 'Firefox', path: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', userData: null }
        ],
        darwin: [
            { name: 'Brave', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', userData: homePath ? path.join(homePath, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser') : null },
            { name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', userData: homePath ? path.join(homePath, 'Library', 'Application Support', 'Google', 'Chrome') : null },
            { name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', userData: homePath ? path.join(homePath, 'Library', 'Application Support', 'Microsoft Edge') : null },
            { name: 'Firefox', path: '/Applications/Firefox.app/Contents/MacOS/firefox', userData: null }
        ],
        linux: [
            { name: 'Brave', path: '/usr/bin/brave-browser', userData: homePath ? path.join(homePath, '.config', 'BraveSoftware', 'Brave-Browser') : null },
            { name: 'Google Chrome', path: '/usr/bin/google-chrome', userData: homePath ? path.join(homePath, '.config', 'google-chrome') : null },
            { name: 'Microsoft Edge', path: '/usr/bin/microsoft-edge', userData: homePath ? path.join(homePath, '.config', 'microsoft-edge') : null },
            { name: 'Firefox', path: '/usr/bin/firefox', userData: null }
        ]
    };

    const platform = process.platform;
    const candidates = browserPaths[platform] || [];

    // Filter to check which candidates exist on the system
    const availableCandidates = candidates.filter(c => fs.existsSync(c.path));

    if (availableCandidates.length === 0) {
        console.error('\n======================================================');
        console.error('ERROR: No supported browser found on your system.');
        console.error('Please install Chrome, Edge, Brave, or Firefox, or check your path settings.');
        console.error('======================================================\n');
        process.exit(1);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const promptUser = () => {
        return new Promise((resolve) => {
            console.log('\n--- Select Your Browser ---');
            availableCandidates.forEach((c, index) => {
                console.log(`[${index + 1}] ${c.name}`);
            });
            console.log('---------------------------');

            rl.question('\nEnter the number corresponding to your browser: ', (answer) => {
                resolve(answer.trim());
            });
        });
    };

    let selectedCandidate = null;
    let validSelection = false;

    while (!validSelection) {
        const answer = await promptUser();
        const index = parseInt(answer, 10) - 1;

        if (index >= 0 && index < availableCandidates.length) {
            selectedCandidate = availableCandidates[index];
            validSelection = true;
        } else {
            console.log('\x1b[31m%s\x1b[0m', '\nInvalid selection. Please enter a valid number from the list.');
        }
    }

    rl.close();

    const browserPath = selectedCandidate.path;
    const browserName = selectedCandidate.name;
    const userDataDir = selectedCandidate.userData;

    console.log(`\nSelected ${browserName} at ${browserPath}`);
    console.log(`Attempting to connect to an existing browser instance on port 9222...`);

    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });
        console.log(`Browser ready. Connected to existing ${browserName} session.`);
    } catch (connectError) {
        console.log(`Could not connect to port 9222. Attempting to launch a new instance...`);
        
        try {
            // SOLUTION: Use your ACTUAL user data directory, but with Puppeteer flags that mimic a real browser
            const launchOptions = {
                headless: false,
                executablePath: browserPath,
                userDataDir: userDataDir,  // Use your REAL profile with your Google login
                args: [
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-hang-monitor',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--enable-automation=false',  // IMPORTANT: Hides automation markers
                    '--password-store=basic',
                    '--use-mock-keychain'
                ]
            };

            browser = await puppeteer.launch(launchOptions);
            console.log(`\n✅ Browser ready. Launched ${browserName} with your existing profile.`);
            console.log(`Profile location: ${userDataDir}`);
            console.log('\n⚠️  IMPORTANT: If Google asks for verification, complete it in the browser window.');
            console.log('   The script will wait for you to sign in.\n');
            
            // Wait a bit for user to potentially sign in
            await new Promise(r => setTimeout(r, 3000));
        } catch (launchError) {
            console.error('\n======================================================');
            console.error(`ERROR: Could not connect to OR launch ${browserName}.`);
            console.error('\nPossible solutions:');
            console.error('1. CLOSE Chrome completely and try again');
            console.error('   - Press Ctrl+Shift+Esc → Find Chrome → End Task');
            console.error('2. Use Remote Debugging (recommended):');
            console.error(`   a) Close all Chrome windows`);
            console.error(`   b) Run this command:`);
            console.error(`      "${browserPath}" --remote-debugging-port=9222`);
            console.error(`   c) Run: node .\server.js`);
            console.error('======================================================\n');
            console.error(`Launch Error Details: ${launchError.message}`);
            process.exit(1);
        }
    }
}

initBrowser().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});

app.get('/check/:date', async (req, res) => {
    const date = req.params.date;
    console.log(`[REQUEST] GET /check/${date}`);

    if (cache[date] !== undefined) {
        console.log(`[CACHE HIT] ${date} -> HAS_DATA: ${cache[date]}`);
        return res.json({ date, hasPhotos: cache[date] });
    }

    const resultPromise = new Promise((resolve, reject) => {
        queueLock = queueLock.then(async () => {
            if (cache[date] !== undefined) {
                return resolve({ date, hasPhotos: cache[date] });
            }

            console.log(`[PROCESSING] Scraping data for ${date}...`);
            let page;
            try {
                page = await browser.newPage();
                
                // Stealth mode: Avoid detection as automated browser
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => false,
                    });
                });

                const url = `https://photos.google.com/u/1/search/$${date}`;

                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                const hasNoResults = await page.evaluate(() => {
                    const text = document.body.innerText || '';
                    return text.includes("No results");
                });

                const hasPhotos = !hasNoResults;
                console.log(`[RESULT] ${date} -> HAS_DATA: ${hasPhotos ? 'YES' : 'EMPTY'}`);

                cache[date] = hasPhotos;
                fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

                await page.close();
                resolve({ date, hasPhotos });
            } catch (error) {
                console.error(`[ERROR] Failed to process ${date}:`, error.message);
                if (page) await page.close().catch(() => {});
                resolve({ date, hasPhotos: true });
            }

            await new Promise(r => setTimeout(r, 1000));
        }).catch(err => {
            console.error('Queue error:', err);
            resolve({ date, hasPhotos: true });
        });
    });

    const result = await resultPromise;
    res.json(result);
});