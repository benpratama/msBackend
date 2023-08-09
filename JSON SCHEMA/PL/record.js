var plConfigSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "Date":{"type": "date"},
        "PieceID":{"type": "string"},
        "LOT_ID":{"type": "string"},

        "WAFER_ID":{"type": "number"},
        "MACHINE_ID":{"type": "string"},
        "CHAMBER_ID":{"type": "string"},

        "DEVICE":{"type": "string"},
        "MEASURE1":{"type": "string"},
        "MEASURE1_VAL":{"type": "number"},

        "MEASURE2":{"type": "string"},
        "MEASURE2_VAL":{"type": "number"},
        "RI":{"type": "number"},

        "GSI":{"type": "number"},
    },
    "required": ["Date","PieceID","LOT_ID","WAFER_ID","MACHINE_ID","DEVICE"]
}

module.exports = plConfigSchema;