const Order = require('../../models/order');
const Cart = require('../../models/cart');

const Product = require("../../models/admin/product");
const mongoose = require('mongoose');
const utils = require("../../utils/utils");
const User = require('../../models/user');

 exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    
    const cartData = await Cart.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$items" },
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
        $addFields: {
          "items.product": "$productDetails._id",
          "items.priceAtAddition": "$items.priceAtAddition",
          "items.quantity": "$items.quantity"
        }
      },
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          items: {
            $push: {
              product: "$items.product",
              quantity: "$items.quantity",
              priceAtPurchase: "$items.priceAtAddition"
            }
          }
        }
      }
    ]);

    if (!cartData || cartData.length === 0 || cartData[0].items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty or not found' });
    }

    const cart = cartData[0];

    // Step 2: Calculate total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.priceAtPurchase,
      0
    );

    // Step 3: Extract shipping address
    const user=await User.findById(userId)
    const {
      fullName = user.name,
      
      address,
      city,
      state,
      postalCode,
      country,
      phone
    } = req.body.shippingAddress || {};

    if (!fullName || !address || !city || !postalCode || !country || !phone) {
      return res.status(400).json({ message: 'Incomplete shipping address' });
    }

    // Step 4: Create and save order
    const order = await Order.create({
      user: cart.user,
      items: cart.items,
      totalAmount,
      shippingAddress: {
        fullName,
        address,
        city,
        state,
        postalCode,
        country,
        phone
      }
    });

   

    // Step 5: Clear the cart
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
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
          from: "categories",
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
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({
      message: "Your orders fetched successfully",
      data: orders
    });

  } catch (error) {
    utils.handleError(res, error);
  }
};

