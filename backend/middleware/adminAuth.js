import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.userType !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    req.admin = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
