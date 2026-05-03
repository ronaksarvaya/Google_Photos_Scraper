const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
const PORT = 3000;

const CACHE_FILE = path.join(__dirname, 'cache.json');
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch(e) {
        console.error("Could not parse cache file, starting fresh.");
        cache = {};
    }
}

let browser;
let queueLock = Promise.resolve();

async function initBrowser() {
    console.log('Initializing Puppeteer...');
    // We launch with headless: false so you can visually confirm login and behavior.
    // It uses userDataDir to persist the Google session across restarts.
    browser = await puppeteer.launch({ 
        headless: false, 
        userDataDir: path.join(__dirname, 'user_data') 
    });
    console.log('Browser ready. (If you are not logged in, please log in manually in the Chromium window).');
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

    // Use a queue lock to process dates sequentially, preventing rate-limiting
    // and avoiding opening hundreds of browser tabs at once.
    const resultPromise = new Promise((resolve, reject) => {
        queueLock = queueLock.then(async () => {
            // Check cache again in case a previous queue item processed it
            if (cache[date] !== undefined) {
                return resolve({ date, hasPhotos: cache[date] });
            }

            console.log(`[PROCESSING] Scraping data for ${date}...`);
            let page;
            try {
                page = await browser.newPage();
                const url = `https://photos.google.com/u/1/search/${date}`;
                
                // Wait until there are no more than 2 network connections for at least 500 ms.
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Add a small delay for React to finish any client-side hydration/rendering
                await new Promise(r => setTimeout(r, 2000));
                
                const hasNoResults = await page.evaluate(() => {
                    const text = document.body.innerText || '';
                    return text.includes("No results");
                });

                const hasPhotos = !hasNoResults;
                console.log(`[RESULT] ${date} -> HAS_DATA: ${hasPhotos ? 'YES' : 'EMPTY'}`);
                
                // Persist cache
                cache[date] = hasPhotos;
                fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
                
                await page.close();
                resolve({ date, hasPhotos });
            } catch (error) {
                console.error(`[ERROR] Failed to process ${date}:`, error.message);
                if (page) await page.close().catch(() => {});
                
                // Fallback: If scraping fails, we assume it has photos so we don't permanently hide it
                resolve({ date, hasPhotos: true }); 
            }
            
            // Add a small delay between requests to be gentle on Google's servers
            await new Promise(r => setTimeout(r, 1000));
        }).catch(err => {
            console.error('Queue error:', err);
            resolve({ date, hasPhotos: true });
        });
    });

    const result = await resultPromise;
    res.json(result);
});
