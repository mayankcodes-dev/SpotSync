const mongoose = require('mongoose');
const cities = require('./cities')
const Campground = require('../models/campground');
const { places, descriptors } = require('./seedHelpers');

mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)]

const seedDB = async () => {
  await Campground.deleteMany({});
  for (let index = 0; index < 30; index++) {
    const random100 = Math.floor(Math.random() * 100);
    const price = Math.floor(Math.random() * 20) + 10;
    const camp = new Campground({
      author: '68ca513b1124428568a63cf2',
      location: `${cities[random100].city},${cities[random100].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Vitae rerum ipsa consectetur consequuntur ducimus, distinctio impedit officiis corrupti accusamus laboriosam asperiores alias fugiat ex porro, incidunt aliquid odio tempora deleniti.",
      price : price,
      geometry:{
        type: "Point",
        coordinates: [
          cities[random100].longitude,
          cities[random100].latitude,
        ]
      },
      images:[
          {
            url: 'https://res.cloudinary.com/dgqgzmzed/image/upload/v1758756566/YelpCamp/jbihpmehhkkyjoen9zgb.jpg',
        filename: 'YelpCamp/ztihhnd4typman05c4hm'
          },
          {
            url: 'https://res.cloudinary.com/dgqgzmzed/image/upload/v1758756630/YelpCamp/usnuscrdf3zrbuzcjkql.jpg',
        filename: 'YelpCamp/os6makcwbz6sjpnb2ivx'
          }
      ]
    })
    await camp.save();
  }

}

seedDB().then(() => {
  mongoose.connection.close();
});
