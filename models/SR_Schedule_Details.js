const mongoose = require('mongoose');

const SR_Schedule_Details = new mongoose.Schema({
    FLOW: { type: String, required: true },
    PARENT_LOT: { type: String, required: true },
    DEVICE: { type: String, required: true },

    PRODUCTID: { type: String, required: true },
    StepID: { type: mongoose.ObjectId, required: true },
    MachineID: { type: String},

    StepIn_Date: { type: String, required: true },
    StepOut_Date: { type: String, required: true },
    Quantity: { type: Number, required: true },

    TT_CUST_SOD: { type: String, required: true },
    PlanID: { type: String, required: true },
},{ versionKey: false });

module.exports = mongoose.model('sr_schedule_details', SR_Schedule_Details);