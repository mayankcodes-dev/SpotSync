import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  rating: number;
  body: string;
  author: mongoose.Types.ObjectId;
}

const reviewSchema = new Schema<IReview>({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  body: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
