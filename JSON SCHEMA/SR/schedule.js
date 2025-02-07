var srScheduleSchema = {
    "id": "/MS_user",
    "type": "object",
    "properties":{
        "data":{"type": "array"},
        "planID":{"type": "string"},
        "input":{"type":"number"},
        "output":{"type": "number"},
        "WIP":{"type": "number"},
        "cycleTime":{"type": "object"},
        "start_date":{"type": "number"},
        "end_date":{"type": "number"},
        // "graphData":{"type":"object"},
        "created_at":{"type": "string"},
    },
    "required": ["data","planID","input","output","WIP","cycleTime","created_at"]
}

module.exports = srScheduleSchema;