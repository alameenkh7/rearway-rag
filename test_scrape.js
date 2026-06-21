const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.rearway.com').then(r => {
  const $ = cheerio.load(r.data);
  $('script, style, noscript, nav, footer, header, iframe, img, svg, form, button').remove();
  $('[aria-hidden="true"]').remove();
  
  const contentEl = $('main, article, [role="main"], .content, #content, .main, #main').first();
  const target = contentEl.length ? contentEl : $('body');
  
  const text = target.text().replace(/\s+/g, ' ').trim();
  console.log("TEXT LENGTH:", text.length);
  console.log("TEXT CONTENT:", text);
}).catch(console.error);
