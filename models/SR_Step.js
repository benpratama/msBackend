const mongoose = require('mongoose');

const SR_Step = new mongoose.Schema({
    StepID: { type: String, required: true, unique: true },
    STEPDESCRIPTION:{ type: String, required: true, unique: true},
    isDeleted: { type:Boolean},
    deleted_at: { type: String}
},{ versionKey: false });


module.exports = mongoose.model('sr_steps', SR_Step);