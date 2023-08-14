var plMachineSchema = {
    "id": "/MS_role",
    "type": "object",
    "properties":{
        "machineCode":{"type": "string"},
        "machineName":{"type": "string"},
        "machineType":{"type": "string"},
        "machineLocation":{"type": "string"},
        "machineTypeProcess":{"type": "string"}
    },
    "required": ["machineCode","machineName","machineType","machineLocation","machineTypeProcess"]
}

module.exports = plMachineSchema;