import puppeteer from "puppeteer";
import bluebird from "bluebird";
import fs from "fs";

async function main() {
    process.stdout.write("Opening Browser...")
    const browser = await puppeteer.launch({ headless: true });
    process.stdout.write("Complete\n");

    let song_ids = [];

    async function getSongIds(pageNum) {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(req.resourceType() === 'image'){
                req.abort();
            }
            else {
                req.continue();
            }
        });

        await page.goto("https://ncs.io/music-search?q=&page=" + pageNum);

        const playSelector = "td .panel-btn:not(.featured .panel-btn)";
        await page.waitForSelector(playSelector);
        let ids = await page.$$eval(playSelector, (els) => els.map((el) => el.getAttribute("data-tid")));
        song_ids.push(...ids);

        console.log("Found " + ids.length + " songs on page " + pageNum);
    }

    let pages = [...Array(66).keys()].map(i => i + 1); // 1-66
    await bluebird.map(pages, getSongIds, { concurrency: 8 });
    await browser.close();
    console.log("Found " + song_ids.length + " songs total");

    let urls = song_ids.map((id) => `https://ncs.io/track/download/${id}`);

    // write to file
    process.stdout.write("Writing to download_list.txt...");
    fs.writeFileSync("download_list.txt", urls.join("\n"));
    process.stdout.write("Complete\n");
}

main();