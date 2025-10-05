import mongoose, { Document, Model, Schema } from 'mongoose';

interface IUser extends Document {
  username: string;
  password: string;
}

const userSchema: Schema<IUser> = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

userSchema.statics.createUser = async function (username: string, password: string) {
  const user = new this({ username, password });
  return await user.save();
};

userSchema.statics.findUserByUsername = async function (username: string) {
  return await this.findOne({ username });
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;