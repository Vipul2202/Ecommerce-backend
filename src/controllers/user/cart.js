const Cart = require("../../models/cart");
const utils = require("../../utils/utils");
const Product = require("../../models/admin/product");
const { default: mongoose } = require("mongoose");
exports.addProductToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: "Invalid product or quantity" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cart = await Cart.findOne({ user: userId });

    // If cart doesn't exist, create one
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        product: product._id,
        quantity,
        priceAtAddition: product.price,
      });
    }

    await cart.save();

    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.removeProductFromCart = async (req, res) => {
  try {
    const  productId  = req.params.id;
    const userId = req.user._id;
    console.log("productId",productId,"userId",userId);

    const cart = await Cart.findOne({ user: userId });
    console.log("cart",cart);

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );
    console.log("itemIndex",itemIndex);

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // If quantity > 1, decrement it
    if (cart.items[itemIndex].quantity > 1) {
      console.log("cart.items[itemIndex].quantity",cart.items[itemIndex].quantity);
      cart.items[itemIndex].quantity -= 1;
    } else {
      // Remove item if quantity is 1
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();

    res.status(200).json({
      message: "Product quantity updated in cart",
      cart,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getCart = async (req, res) => {
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
          "items.productDetails": "$productDetails",
          "items.total": {
            $multiply: ["$items.quantity", "$items.priceAtAddition"]
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          items: { $push: "$items" },
          totalAmount: { $sum: { $multiply: ["$items.quantity", "$items.priceAtAddition"] } },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" }
        }
      },
      {
        $project: {
          _id: 1,
          user: 1,
          items: 1,
          totalAmount: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    if (!cartData || cartData.length === 0) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({
      data: cartData[0],
      message: "Cart fetched successfully"
    });

  } catch (error) {
    utils.handleError(res, error);
  }
};