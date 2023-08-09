var srStepSchema = {
    "id": "/SR_Step",
    "type": "object",
    "properties":{
        "StepID":{"type": "string"},
        "STEPDESCRIPTION":{"type": "string"},
        "isDeleted":{"type": "boolean"},
        "deleted_at":{"type": "string"}
    },
    "required": ["StepID","STEPDESCRIPTION"]
};

module.exports = srStepSchema;