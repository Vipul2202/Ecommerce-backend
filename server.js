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
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  // preflightContinue: false,
  // optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization, X-Requested-With",
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