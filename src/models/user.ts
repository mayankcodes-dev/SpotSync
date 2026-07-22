import mongoose, { Schema, Document, Model } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  // passport-local-mongoose adds: authenticate, serializeUser, deserializeUser, etc.
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

UserSchema.plugin(passportLocalMongoose);

// Use a type assertion because passport-local-mongoose extends the model
interface UserModel extends Model<IUser> {
  authenticate(): any;
  serializeUser(): any;
  deserializeUser(): any;
  register(user: any, password: string): Promise<IUser>;
}

const User = mongoose.model<IUser, UserModel>('User', UserSchema);

export default User;
