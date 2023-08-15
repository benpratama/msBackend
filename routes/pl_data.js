require('dotenv').config()

const express = require('express');
// const moment = require('moment');
const moment = require('moment-timezone');
const authenticateJWT = require('../authMiddleware')

const PL_Records = require('../models/PL_Records')
const PL_Machine = require('../models/PL_Machine')
const PL_Chamber = require('../models/PL_Chamber')

const router = express.Router();
const { ObjectId } = require('mongodb');
const keysToCheck = ['Date', 'PieceID', 'LOT_ID','WAFER_ID','MACHINE_ID','DEVICE'];


async function checkConvertData(rawData){
    const Machines =  await PL_Machine.find()
    const Chambers =  await PL_Chamber.find()
    var cleanData = []
    for (const data of rawData) {
        const hasNull = keysToCheck.some(key => data[key] === null);

        if (hasNull==true) { //! ini kalo ada data yang null
            return hasNull
        }else{
            var Machine = Machines.find(machineObj => machineObj.machineCode === data['MACHINE_ID']);

            if (data['CHAMBER_ID']!== null && data['CHAMBER_ID']!==''){
                var CHObj = Chambers.find(chamberObj => chamberObj.chamberCode === data['CHAMBER_ID'] && chamberObj.chamberTypeProcess.toString()===Machine.machineTypeProcess.toString() );
                if (CHObj === undefined) {
                    return true
                }
                var Chamber = CHObj._id
            }else{
                var Chamber = null
            }

            if (Machine === undefined) {
                return true
            }
            cleanData.push({
                "Date":data['Date'],
                "PieceID":data['PieceID'],
                'LOT_ID':data['PieceID'],
                "WAFER_ID":data['WAFER_ID'],
                "MACHINE_ID":Machine._id,
                "CHAMBER_ID":Chamber,
                "DEVICE":data['DEVICE'],
                "MEASURE1":data['MEASURE1'],
                "MEASURE1_VAL":data['MEASURE1_VAL'],
                "MEASURE2":data['MEASURE2'],
                "MEASURE2_VAL":data['MEASURE2_VAL'],
                "RI":data['RI'],
                "GSI":data['GSI']
            })
        }
    }
    return cleanData
}

router.post('/insert', authenticateJWT, async (req, res) => {
    var rawData = req.body
    checkConvertData(rawData).then(data=>{
        if (data==true) {
            return res.status(200).send({stat:'failed',data:'data Error'});
        }else{
            for (const cleanObj of data) {

                var Date = moment.tz(cleanObj.Date, "MM/DD/YYYY hh:mm A", "Asia/Taipei")
                var PieceID = cleanObj.PieceID
                var LOT_ID = cleanObj.LOT_ID
                var WAFER_ID = cleanObj.WAFER_ID
        
                var MACHINE_ID = cleanObj.MACHINE_ID
                var CHAMBER_ID = cleanObj.CHAMBER_ID
                var DEVICE = cleanObj.DEVICE
                var MEASURE1 = cleanObj.MEASURE1
                var MEASURE1_VAL = cleanObj.MEASURE1_VAL
        
                var MEASURE2 = cleanObj.MEASURE2
                var MEASURE2_VAL = cleanObj.MEASURE2_VAL
                var RI = cleanObj.RI
                var GSI = cleanObj.GSI
                
                var newData = new PL_Records(
                    {
                        Date, PieceID, LOT_ID, 
                        WAFER_ID ,MACHINE_ID, CHAMBER_ID, 
                        DEVICE, MEASURE1, MEASURE1_VAL,
                        MEASURE2, MEASURE2_VAL, RI, GSI
                    }
                )
                newData.save();
            }
            return res.status(200).send({stat:'success',data:'data added'});
        }
    })
})

router.post('/filter', authenticateJWT, async (req, res) => {
    const Machines =  await PL_Machine.find()
    const Chambers =  await PL_Chamber.find()

    var date = req.body
    var cleanData=[]

    var startDate = moment(date.startDate,'MM/DD/YYYY hh:mm:ss a')
    var endDate = moment(date.endDate,'MM/DD/YYYY hh:mm:ss a')

    var records = await PL_Records.find({
        Date:{
            $gte: startDate,
            $lte: endDate
        }
    });

    if (records.length<=0) {
        return res.status(200).send({stat:'failed',data:'data not found'});
    }

    for (const record of records) {
    
        var MachineData = Machines.find(machineObj => machineObj._id.equals(new ObjectId(record['MACHINE_ID'])));
        
        if (record['CHAMBER_ID']!==null) {
            var Chamber_obj =Chambers.find(chamberObj => chamberObj._id.equals(new ObjectId(record['CHAMBER_ID'])));
            var ChamberData = Chamber_obj.chamberCode
        } else {
            var ChamberData = record['CHAMBER_ID']
        }

        cleanData.push(
            {
                "_id":record._id,
                "Date":record.Date,
                "PieceID":record.PieceID,
                "LOT_ID":record.LOT_ID,
                "WAFER_ID":record.WAFER_ID,
                "MACHINE_ID":MachineData.machineCode,
                "CHAMBER_ID":ChamberData,
                "DEVICE":record.DEVICE,
                "MEASURE1": record.MEASURE1,
                "MEASURE1_VAL": record.MEASURE1_VAL,
                "MEASURE2": record.MEASURE2,
                "MEASURE2_VAL": record.MEASURE2_VAL,
                "RI": record.RI,
                "GSI": record.GSI
            }
        )
    }
    
    return res.status(200).send({stat:'success',data:cleanData,count:cleanData.length});
})

router.post('/delete', authenticateJWT, async (req, res) => {
    try {
        const result = await PL_Records.deleteMany({});
        console.log(result.deletedCount + " documents deleted.");
        res.send('delete all')
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while trying to delete documents');
    }
});



module.exports = router;