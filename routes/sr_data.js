const express = require('express');
const moment = require('moment-timezone');
const moment2 = require('moment');
const Validator = require('jsonschema').Validator;

const SR_Schedules = require('../models/SR_Schedules')
const SR_Schedule_Details = require('../models/SR_Schedule_Details')
const SR_Steps = require('../models/SR_Step')
const authenticateJWT = require('../authMiddleware')
const srDataDetailSchema = require('../JSON SCHEMA/SR/dataDetail')
const srScheduleSchema = require('../JSON SCHEMA/SR/schedule')

const router = express.Router();
const Time = moment().tz(process.env.TZ).format('MM/DD/YYYY');

var listParentLot = [] // !nampung parent lot
var Tstart = '' //! waktu paling awal data
var Tend ='' //! waktu paling akhir dari data
var Tprocess = '' //! lama proses (Tend-Tstart) menit format
var deltaTime = {} // ! ini untuk nyimpen Delta T sama lama lama proses 
var totOutTime = 0
var totWIPTime = 0
const ObjectId = require('mongodb').ObjectId;

/**
 * * INSERT data
 * * GET list data
 * * GET data
 * * Function calculate
 * *    - calculate output /H
 * *    - calculate WIP
 */

function groupingLOT(data){
    //! clean global var
    listParentLot=[];

    var grouped = {};
    var mergeData = [];
    

    // ! ngeloop data
    data.forEach(function(obj) {
        if(grouped[obj.PARENT_LOT]!==''&&obj.PARENT_LOT!==""){
            // ! ini buat ngebentuk array sama masukin nama parent lot kedalem "listParentLot"
            if (!grouped[obj.PARENT_LOT]) {
                grouped[obj.PARENT_LOT] = [];

                listParentLot.push(obj.PARENT_LOT)
            }
            grouped[obj.PARENT_LOT].push(obj);
        }
    });

    // ! ini ngitung hold time 
    listParentLot.forEach(function(obj){
        var dataDetail = calculateHold(grouped[obj])
        mergeData.push(...dataDetail)
    })
    // var cleanData = groupingProcess(mergeData)
    return mergeData;
}

function calculateHold(dataGroup,timeHold=10){
    let result=[]
    if (dataGroup.length>1) {

        /**Order StepIn_Date data asc */
        var parentLOT = dataGroup.sort((date1, date2) => new Date(date1['StepIn_Date']) - new Date(date2['StepIn_Date']))
        for (let index = 0; index < dataGroup.length && index+1!==dataGroup.length ; index++) {
            var diffInMs = Math.abs(new Date(parentLOT[index]['StepOut_Date']) - new Date(parentLOT[index+1]['StepIn_Date']));
            var diffInMinutes = Math.floor((diffInMs/1000)/60);
        
            /** insert first index */
            if (index===0) {
                result.push(dataGroup[index])
            }
        
            /** Insert index n ot test */
            if (diffInMinutes<=timeHold) {
                result.push(dataGroup[index+1])
            } else {
                /** check StepOut_Date and StepIn_Date(index+1) */
                if (new Date(dataGroup[index]['StepOut_Date'])<new Date(dataGroup[index+1]['StepIn_Date'])) {
                /** copy and change value  */
                var holdObj={...dataGroup[index]}
                holdObj['StepID']="HOLD"
                holdObj['Step_Before']=dataGroup[index]['StepID']
                holdObj['Start_Hold']=dataGroup[index]['StepOut_Date']
                holdObj['Step_After']=dataGroup[index+1]['StepID']
                holdObj['End_Hold']=dataGroup[index+1]['StepIn_Date']
                
                result.push(holdObj)
                }
                result.push(dataGroup[index+1])
            }
        }
    }else{
        result=[...dataGroup]
    }
    return result
}

function groupingProcess(mergeData){
    var grouped = {};
    mergeData.forEach(function(obj) {
        if (!grouped[obj.PARENT_LOT]) {
            grouped[obj.PARENT_LOT] = [];
        }
        grouped[obj.PARENT_LOT].push(obj);
    });
    return grouped;
}

/** ==SET==
 * ! cal T for WIP (per row data) ==> deltaTime
 * ! cal T for out start s/d end (per parentLOT) ==> totalTime
 */
function cal_InfoT(cleanData){
    deltaTime={}
    listParentLot.forEach(element => {
        if(deltaTime[element]!==''){
            if (!deltaTime[element]) {
                deltaTime[element] = []
            }
            var arrEachProcess =[]
            var lenghtData = cleanData[element].length

            var groupTstart = moment2(cleanData[element][0]['StepIn_Date'],'MM/DD/YYYY hh:mm:ss a')
            var groupTend = moment2(cleanData[element][lenghtData-1]['StepOut_Date'],'MM/DD/YYYY hh:mm:ss a')
            var groupTotTime =  groupTend.diff(groupTstart,'minutes')
            totOutTime=totOutTime+groupTotTime
            // console.log(element+': '+groupTstart+' '+groupTend+' = '+groupTotTime)
            for (let index = 0; index < cleanData[element].length; index++) {
                var t1 = moment2(cleanData[element][index]['StepIn_Date'],'MM/DD/YYYY hh:mm:ss a')
                var t2 = moment2(cleanData[element][index]['StepOut_Date'],'MM/DD/YYYY hh:mm:ss a')

                // var cal = t2.diff(t1,'minutes')
                // totWIPTime=totWIPTime+cal
                // arrEachProcess.push(cal)
                if (t1.isValid() && t2.isValid()) {
                    var cal = t2.diff(t1,'minutes')
                    totWIPTime = totWIPTime + cal
                    arrEachProcess.push(cal)
                } else {
                    console.error(`Invalid date: ${cleanData[element][index]['StepIn_Date']} or ${cleanData[element][index]['StepOut_Date']}`);
                }
                console.log(cleanData[element][index]['StepID']+'--'+cleanData[element][index]['StepOut_Date']+'  -  '+cleanData[element][index]['StepIn_Date']+' = '+cal)
            }
            var timeInfo = {'deltaTime':arrEachProcess,'totalTime':groupTotTime}
            deltaTime[element].push(timeInfo)
        }
    });
}

//! SET Tstart, Tend, Tprocess
function cal__Time(raw_data){
    //! clean global var
    Tstart = '' 
    Tend ='' 
    Tprocess = '' 

    // ! ==== Tstate Tend ====
    raw_data.forEach(element => {
        if(Tstart==''){
            Tstart = element['StepIn_Date']
        }else{
            if(moment2(element['StepIn_Date'], "MM/DD/YYYY H:mm").isBefore(moment2(Tstart, "MM/DD/YYYY H:mm"))){
                Tstart = element['StepIn_Date']
            }
        }

        if(Tend==''){
            Tend = element['StepOut_Date']
        }else{
            if(moment2(element['StepOut_Date'], "MM/DD/YYYY H:mm").isAfter(moment2(Tend, "MM/DD/YYYY H:mm"))){
                Tend = element['StepOut_Date']
            }
        }
    });

    // ! ==== Tprocess ====
    var Tend_ = moment2(Tend, "MM/DD/YYYY H:mm")
    var Tstart_ = moment2(Tstart, "MM/DD/YYYY H:mm")

    Tprocess = Tend_.diff(Tstart_,'minutes')
}

//! Calculate Input, Output
function cal__InOut(cleanData){
    var result={}
    var totInput =0
    var totOut =0
    listParentLot.forEach(element => {
        for (let index = 0; index < cleanData[element].length; index++) {
            if (cleanData[element][index]['StepID']=='6360') {
                totInput+=1
            }
            if (cleanData[element][index]['StepID']=='6970') {
                totOut+=1
            }
        }
    })
    result={'Input':totInput,'Output':totOut}
    return result
}

//! Calculate Cycle Time
function cal__CycleTime (mergeData){
    const result = {};

    for (const item of mergeData) {
        const flow = item.FLOW;
        const stepInDate = new Date(item.StepIn_Date);
        const stepOutDate = new Date(item.StepOut_Date);
        // If this flow is not yet in the result object, add it with the current dates
        if (!result[flow]) {
            result[flow] = {
            earliestStepInDate: stepInDate,
            latestStepOutDate: stepOutDate,
            };
        } else {
            // If the current StepIn_Date is earlier than the current earliest, update it
            if (stepInDate < result[flow].earliestStepInDate) {
            result[flow].earliestStepInDate = stepInDate;
            }

            // If the current StepOut_Date is later than the current latest, update it
            if (stepOutDate > result[flow].latestStepOutDate) {
            result[flow].latestStepOutDate = stepOutDate;
            }
        }
    }
    return result
}

//============ API =============

router.post('/list', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { _page,_limit=10,_search} = req.body;
    
    try {
        var page = parseInt(_page) || 1; // ! Menentukan halaman saat ini
        var limit = parseInt(_limit) || 10; // ! Menentukan jumlah data per halaman default 10
        var skip = (page - 1) * _limit; // ! Menentukan jumlah data yang akan dilewati
        var search = _search; // ! Menentukan jumlah data yang akan dilewati

        var datas = await SR_Schedules.countDocuments() // jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }

        var listShedulingResult =[]
        var data=''

        if (search=="") {
            data = await SR_Schedules.find().sort({_id: -1}).skip(skip).limit(limit);
            
        }else{
            data = await SR_Schedules.find({planID: { $regex: search, $options:'i' }}).sort({_id: -1});
        }

        //! buat object masukin kedalem array
        listShedulingResult.push(
            data.map(item => (
                {
                    _id: item._id,
                    planID:item.planID,
                    created_at:item.created_at,
                    output:item.output,
                    WIP:item.WIP,
                    cycleTime:item.cycleTime,
                    input:item.input,
                }
            ))
        );
        listShedulingResult.push({'maxPage':maxPage})

        res.send(listShedulingResult)
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }

});

router.post('/insert', authenticateJWT, async (req, res) => {
    //! global variable
    listParentLot = [] 
    Tstart=''
    Tend=''
    Tprocess=''
    totWIPTime=0
    totOutTime=0

    

    var planID = req.body[0]['PlanID']
    var stepID_ = ''
    var created_at = Time
    var rawData = req.body
    var listofDetailId =[] //! ini list object id dari si SR_Schedule_Details

    // cal__Time(rawData)

    var data = groupingLOT(rawData) // ! data gelondongan yang udah ada hold process dna sudah di group per PARENT_LOT
    var resultCycleTime = cal__CycleTime(data)
    var grouData = groupingProcess(data) //! parameternya datamerge hasil groupingLOT
    var inOut_data = cal__InOut(grouData)
    
    // cal_InfoT(grouData)

    // var avgOutput = (totOutTime/Tprocess).toFixed(2)
    // var avgWIP = (totWIPTime/Tprocess).toFixed(2)

    // res.send({'WIP':totWIPTime.toString(),'Out':totOutTime.toString(),'Tprocess':Tprocess})
    // res.send('PlanID: '+planID+' successfully added')

    try {
        let steps = await SR_Steps.find()
        let findPlan = await SR_Schedules.find({planID:planID})

        if(findPlan.length===0){

             //! masukin data ke sr_schedules_details
            for (const detail of data) {

                let stepId = steps.find(obj => obj.StepID === detail.StepID.toString());
                stepID_ =  detail.StepID.toString()

                if (stepId == undefined && listofDetailId.length<=0) {
                    
                    throw new Error('StepID: '+stepID_+' doesn`t exists');

                }
                else if(stepId == undefined && listofDetailId.length>0) {

                    //! ini delete data yang udah masuk
                    let objectIdsToDelete = listofDetailId.map(id => new ObjectId(id));
                    await SR_Schedule_Details.deleteMany({_id: {$in: objectIdsToDelete}}); 

                    throw new Error('StepID: '+stepID_+' doesn`t exists');

                }
                else{
                    var v = new Validator();
                    var result = v.validate(
                        {
                            FLOW:detail.FLOW, 
                            PARENT_LOT:detail.PARENT_LOT, 
                            DEVICE:detail.DEVICE, 
                            PRODUCTID:detail.PRODUCTID,
                            StepID:stepId._id.toString(),
                            MachineID:detail.MachineID,
                            StepIn_Date:detail.StepIn_Date,
                            StepOut_Date:detail.StepOut_Date,
                            Quantity:detail.Quantity,
                            TT_CUST_SOD:detail.TT_CUST_SOD,
                            PlanID:detail.PlanID
                        }
                        , srDataDetailSchema);

                    if (result.valid==false) {
                        throw new Error("Detail data Invalid data");
                    }

                    const detaildata = new SR_Schedule_Details({
                        FLOW:detail.FLOW, 
                        PARENT_LOT:detail.PARENT_LOT, 
                        DEVICE:detail.DEVICE, 
                        PRODUCTID:detail.PRODUCTID,
                        StepID:stepId._id ||null,
                        MachineID:detail.MachineID,
                        StepIn_Date:detail.StepIn_Date,
                        StepOut_Date:detail.StepOut_Date,
                        Quantity:detail.Quantity,
                        TT_CUST_SOD:detail.TT_CUST_SOD,
                        PlanID:detail.PlanID
                    })
                    let detailId = await detaildata.save();
                    listofDetailId.push(detailId._id)

                }   
            }
            var data = listofDetailId
            var input = inOut_data.Input
            var output = inOut_data.Output
            var WIP = input-output
            var cycleTime = resultCycleTime
            // console.log(input,output)

            var v = new Validator();
            var result = v.validate(
                {data, planID, input, output, WIP, cycleTime, created_at}
                , srScheduleSchema);

            if (result.valid==false) {
                throw new Error("Schedule Invalid data");
            }

            const newData = new SR_Schedules({data, planID, input, output, WIP, cycleTime, created_at})
            await newData.save();

            res.send('PlanID: '+planID+' successfully added')
        }else{
            throw new Error('PlanID: '+planID+' already exists');
        }
        
    } catch (error) {
        let errorMessage;

        switch (error.message) {
            case 'PlanID: '+planID+' already exists':
                errorMessage = error.message;
                break;
            case 'StepID: '+stepID_+' doesn`t exists':
                errorMessage = error.message;
                break;
            default:
                errorMessage = error.message;
        }

        return res.status(400).json({ message: errorMessage });
    }
});

router.post('/data', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const {id} = req.body;
    try {
        let steps =  await SR_Steps.find()

        //! get data from sr_schedul_details
        let ArrDetailID =  await SR_Schedules.findById(id) //! array biasa bukan array of ObjectID
        let listObjectID = ArrDetailID.data.map(objId => new ObjectId(objId))
        
        let dataDetail =  await SR_Schedule_Details.find({_id:{$in:listObjectID}})
        
        let cleanData = dataDetail.map(ObjectA =>{
            let match = steps.find(ObjectB => ObjectB._id.toString()===ObjectA.StepID.toString())

            if (match){
                return {
                    "_id":ObjectA._id,
                    "FLOW":ObjectA.FLOW,
                    "PARENT_LOT":ObjectA.PARENT_LOT,
                    "DEVICE":ObjectA.DEVICE,
                    "PRODUCTID":ObjectA.PRODUCTID,
                    "StepID":match.StepID,
                    "MachineID":ObjectA.MachineID,
                    "StepIn_Date":ObjectA.StepIn_Date,
                    "StepOut_Date":ObjectA.StepOut_Date,
                    "Quantity":ObjectA.Quantity,
                    "TT_CUST_SOD":ObjectA.TT_CUST_SOD,
                    "PlanID":ObjectA.PlanID,
                }
            }else{
                return ObjectA
            }
        })
        return res.status(200).send({stat:'success',data:cleanData});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }

});

router.post('/delete', authenticateJWT, async (req, res) => {
    try {
        const result = await SR_Schedule_Details.deleteMany({});
        console.log(result.deletedCount + " documents deleted.");
        res.send('delete all')
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while trying to delete documents');
    }
});

// ! buat cek index sama delete
router.post('/testIndex', authenticateJWT,async (req, res) => {
    //     SR_Schedules.collection.getIndexes({full: true})
    // .then(indexes => {
    //     console.log("indexes:", indexes);
    // })
    // .catch(console.error);

    // SR_Schedules.collection.dropIndex("name_1")
    // .then(() => {
    //     console.log("Index dropped");
    // })
    // .catch(console.error);
    const {id} = req.body;
    res.send(id)
});
module.exports = router;