const axios = require('axios');

axios.get('https://www.rearway.com').then(r => {
  console.log(r.data);
}).catch(console.error);
