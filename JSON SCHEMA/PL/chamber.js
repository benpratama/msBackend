var plChamberSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "chamberCode":{"type": "string"},
        "chamberName":{"type": "string"},
        "chamberTypeProcess":{"type": "string"}
    },
    "required": ["chamberName","chamberCode","chamberTypeProcess"]
}

module.exports = plChamberSchema;