const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.moosawi.ae/products').then(r => {
  const $ = cheerio.load(r.data);
  $('script, style, nav, footer, header, iframe, img, svg, form, button').remove();
  $('[aria-hidden="true"]').remove();
  const c = $('main, article, [role="main"], .content, #content, .main, #main').first();
  const target = c.length ? c : $('body');
  console.log(target.text().replace(/\s+/g, ' ').trim());
}).catch(console.error);
