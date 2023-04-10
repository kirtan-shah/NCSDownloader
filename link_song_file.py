import re
import aiohttp
import asyncio
import json
import sys
from tqdm.asyncio import tqdm_asyncio

limit = asyncio.Semaphore(64)

async def safe_get_filename(url):
    async with limit:
        return await get_filename(url)

async def get_filename(url):
    async with aiohttp.ClientSession() as session:
        async with session.head(url) as response:
            try:
                filename = re.findall("filename=\"(.+)\"", response.headers["content-disposition"])[0]
                return filename
            except KeyError:
                print("Error with " + url)

async def main():
    songs = json.load(open("songs.json", "r"))
    urls = []
    tasks = []
    for song in songs:
        url = "https://ncs.io/track/download/" + song["id"]
        urls.append(url)
        tasks.append(asyncio.create_task(safe_get_filename(url)))
    filenames = await tqdm_asyncio.gather(*tasks)
    for song, filename in zip(songs, filenames):
        if filename is None:
            print("No filename found for " + song["id"])
        song["file"] = filename
    json.dump(songs, open("songs_linked.json", "w"), indent=4)
asyncio.run(main())