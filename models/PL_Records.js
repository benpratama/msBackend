const mongoose = require('mongoose');

const SR_RecordSchema = new mongoose.Schema({
    Date:{ type: Date,required: true},
    PieceID:{ type: String,required: true},
    LOT_ID:{ type: String,required: true},

    WAFER_ID:{ type: Number,required: true},
    MACHINE_ID:{ type: mongoose.ObjectId,required: true},
    CHAMBER_ID:{ type: mongoose.ObjectId},

    DEVICE:{ type: String,required: true},
    MEASURE1:{ type: String},
    MEASURE1_VAL:{ type: Number},

    MEASURE2:{ type: String},
    MEASURE2_VAL:{ type: Number},
    RI:{ type: Number},

    GSI:{ type: Number},
    PORT:{ type: Number},

},{ versionKey: false });

module.exports = mongoose.model('pl_records', SR_RecordSchema);