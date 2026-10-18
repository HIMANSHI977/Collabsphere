
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters"
    );
  }

  return jwt.sign(
    { sub: userId.toString() },
    secret,
    { expiresIn: "1d" }
  );
};

export default generateToken;
