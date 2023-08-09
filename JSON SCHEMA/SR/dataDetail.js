var srDataDetailSchema = {
    "id": "/MS_user",
    "type": "object",
    "properties":{
        "FLOW":{"type": "string"},
        "PARENT_LOT":{"type": "string"},
        "DEVICE":{"type": "string"},

        "PRODUCTID":{"type": "string"},
        "StepID":{"type": "string"},
        "MachineID":{"type": "string"},

        "StepIn_Date":{"type": "string"},
        "StepOut_Date":{"type": "string"},
        "Quantity":{"type": "number"},

        "TT_CUST_SOD":{"type": "string"},
        "PlanID":{"type": "string"},
    },
    "required": ["FLOW","PARENT_LOT","DEVICE","PRODUCTID","StepID","MachineID",
                "StepIn_Date","StepOut_Date","Quantity","TT_CUST_SOD", "PlanID"
                ]
}

module.exports = srDataDetailSchema;