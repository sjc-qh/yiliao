import dotenv from "dotenv";
import process from "node:process";
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "rehabmaster",
  dbPassword: process.env.DB_PASSWORD || "123456",
  dbName: process.env.DB_NAME || "elderlyrehab",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
   corsOrigin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ["http://localhost:5173", "http://localhost:3000", "http://62.234.163.176"],
};
