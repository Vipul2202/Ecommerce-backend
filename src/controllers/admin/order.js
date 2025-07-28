const Order = require('../../models/order');
const Cart = require('../../models/cart');
const utils = require("../../utils/utils");
const Product = require("../../models/admin/product");
const mongoose = require('mongoose');
exports.getAllOrders = async (req, res) => {
  try {
    const {limit=10,offset=0,search,status }=req.query
    const query={}
    if(search){
        query.$or=[
            {name:{$regex:search,$options:"i"}},
            {email:{$regex:search,$options:"i"}}
        ]
    }
    if (status) {
      query.status = status;
    }

    const orders = await Order.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$user" },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories", // Make sure your category collection is pluralized correctly
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },
      {
        $addFields: {
          "items.product": {
            _id: "$productDetails._id",
            name: "$productDetails.name",
            image: "$productDetails.image",
            price: "$productDetails.price",
            category: "$categoryDetails"
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          userDetails: { $first: "$userDetails" },
          items: { $push: "$items" },
          totalAmount: { $first: "$totalAmount" },
          shippingAddress: { $first: "$shippingAddress" },
          shippingStatus: { $first: "$shippingStatus" },
          paidAt: { $first: "$paidAt" },
          deliveredAt: { $first: "$deliveredAt" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" }
        }
      },
      { $sort: { createdAt: -1 } }, // latest orders first
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      message: "Orders fetched successfully",
      data: orders
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};