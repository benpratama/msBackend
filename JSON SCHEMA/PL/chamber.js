var plChamberSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "chamberCode":{"type": "string"},
        "chamberName":{"type": "string"}
    },
    "required": ["chamberName","chamberCode"]
}

module.exports = plChamberSchema;