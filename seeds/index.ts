/**
 * seeds/index.ts — SpotSync database seeder
 * Run: npx ts-node seeds/index.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import cities from './cities';
import { places, descriptors } from './seedHelpers';

// Use ts-node to load the TS model directly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Campground = require('../src/models/campground').default;

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/spotsync';

mongoose
  .connect(dbUrl)
  .then(() => console.log('✅ Database connected'))
  .catch((err: Error) => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });

const sample = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

const seedDB = async (): Promise<void> => {
  await Campground.deleteMany({});
  for (let i = 0; i < 30; i++) {
    const random100 = Math.floor(Math.random() * 100);
    const price = Math.floor(Math.random() * 20) + 10;
    const camp = new Campground({
      // ⚠️  Replace with a real user _id from your DB before seeding
      author: process.env.SEED_USER_ID || '000000000000000000000000',
      location: `${cities[random100].city}, ${cities[random100].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description:
        'A beautiful spot surrounded by nature. Perfect for stargazing, hiking, and disconnecting from the everyday.',
      price,
      geometry: {
        type: 'Point',
        coordinates: [cities[random100].longitude, cities[random100].latitude],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/dgqgzmzed/image/upload/v1762757693/images_sgn4cj.jpg',
          filename: 'SpotSync/placeholder',
        },
      ],
    });
    await camp.save();
  }
  console.log(`✅ Seeded 30 spots`);
};

seedDB()
  .then(() => mongoose.connection.close())
  .catch((err: Error) => {
    console.error(err);
    mongoose.connection.close();
    process.exit(1);
  });
