const mongoose = require('mongoose');

const SR_ChamberSchema = new mongoose.Schema({
    chamberName: { type: String, required: true, unique: true },
    chamberCode: { type: String, required: true, unique: true},
},{ versionKey: false });

module.exports = mongoose.model('pl_chambers', SR_ChamberSchema);