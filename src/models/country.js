const mongoose = require('mongoose')

const countrySchema = new mongoose.Schema({
    
    name:{
        type: String,
        required: true
    },
    code:{
        type: String,
        required: true
    },
    status:{
        type:String,
        required: true
    }

})

module.exports = mongoose.model('country', countrySchema)