import jwt from "jsonwebtoken";

export const verify = (token: string) => {
  try {
    return jwt.verify(token, process.env.COOKIE_SECRET);
  } catch (err) {
    return false;
  }
};

export const sign = (data: any) => {
  return jwt.sign(data, process.env.COOKIE_SECRET);
};