const Category = require("../../models/admin/category")
const Product = require("../../models/admin/product")
const utils = require("../../utils/utils")

exports.createProduct = async (req, res) => {
    try {
        console.log("req.body", req.body);
        const existingProduct = await Product.findOne({ name: req.body.name, category: req.body.category })
        if (existingProduct) {
            return res.status(400).json({ message: "Product already exists" })
        }
        const product = await Product.create(req.body)
        res.status(200).json({ data: product, message: "Product created successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.getProducts = async (req, res) => {
    try {
        const {limit=10,offset=0,search,category}=req.query
        const query={}
        if(search){
            query.$or=[
                {name:{$regex:search,$options:"i"}},
                {description:{$regex:search,$options:"i"}}
            ]
        }
         if (category && category.trim() !== "") {
      query.category = category;
    }
        const products = await Product.find(query).limit(limit).skip(offset).populate("category")
        const total=await Product.countDocuments(query)
        
        res.status(200).json({ data: products, count: total, message: "Products fetched successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.getallProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.status(200).json({
      success: true,
      message: "Get all products API working successfully!",
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const product = await Product.findByIdAndDelete(id)
        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }
        res.status(200).json({ message: "Product deleted successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params
        const product = await Product.findById(id).populate("category")
        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }
        res.status(200).json({ data: product, message: "Product fetched successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params
        const product = await Product.findByIdAndUpdate(id, req.body, { new: true })
        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }
        res.status(200).json({ data: product, message: "Product updated successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}