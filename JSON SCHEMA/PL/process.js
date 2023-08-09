var plProcessSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "processOrder":{"type": "number"},
        "processCode":{"type": "string"},
        "processName":{"type": "string"},
    },
    "required": ["processOrder","processCode","processName"]
}

module.exports = plProcessSchema;