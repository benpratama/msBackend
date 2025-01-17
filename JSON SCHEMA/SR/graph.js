var srGraph = {
    "id": "/MS_user",
    "type": "object",
    "properties":{
        "idSchedule":{"type": "string"},
        "graphData":{"type":"object"},
        "created_at":{"type": "string"},
    },
    "required": ["idSchedule","graphData","created_at"]
};

module.exports = srGraph;