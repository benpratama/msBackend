const mongoose = require('mongoose');

const SR_ConfigSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    layout:{ type: Array, required: true},
    created_at:{type: String, required: true},
    created_by:{type: String, required: true},
    isActive:{type: Boolean, required: true},
    isDeleted:{type: Boolean, required: true},
    deleted_at:{type: String}
},{ versionKey: false });

module.exports = mongoose.model('pl_configs', SR_ConfigSchema);

//EX1
/**
 * 
 {
    "_id": {
        "$oid": "64b9ec55eb309f33ffc89a67"
    },
    "name": "PL-Config1",
    "layout": [
      {
        "process": {
          "$oid": "64b9ec55eb309f33ffc89a67"
        },
        "machineImg":"asdadasd.jpg",
        "machine": [
            {
                "machine_id": {"$oid":"64b0b46eeb309f33ffc899c4"},
                "chambers":[
                    {"$oid":"64b0b0e5eb309f33ffc899c0"},
                    {"$oid":"64b0b0e5eb309f33ffc899c1"},
                    {"$oid":"64b0b0e5eb309f33ffc899c2"}
                ]
            },
            {
                "machine_id": {"$oid":"64b0b4adeb309f33ffc899c5"},
                "chambers":[
                    {"$oid":"64b0b0e5eb309f33ffc899c0"},
                    {"$oid":"64b0b0e5eb309f33ffc899c1"},
                    {"$oid":"64b0b0e5eb309f33ffc899c2"}
                ]
            }
        ]
      },
      {
        "process": {
          "$oid": "64b0ac87eb309f33ffc899b8"
        },
        "machineImg":"asdadasd.jpg",
        "machine": [
            {
                "machine_id": {"$oid":"64b0b4e0eb309f33ffc899c6"},
                "chambers":[
                    {"$oid":"64b0b0e5eb309f33ffc899c0"},
                    {"$oid":"64b0b0e5eb309f33ffc899c1"},
                    {"$oid":"64b0b0e5eb309f33ffc899c2"}
                ]
            },
            {
                "machine_id": {"$oid":"64b0b5eaeb309f33ffc899cb"},
                "chambers":[
                    {"$oid":"64b0b0e5eb309f33ffc899c0"},
                    {"$oid":"64b0b0e5eb309f33ffc899c1"},
                    {"$oid":"64b0b0e5eb309f33ffc899c2"}
                ]
            }
        ]
      }
    ],
    "cretead_at": "07/21/2023",
    "isActive": true,
    "isDeleted": false
  }
 */

//EX2
/**
 {
    "name": "PL-Config1",
    "layout": [
      {
        "process": "64b9ec55eb309f33ffc89a67",
        "machine": [
            {
                "machine_id": "64b0b46eeb309f33ffc899c4",
                "chambers":[
                    "64b0b0e5eb309f33ffc899c0",
                    "64b0b0e5eb309f33ffc899c1",
                    "64b0b0e5eb309f33ffc899c2"
                ]
            },
            {
                "machine_id": "64b0b4adeb309f33ffc899c5",
                "chambers":[
                    "64b0b0e5eb309f33ffc899c0",
                    "64b0b0e5eb309f33ffc899c1",
                    "64b0b0e5eb309f33ffc899c2"
                ]
            }
        ]
      },
      {
        "process": "64b0ac87eb309f33ffc899b8",
        "machine": [
            {
                "machine_id": "64b0b4e0eb309f33ffc899c6",
                "chambers":[
                    "64b0b0e5eb309f33ffc899c0",
                    "64b0b0e5eb309f33ffc899c1",
                    "64b0b0e5eb309f33ffc899c2"
                ]
            },
            {
                "machine_id": "64b0b5eaeb309f33ffc899cb",
                "chambers":[
                    "64b0b0e5eb309f33ffc899c0",
                    "64b0b0e5eb309f33ffc899c1",
                    "64b0b0e5eb309f33ffc899c2"
                ]
            }
        ]
      }
    ]
  }
 */