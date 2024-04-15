const mongoose = require('mongoose');

const SR_Schedules = new mongoose.Schema({
    data: { type: Array, required: true },
    planID: { type: String, required: true },
    input:{type: Number,required: true},
    output:{ type: Number, required: true},
    WIP:{ type: Number, required: true},
    cycleTime:{type: Object, require: true},
    start_date:{ type: Number, required: true},
    end_date:{ type: Number, required: true},
    graphData:{type: Object, require: true},
    created_at:{type: String, required: true},
},{ versionKey: false });

module.exports = mongoose.model('sr_schedules', SR_Schedules);