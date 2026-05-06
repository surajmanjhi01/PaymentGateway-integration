const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber:{type:String,required:true},
   
},
{ timestamps: true }
)

const usermodel = mongoose.model('User', userSchema);
module.exports = usermodel;