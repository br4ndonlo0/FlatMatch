import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    trim: true,
    match: /.+@.+\..+/, // optional email format check
  },
  password: { type: String, required: true },
  income: { type: String },
  age: { type: Number },
  citizenship: { type: String },
  loan: { type: String },
  flatType: { type: String },
  downPaymentBudget: { type: Number },
  area: { type: String }
});

export default mongoose.models.User || mongoose.model("User", userSchema);
