import mongoose from "mongoose";
import { userSchema } from "./schema";

export const User = mongoose.model("User", userSchema);
