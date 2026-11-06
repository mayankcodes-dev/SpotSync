const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.DB_URL).then(async () => {
  const C = require('./dist/models/campground').default;
  const spots = await C.find({}, 'title images').lean();
  spots.forEach(s => {
    const url = (s.images && s.images.length) ? s.images[0].url : 'NO_IMAGE';
    console.log(s.title.substring(0,30) + ' => ' + url.substring(0,70));
  });
  process.exit();
}).catch(e => { console.error(e.message); process.exit(1); });
