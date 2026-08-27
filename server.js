require("dotenv").config();
const express = require("express");
const cors=require('cors')
const userRoutes = require('./src/routes/user')
const adminRoutes=require('./src/routes/admin')
const fileUpload = require('express-fileupload')
const initMongo = require("./src/config/mongo");
const app = express();
app.use(express.json()); 
// If you're using form-urlencoded data as well:
app.use(express.urlencoded({ extended: true }));
const corsOptions = {
  origin: [
    "https://carsaloon.com.au",
    "https://www.carsaloon.com.au",
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://localhost:4173",
    "http://localhost:5183",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5183"
  ],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "x-owner-password"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(
  fileUpload({
    createParentPath: true,
  })
);
app.use(express.json())
app.use('/user', userRoutes)
app.use('/admin', adminRoutes)
app.get("/", (req, res) => {
  return res.send("Welcome to Inlinkpay E-commerce Backend");
});

// CORS test endpoint
app.get("/test-cors", (req, res) => {
  res.json({ 
    message: "CORS is working!", 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});
app.listen(process.env.PORT || 5000, () => {
  console.log("****************************1111");
  console.log(
    `*    Starting ${process.env.ENV === "local" ? "HTTP" : "HTTPS"} Server`
  );
  console.log(`*    Port: ${process.env.PORT || 5000}`);
  console.log(`*    Database: MongoDB`);
  console.log(`*    DB Connection: OK\n***************************1111*\n`);
});

initMongo();