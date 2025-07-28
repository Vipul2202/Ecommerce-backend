const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    price: {
        type: Number,
        required: false,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "category",
    },
    image: {
        type: String,
        required: false,
    },
   },
    {
        versionKey: false,
        timestamps: false,
    }
);

module.exports = mongoose.model("product", productSchema);