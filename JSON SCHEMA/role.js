var roleSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "name":{"type": "string"}
    },
    "required": ["name"]
}

module.exports = roleSchema;