var srConfigSchema = {
    "id": "/MS_user",
    "type": "object",
    "properties":{
        "name":{"type": "string"},
        "cards":{"type": "array"},
        "created_at":{"type": "string"},
        "created_by":{"type": "string"},
        "isActive":{"type": "boolean"},
        "isDeleted":{"type": "boolean"},
    },
    "required": ["name","cards","created_at","created_by","isActive","isDeleted"]
}

module.exports = srConfigSchema;