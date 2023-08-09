var userSchema = {
    "id": "/MS_user",
    "type": "object",
    "properties":{
        "username":{"type": "string"},
        "password":{"type": "string"},
        "role_id":{"type":"string"},
        "created_at":{"type": "string"},
        "created_by":{"type": "string"},
        "deleted_at":{"type": "string"},
        "isDeleted":{"type": "boolean"},
    },
    "required": ["username","password","role_id","created_at","created_by"]
}

module.exports = userSchema;