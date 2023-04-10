import puppeteer from "puppeteer";
import bluebird from "bluebird";
import fs from "fs";

async function main() {
    process.stdout.write("Opening Browser...")
    const browser = await puppeteer.launch({ headless: true });
    process.stdout.write("Complete\n");

    let songs = [];

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

        const songRowSelector = ".table tr:not(.featured tr, .tablesorter-headerRow)";
        await page.waitForSelector(songRowSelector);
        let objs = await page.$$eval(songRowSelector, (els) => els.map(el => ({
            genre: el.querySelector("td .genre").getAttribute("title"),
            artist: el.querySelector("td:nth-child(4) span").textContent.trim(),
            title: el.querySelector("td:nth-child(4) p").textContent.trim(),
            moods: Array.from(el.querySelectorAll("td:nth-child(5) a")).map(a => a.textContent.trim()).slice(1),
            id: el.querySelector(".panel-btn").getAttribute("data-tid")
        })));
        songs.push(...objs);

        console.log("Found " + objs.length + " songs on page " + pageNum);
    }

    let pages = [...Array(66).keys()].map(i => i + 1); // 1-66
    await bluebird.map(pages, getSongIds, { concurrency: 8 });
    await browser.close();
    console.log("Found " + songs.length + " songs total");

    let urls = songs.map(song => `https://ncs.io/track/download/${song.id}`);

    // write to file
    process.stdout.write("Writing to download_list.txt...");
    fs.writeFileSync("download_list.txt", urls.join("\n"));
    process.stdout.write("Complete\n");
    
    process.stdout.write("Writing to songs.json...");
    fs.writeFileSync("songs.json", JSON.stringify(songs, null, 2));
    process.stdout.write("Complete\n");
}

main();