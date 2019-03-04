import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { PostData } from './interfaces';
import { PostTemplate } from './template';
import * as request from 'request';

declare const $;

(async () => {

  // Optional window and viewport dimentions config
  const width = 1024;
  const height = 768;

  console.time('Execution time');

  const browser = await puppeteer.launch({
    headless: true,
    args: [ `--window-size=${width},${height}` ]
  });

  try {

    const page = await browser.newPage();

    const baseSiteUrl = process.argv[2];

    console.log(`Getting pages count`);

    await page.goto(baseSiteUrl, { waitUntil: [ 'domcontentloaded' ] });
    const pagesNumber = await page.evaluate(() => {
      return parseInt($($('.nav-links .page-numbers').toArray().filter(el => !$(el).hasClass('next')).pop()).text(), 10);
    });

    console.log(`Number of pages found: ${pagesNumber}`);

    mkdirp.sync('./data');

    // Get all blog articles URLs
    let posts: string[] = [];
    let pageNum = 1;
    for (const _ of Array.apply(null, Array(pagesNumber))) {
      (process.stdout as any).clearLine();
      (process.stdout as any).cursorTo(0);
      process.stdout.write(`Scanning blog articles: ${Math.floor((pageNum / pagesNumber) * 100)}%`);
      let pageUrl = baseSiteUrl;
      if (pageNum > 1) {
        pageUrl += `/page/${pageNum}/`;
      }
      await page.setViewport({ width, height });
      await page.goto(pageUrl, { waitUntil: [ 'domcontentloaded' ] });
      const postsAtPage: string[] = await page.evaluate(() => {
        return $('.entry-title > a').toArray().map(el => $(el).attr('href'));
      });
      posts = posts.concat(postsAtPage);
      pageNum += 1;
    }

    fs.writeFileSync('./data/links.json', JSON.stringify(posts, null, 2), 'utf8');
    console.log(`\nFound ${posts.length} posts`);

    // Get all articles content data
    let articles: PostData[] = [];
    let postNum = 1;
    for (const postUrl of posts) {
      (process.stdout as any).clearLine();
      (process.stdout as any).cursorTo(0);
      process.stdout.write(`Processing: ${Math.floor((postNum / posts.length) * 100)}%`);
      await page.goto(postUrl, { waitUntil: [ 'domcontentloaded' ] });
      const data: PostData = await page.evaluate(() => {
        const article: PostData = {
          title: $('.entry-title').text(),
          content: $('.entry-content.single').html().trim(),
          date: $('.entry-date.published').attr('datetime'),
          author: $('.author > a').html().split('<')[0],
          tags: $('.tags > span > a').toArray().map(el => $(el).text()),
          images: $('.entry-content.single img').toArray().map(el => $(el).attr('src')),
          url: window.location.href
        };
        return article;
      });
      articles = articles.concat({ ...data, url: postUrl });

      const folder = path.join('./data', postUrl.replace(baseSiteUrl, ''));
      mkdirp.sync(folder);
      const postContent = PostTemplate({ ...data, url: postUrl });
      fs.writeFileSync(path.join(folder, 'index.md'), postContent, 'utf8');

      if (data.images.length > 0) {
        mkdirp.sync(path.join(folder, 'img'));
      }
      for (const img of data.images) {
        await new Promise((resolve, reject) => {
          request.get(img, { encoding: null }, (err, _resp, body) => {
            if (err) {
              return reject(err);
            }
            fs.writeFileSync(path.join(folder, 'img', img.split('/').pop().split('?')[0]), body, null);
            resolve();
          });
        })
          .catch(err => {
            fs.appendFileSync(path.join(folder, './errors.txt'), err);
          });
      }

      fs.writeFileSync('./data/data.json', JSON.stringify(articles, null, 2), 'utf8');
      postNum += 1;
    }

    console.log(`\nDone`);

  } catch (ex) {
    console.log(`Error: ${ex.message}`);
  } finally {
    await browser.close();
  }

  console.timeEnd('Execution time');

})();
