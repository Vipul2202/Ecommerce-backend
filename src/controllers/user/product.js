const Product = require("../../models/admin/product")
const utils = require("../../utils/utils")
const Category = require("../../models/admin/category")

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
exports.getCategories = async (req, res) => {
    try {
        const {search}=req.query
        const query={}
        if(search){
            query.$or=[
                {name:{$regex:search,$options:"i"}}
            ]
        }
        const categories = await Category.find(query).select("name")
        res.status(200).json({ data: categories, message: "Categories fetched successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}