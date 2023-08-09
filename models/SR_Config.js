const mongoose = require('mongoose');

const SR_ConfigSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    cards:{ type: Array, required: true},
    created_at:{type: String, required: true},
    created_by:{type: String, required: true},
    isActive:{type: Boolean, required: true},
    isDeleted:{type: Boolean, required: true},
    deleted_at:{type: String}
},{ versionKey: false });

module.exports = mongoose.model('sr_configs', SR_ConfigSchema);