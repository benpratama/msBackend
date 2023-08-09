const mongoose = require('mongoose');

const SR_DataSchema = new mongoose.Schema({
    data:{ type: Array,required: true},
    planID: { type: String, required: true,unique: true},
    avgOutput:{ type: Number, required: true},
    avgWIP:{ type: Number, required: true},
    created_at:{type: String, required: true},
    
},{ versionKey: false });

module.exports = mongoose.model('sr_datas', SR_DataSchema);
