const utils = require("../../utils/utils")
const Category = require("../../models/admin/category")
exports.createCategory = async (req, res) => {
    try {
        const existingCategory = await Category.findOne({ name: req.body.name })
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" })
        }
        const category = await Category.create(req.body)
        res.status(200).json({ data: category, message: "Category created successfully" })
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
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params
        const category = await Category.findByIdAndDelete(id)
        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }
        res.status(200).json({ message: "Category deleted successfully" })
    } catch (error) {
        utils.handleError(res, error)
    }
}