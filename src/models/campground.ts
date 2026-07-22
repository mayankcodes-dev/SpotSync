import mongoose, { Schema, Document, Model } from 'mongoose';
import { cloudinary } from '../cloudinary';
import Review, { IReview } from './review';

export interface IImage {
  url: string;
  filename: string;
  thumbnail?: string;
}

export interface ICampground extends Document {
  title: string;
  images: IImage[];
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  price: number;
  description: string;
  location: string;
  author: mongoose.Types.ObjectId;
  reviews: mongoose.Types.ObjectId[] | IReview[];
}

const ImageSchema = new Schema<IImage>({
  url: String,
  filename: String,
});

ImageSchema.virtual('thumbnail').get(function (this: IImage) {
  return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };

const campgroundSchema = new Schema<ICampground>(
  {
    title: String,
    images: [ImageSchema],
    geometry: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    price: Number,
    description: String,
    location: String,
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
  },
  opts
);

// Virtual property for map popups
campgroundSchema.virtual('properties.popUpMarkup').get(function (this: ICampground) {
  const desc = this.description || '';
  return `<strong><a href="/campgrounds/${this._id}">${this.title}</a></strong>
          <p>${desc.substring(0, 20)}...</p>`;
});

// Cascade delete reviews and images when campground is deleted
campgroundSchema.post('findOneAndDelete', async function (doc: ICampground | null) {
  if (doc) {
    await Review.deleteMany({
      _id: { $in: doc.reviews },
    });
    if (doc.images && doc.images.length) {
      for (const img of doc.images) {
        if (img.filename && img.filename !== 'placeholder-campground-image') {
          try {
            await cloudinary.uploader.destroy(img.filename);
          } catch (err) {
            console.log('Cloudinary deletion error:', err);
          }
        }
      }
    }
  }
});

const Campground: Model<ICampground> = mongoose.model<ICampground>('campground', campgroundSchema);

export default Campground;
