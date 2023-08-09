const mongoose = require('mongoose');

const SR_MachineSchema = new mongoose.Schema({
    machineCode: { type: String, required: true, unique: true },
    machineName: { type: String, required: true},
    machineType: { type: String, required: true},
    machineLocation: { type: String, required: true},
},{ versionKey: false });

module.exports = mongoose.model('pl_machines', SR_MachineSchema);