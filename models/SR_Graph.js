const mongoose = require('mongoose');

const SR_Graph = new mongoose.Schema({
    idSchedule:{ type: mongoose.ObjectId, required: true },
    graphData:{type: Object, require: true},
    created_at:{type: String, required: true},
    
},{ versionKey: false });

module.exports = mongoose.model('sr_graphs', SR_Graph);
