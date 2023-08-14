var plConfigSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "name":{"type": "string"},
        "layout":{
            "type": "array",
            "properties":{
                "type":"object",
                "properties":{
                    "process":{"type": "string"},
                    "machine":{
                        "type": "array",
                        "properties":{
                            "machine_id":{"type": "string"},
                            "chambers":{"type": "array"}
                        },
                        "required": ["machine_id"]
                    }
                },
                "required": ["process"]
            }
        },
        "created_at":{"type": "string"},
        "isActive":{"type": "boolean"},
        "isDeleted":{"type": "boolean"},
        "deleted_at":{"type": "string"},
    },
    "required": ["name","layout","created_at","isActive","isDeleted"]
}

module.exports = plConfigSchema;