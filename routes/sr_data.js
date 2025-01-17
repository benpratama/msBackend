const express = require('express');
const moment = require('moment-timezone');
const moment2 = require('moment');
const Validator = require('jsonschema').Validator;

const SR_Schedules = require('../models/SR_Schedules')
const SR_Graph = require('../models/SR_Graph')
const SR_Schedule_Details = require('../models/SR_Schedule_Details')
const SR_Steps = require('../models/SR_Step')
const authenticateJWT = require('../authMiddleware')
const srGraph = require('../JSON SCHEMA/SR/graph')
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
    console.log("groupingLOT")
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
    console.log("calculateHold")
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
    console.log("groupingProcess")
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
    console.log("cal__InOut")
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
    console.log("cal__CycleTime")
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

function adjustMinutesAndFormatISO(dateString, minutes) {
    console.log("adjustMinutesAndFormatISO")
    // Parse the ISO date string
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid date format. Expected ISO 8601 format.';
    }

    // Adjust minutes
    date.setMinutes(date.getMinutes() + minutes);

    // Format the date back to MM/DD/YYYY HH:mm
    const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    return formattedDate;
}

// buat bikin timeseriess data
function generateTimeSeries(start, end, intervalMinutes) {
    console.log("generateTimeSeries")
    let startTime = new Date(start);
    const endTime = new Date(end);
    const timeSeries = {};

    while (startTime <= endTime) {
        // Format the current time
        const formattedTime = `${(startTime.getMonth() + 1).toString().padStart(2, '0')}/${startTime.getDate().toString().padStart(2, '0')}/${startTime.getFullYear()} ${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Add to dictionary with count 0
        timeSeries[formattedTime] = { count: 0 };

        // Add interval
        startTime = new Date(startTime.getTime() + intervalMinutes * 60000);
    }

    // Check if the last interval surpasses the end time and add it if it doesn't
    if (startTime > endTime) {
        const lastTime = `${(endTime.getMonth() + 1).toString().padStart(2, '0')}/${endTime.getDate().toString().padStart(2, '0')}/${endTime.getFullYear()} ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
        timeSeries[lastTime] = { count: 0 };
    }

    return timeSeries;
}

function incrementCount(dictionary, list_time) {
    console.log("incrementCount")
    for (let index = 0; index < list_time.length; index++) {
        const date = new Date(list_time[index]);
        Object.keys(dictionary).forEach((timeKey) => {
            const startTime = new Date(timeKey);
            const endTimeKey = Object.keys(dictionary).find(key => new Date(key) > startTime);
            const endTime = endTimeKey ? new Date(endTimeKey) : new Date(startTime.getTime() + 6 * 60000); // Assumes 6 minute intervals as per your example
            
            // Check if the provided date falls within the current start and end time
            if (date >= startTime && date < endTime) {
            dictionary[timeKey].count += 1; // Increment the count
            }
        });
    }
    return dictionary;
    
}

function transformDictionaryToArrays(dictionary) {
console.log(transformDictionaryToArrays)
    const result = { time: [], count: [] };

    for (const [key, value] of Object.entries(dictionary)) {
        // Parse the date-time string and convert to milliseconds
        const [datePart, timePart] = key.split(' ');
        const [month, day, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        const date = new Date(year, month - 1, day, hours, minutes);
        const timeInMilliseconds = date.getTime();

        result.time.push(key);
        result.count.push(value.count);
    }
    return result;
}

function mergeDictionaries(baseDict, mergeDict) {
    console.log("mergeDictionaries")
    // Iterate over the keys in the mergeDict
    for (const key in mergeDict) {
        if (mergeDict.hasOwnProperty(key)) {
            // If the key exists in baseDict, update the count
            if (baseDict.hasOwnProperty(key)) {
                baseDict[key].count += mergeDict[key].count;
            } else {
                // Optional: Add the key to baseDict if it doesn't exist
                baseDict[key] = mergeDict[key];
            }
        }
    }
    return baseDict;
}

function graph_Out(cleanData,minute){
    console.log("graph_Out")
    let earliestStepIn = new Date('12-31-9999');
    let latestStepOut = new Date('01-01-0000');
    let interval = minute
    var dic_result = {}
    var list_time = []

    Object.values(cleanData).forEach(group => {
        group.forEach(entry => {
          const stepInDate = new Date(entry.StepIn_Date);
          const stepOutDate = new Date(entry.StepOut_Date);
      
          if (stepInDate < earliestStepIn) {
            earliestStepIn = stepInDate;
          }
      
          if (stepOutDate > latestStepOut) {
            latestStepOut = stepOutDate;
          }
        });
    });

    const start_time = adjustMinutesAndFormatISO(earliestStepIn,0);
    const end_time = adjustMinutesAndFormatISO(latestStepOut,0);

    const based_time_dictionary = generateTimeSeries(start_time, end_time, interval);

    const time_dictionary = generateTimeSeries(start_time, end_time, interval);

    listParentLot.forEach(element => {
        for (let index = 0; index < cleanData[element].length; index++) {
            if (cleanData[element][index]['StepID']=='6970') {
                let time = cleanData[element][index]['StepOut_Date']
                list_time.push(time)
            }else{
                dic_result= time_dictionary
            }
        }
    })
    dic_result = incrementCount(time_dictionary,list_time)
    const mergedDict = mergeDictionaries(based_time_dictionary, dic_result);
    
    let final_result = transformDictionaryToArrays(mergedDict)
    return final_result
}

function graph_In(cleanData,minute){
    console.log("graph_In")
    let earliestStepIn = new Date('12-31-9999');
    let latestStepOut = new Date('01-01-0000');
    let interval = minute
    var dic_result = {}
    var list_time = []

    Object.values(cleanData).forEach(group => {
        group.forEach(entry => {
          const stepInDate = new Date(entry.StepIn_Date);
          const stepOutDate = new Date(entry.StepOut_Date);
      
          if (stepInDate < earliestStepIn) {
            earliestStepIn = stepInDate;
          }
      
          if (stepOutDate > latestStepOut) {
            latestStepOut = stepOutDate;
          }
        });
    });

    const start_time = adjustMinutesAndFormatISO(earliestStepIn,0);
    const end_time = adjustMinutesAndFormatISO(latestStepOut,0);

    const based_time_dictionary = generateTimeSeries(start_time, end_time, interval);

    const time_dictionary = generateTimeSeries(start_time, end_time, interval);

    listParentLot.forEach(element => {
        for (let index = 0; index < cleanData[element].length; index++) {
            if (cleanData[element][index]['StepID']=='6360') {
                let time = cleanData[element][index]['StepIn_Date']
                list_time.push(time)
                
            }
        }
    })
    dic_result = incrementCount(time_dictionary,list_time)
    const mergedDict = mergeDictionaries(based_time_dictionary, dic_result);

    let final_result = transformDictionaryToArrays(mergedDict)
    
    return final_result
}

function graph_WIP(cleanData,minute){
    console.log("graph_WIP")
    let earliestStepIn = new Date('12-31-9999');
    let latestStepOut = new Date('01-01-0000');
    let interval = minute
    var dic_result = {}

    //! ini ambil StepInDate sama StepOutDate
    Object.values(cleanData).forEach(group => {
        group.forEach(entry => {
          const stepInDate = new Date(entry.StepIn_Date);
          const stepOutDate = new Date(entry.StepOut_Date);
      
          if (stepInDate < earliestStepIn) {
            earliestStepIn = stepInDate;
          }
      
          if (stepOutDate > latestStepOut) {
            latestStepOut = stepOutDate;
          }
        });
    });

    const start_time = adjustMinutesAndFormatISO(earliestStepIn,0);
    const end_time = adjustMinutesAndFormatISO(latestStepOut,0);

    const based_time_dictionary = generateTimeSeries(start_time, end_time, interval);

    const time_dictionary = generateTimeSeries(start_time, end_time, interval);

    for (const key in cleanData) {
        if (cleanData.hasOwnProperty(key)) {
            // Iterate over each entry in the array for this key
            cleanData[key].forEach(entry => {
                const stepIn = new Date(entry.StepID=="HOLD"?entry.Start_Hold:entry.StepIn_Date);
                const stepOut = new Date(entry.StepID=="HOLD"?entry.End_Hold:entry.StepOut_Date);
                // Iterate over each key in the dictionary
                for (const dictKey in time_dictionary) {
                    if (time_dictionary.hasOwnProperty(dictKey)) {
                        const dictDate = new Date(dictKey);

                        if (dictDate >= stepIn && dictDate <= stepOut) {
                            // console.log(stepIn+' '+entry.StepID)
                            time_dictionary[dictKey].count += 1;
                        }
                        
                    }
                }
            });
        }
    }
    const mergedDict = mergeDictionaries(based_time_dictionary, time_dictionary);

    let final_result = transformDictionaryToArrays(mergedDict)
    return final_result
}

function calculateDifference(dataObject) {
    console.log("calculateDifference")
    const { count, data_WIP } = dataObject;

    // Check if both arrays have the same length
    if (count.length !== data_WIP.length) {
        console.error("Arrays have different lengths");
        return null;
    }

    // Calculate the difference
    const difference = data_WIP.map((value, index) => value - count[index]);

    delete dataObject.data_WIP

    let newKeyName = "data_WIP";
    dataObject[newKeyName] = difference;

    return dataObject;
}

function dateToInteger(dateString) {
    console.log("dateToInteger")
    const date = new Date(dateString);
    return date.getTime();
}

function incrementData_INOUT(data){
    console.log("incrementData_INOUT")
    var temp = []
    for (let index = 0; index < data.length; index++) {
        if(index==0){
            temp.push(data[index])
        }else{
            // var cal=
            temp.push(((temp[index-1])+data[index]))
        }
    }
    return temp
}

function inccrement_WIP(dataIn,dataOut){
    console.log("inccrement_WIP")
    var result = []
    for (let index = 0; index < dataIn.length; index++) {
        result.push(dataIn[index]-dataOut[index])
    }
    return result
}

function initialWIPCalculation(cleanData){
    console.log("initialWIPCalculation")
    var listID=[]
    listParentLot.forEach(element => {
        for (let index = 0; index < 1; index++) {
            // if (new Date(cleanData[element][index]['StepIn_Date']).getTime()===earliestStepIn.getTime()) {
            //     let lotID = cleanData[element][index]['PARENT_LOT']
            //     listID.push(lotID)
            // }
            if(cleanData[element][index]['StepID']!==6360){
                let lotID = cleanData[element][index]['PARENT_LOT']
                listID.push(lotID)
            }
        }
    })
    return listID.length
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
    var inOut_data = cal__InOut(grouData) //! tampilin jumlah data yang ditable depan
    
    var graph_data = graph_Out(grouData,6) //! ini tanggalnya + sama data out (key "count")
    var graphIn_data = graph_In(grouData,6) //! ini data IN ( 6360) 
    var graphWIP_data = graph_WIP(grouData,6) //! ini data WIP
    var initialWIP = initialWIPCalculation(grouData)
    
    //! masukin array in sama WIP kedalem graph_data
    let newKeyName = "data_in";
    graph_data[newKeyName] = graphIn_data.count;

    let newKeyName2 = "data_WIP";
    graph_data[newKeyName2] = graphWIP_data.count;

    var result_dictionary = calculateDifference(graph_data) //! data graph

    let newKeyName_in = "increment_in";
    result_dictionary[newKeyName_in] = incrementData_INOUT(result_dictionary.data_in)

    let newKeyName_out = "increment_out";
    result_dictionary[newKeyName_out] = incrementData_INOUT(result_dictionary.count)    

    let newKeyName_wip = "increment_wip";
    result_dictionary[newKeyName_wip] = inccrement_WIP(result_dictionary.increment_in,result_dictionary.increment_out)    

    var start_date_data = dateToInteger(result_dictionary.time[0])
    var end_date_data = dateToInteger(result_dictionary.time[result_dictionary.time.length-1])

    // !!!!DARI SINI !!!!
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
                            PlanID:detail.PlanID,
                            Step_Before:detail.Step_Before,
                            Step_After:detail.Step_After,
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
                        StepIn_Date:detail.StepID!='HOLD'?detail.StepIn_Date:detail.Start_Hold,
                        StepOut_Date:detail.StepID!='HOLD'?detail.StepOut_Date:detail.End_Hold,
                        Quantity:detail.Quantity,
                        TT_CUST_SOD:detail.TT_CUST_SOD,
                        PlanID:detail.PlanID,
                        Step_Before:detail.StepID!='HOLD'?'':detail.Step_Before,
                        Step_After:detail.StepID!='HOLD'?'':detail.Step_After,
                    })
                    let detailId = await detaildata.save();
                    listofDetailId.push(detailId._id)

                }   
            }
            
            var data = listofDetailId
            // var input = inOut_data.Input
            var input = initialWIP //! INITIAL WIP
            var output = inOut_data.Output
            var WIP = inOut_data.Input-inOut_data.Output
            var cycleTime = resultCycleTime
            var start_date = start_date_data
            var end_date = end_date_data
            var graphData = result_dictionary

            var v = new Validator();
            var result = v.validate(
                // {data, planID, input, output, WIP, cycleTime, start_date, end_date, graphData,created_at}
                {data, planID, input, output, WIP, cycleTime, start_date, end_date, created_at}
                , srScheduleSchema);

            if (result.valid==false) {
                throw new Error("Schedule Invalid data");
            }

            // const newData = new SR_Schedules({data, planID, input, output, WIP, cycleTime, start_date, end_date, graphData ,created_at})
            const newData = new SR_Schedules({data, planID, input, output, WIP, cycleTime, start_date, end_date, created_at})
            await newData.save();

            //! dari sini --> graph
            var idSchedule = newData._id.toString()

            var v = new Validator();
            var result = v.validate(
                // {data, planID, input, output, WIP, cycleTime, start_date, end_date, graphData,created_at}
                {idSchedule,graphData, created_at}
                , srGraph);

            if (result.valid==false) {
                throw new Error("Schedule Invalid data");
            }

            const newDataGraph = new SR_Graph({idSchedule, graphData, created_at})
            await newDataGraph.save();

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
    //!!! SAMPE SINI !!!
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
                    "Step_Before":ObjectA.Step_Before,
                    "Step_After":ObjectA.Step_After
                }
            }else{
                return ObjectA
            }
        })
        return res.status(200).send({stat:'success',data:cleanData, graphData:ArrDetailID.graphData, start_date:ArrDetailID.start_date, end_date:ArrDetailID.end_date, id_schedule:id});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }

});

router.post('/graphdata', authenticateJWT, async (req, res) => {
    //! ini yang pake hitungan
    // jadi ini bisa update berdasarkan interval di frontend
    // try {
    //     const minute = req.body.minute
    //     const id = req.body.id

    //     let steps =  await SR_Steps.find()

    //     //! get data from sr_schedul_details
    //     let ArrDetailID =  await SR_Schedules.findById(id) //! array biasa bukan array of ObjectID
    //     let listObjectID = ArrDetailID.data.map(objId => new ObjectId(objId))

    //     let dataDetail =  await SR_Schedule_Details.find({_id:{$in:listObjectID}})

    //     let cleanData = dataDetail.map(ObjectA =>{
    //         let match = steps.find(ObjectB => ObjectB._id.toString()===ObjectA.StepID.toString())

    //         if (match){
    //             return {
    //                 "_id":ObjectA._id,
    //                 "FLOW":ObjectA.FLOW,
    //                 "PARENT_LOT":ObjectA.PARENT_LOT,
    //                 "DEVICE":ObjectA.DEVICE,
    //                 "PRODUCTID":ObjectA.PRODUCTID,
    //                 "StepID":match.StepID,
    //                 "MachineID":ObjectA.MachineID,
    //                 "StepIn_Date":ObjectA.StepIn_Date,
    //                 "StepOut_Date":ObjectA.StepOut_Date,
    //                 "Quantity":ObjectA.Quantity,
    //                 "TT_CUST_SOD":ObjectA.TT_CUST_SOD,
    //                 "PlanID":ObjectA.PlanID,
    //             }
    //         }else{
    //             return ObjectA
    //         }
            
    //     })

    //     var data = groupingLOT(cleanData)
    //     var grouData = groupingProcess(data)

        
    //     var graph_data = graph_Out(grouData,minute)
    //     var graphIn_data = graph_In(grouData,minute)
    //     var graphWIP_data = graph_WIP(grouData,minute)

    //     let newKeyName = "data_in";
    //     graph_data[newKeyName] = graphIn_data.count;

    //     let newKeyName2 = "data_WIP";
    //     graph_data[newKeyName2] = graphWIP_data.count;

    //     var result_dictionary = calculateDifference(graph_data)
    //     res.send(result_dictionary)
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).send('An error occurred while trying to delete documents');
    // }

    const {id} = req.body;
    const date = req.body.date;
    const last_index=1000
    
    try {
        let rawData =  await SR_Graph.find({idSchedule:{$in:id}})
        // var dataLength = rawData[0].graphData.time.length
        // var index = rawData[0].graphData.time.indexOf(date.trim())
        // var time = rawData[0].graphData.time.slice(index,(dataLength+index))
        // var count = rawData[0].graphData.count.slice(index,(dataLength+index))
        // var data_in = rawData[0].graphData.data_in.slice(index,(dataLength+index))
        // var data_WIP = rawData[0].graphData.data_WIP.slice(index,(dataLength+index))
        // var data_increment_In = rawData[0].graphData.increment_in.slice(index,(dataLength+index))
        // var data_increment_Out = rawData[0].graphData.increment_out.slice(index,(dataLength+index))
        // var lastDate = rawData[0].graphData.time[(dataLength+index)]

        var dataLength = rawData[0].graphData.time.length
        // var index = rawData[0].graphData.time.indexOf(date.trim())
        var time = rawData[0].graphData.time
        var count = rawData[0].graphData.count
        var data_in = rawData[0].graphData.data_in
        var data_WIP = rawData[0].graphData.data_WIP

        var data_increment_In = rawData[0].graphData.increment_in
        var data_increment_Out = rawData[0].graphData.increment_out
        var data_increment_WIP_Total = rawData[0].graphData.increment_wip

        var lastDate = rawData[0].graphData.time[(dataLength)]

        if(lastDate===undefined){
            var lastDate = rawData[0].graphData.time[dataLength-1]
        }

        var graphData={
            "time":time,
            "count":count,
            "data_in":data_in,
            "data_WIP":data_WIP,
            "increment_in":data_increment_In,
            "increment_out":data_increment_Out,
            "increment_WIP_total":data_increment_WIP_Total
        }

        return res.status(200).send({stat:'success',graphData:graphData,dataLength:dataLength,lastDate:lastDate});
    } catch (error) {
        return res.status(200).send(error.message);
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

router.post('/deleteitem', authenticateJWT, async (req, res) => {
    try {
        const planID = req.body.planID

        let data =  await SR_Schedules.findOne({"planID":planID})
        let schedule_id =data._id
        let detail_data = data.data

        for (let index = 0; index < detail_data.length; index++) {
            await SR_Schedule_Details.deleteOne({_id: new ObjectId(detail_data[index])})
            // console.log(detail_data[index])
        }
        await SR_Schedules.deleteOne({"planID":planID})
        await SR_Graph.deleteOne({"idSchedule":schedule_id})
        res.send(planID+" deleted")
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