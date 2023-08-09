const mongoose = require('mongoose');

const SR_ProcessSchema = new mongoose.Schema({
    processOrder: { type: Number, required: true, unique: true },
    processCode: { type: String, required: true,unique: true},
    processName: { type: String, required: true},
    machineIconFile: { type: String, required: true}
},{ versionKey: false });

module.exports = mongoose.model('pl_processes', SR_ProcessSchema);