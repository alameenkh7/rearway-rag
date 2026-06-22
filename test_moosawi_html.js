const axios = require('axios');
axios.get('https://www.moosawi.ae/products').then(r => console.log(r.data)).catch(console.error);
