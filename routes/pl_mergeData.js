const express = require('express');
const multer = require('multer');
const cors = require('cors');
const xlsx = require('xlsx');
const _ = require('lodash');
const moment = require('moment');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });
const authenticateJWT = require('../authMiddleware')

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set(['xls', 'xlsx']);

function allowedFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
}

function sput(fileStream) {
    
    const workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    const sputSheetName = '工作表5'; //define sheet

    const sputSheet = workbook.Sheets[sputSheetName]; //select sheet
    const sputData = xlsx.utils.sheet_to_json(sputSheet, { defval: "" });
    // // Remove rows where all values are null or empty
    const sputData_ = sputData.filter(row => Object.values(row).some(value => value !== null && value !== ''));

    // // Get unique LOT_ID
    let lotIdSput = _.uniq(sputData_.filter(row => row['DESCRPTION'] === 'Mean to METROLOGY_RS : AVG').map(row => row['FIELD_4']));


    // // Filter sputData_
    let sputData_Raw = sputData_.filter(row => lotIdSput.includes(row['FIELD_4']) && row['DESCRPTION'] === 'Mean to METROLOGY_RS : AVG');

    let sputLotId = sputData_Raw.map(row => row['FIELD_4']);
    let sputDate = sputData_Raw.map(row => row['TIMETAG']);
    let sputMachineIdEtch = sputData_Raw.map(row => row['SPUT_TOOL']);
    let sputPieceId = sputData_Raw.map(row => row['PIECEID']);
    let sputWaferId = sputData_Raw.map(row => row['FIELD_5']);
    let sputChamberEtch = Array(sputData_Raw.length).fill(null);
    let sputDeviceId = sputData_Raw.map(row => row['FIELD_7']);
    let sputRi = sputData_Raw.map(row => row['RI']);

    let sputMeasureType1 = Array(sputData_Raw.length).fill('Rs');
    let sputNn1 = sputData_Raw.map(row => row['NN']);
    let sputMeasureType2 = Array(sputData_Raw.length).fill(null);
    let sputNn2 = Array(sputData_Raw.length).fill(null);
    
    let sputGSI = sputData_Raw.map(row => row.GSI);
    let sputPort = sputData_Raw.map(row => row.PORT_ID);

    return [sputLotId, sputDate, sputMachineIdEtch, sputPieceId, sputWaferId, sputChamberEtch, sputDeviceId, sputRi, sputMeasureType1, sputNn1, sputMeasureType2, sputNn2,sputGSI,sputPort];
}

function plate(fileStream){
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let plat_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['工作表3']);
    let LOT_ID_plat = _.uniq(plat_Exl.filter(row => row.Layer === 'UBM').map(row => row.FIELD_2));

    let plat_Data_Raw = plat_Exl.filter(row => LOT_ID_plat.includes(row.FIELD_2) && row.Layer === 'UBM');

    let plat_LOT_ID = plat_Data_Raw.map(row => row.FIELD_2);
    let plat_Date = plat_Data_Raw.map(row => row.TIMETAG);
    let plat_MACHINE_ID_ETCH = plat_Data_Raw.map(row => row['Machine ID']);
    let plat_PIECEID = plat_Data_Raw.map(row => row.PIECEID);
    let plat_WAFER_ID = plat_Data_Raw.map(row => row.FIELD_3);
    let plat_CHAMBER_ETCH = plat_Data_Raw.map(row => row['Chamber ID']);
    let plat_DEVICE_ID = plat_Data_Raw.map(row => row.FIELD_5);
    let plat_RI = plat_Data_Raw.map(row => row.RI);

    let plat_MeasureType_1 = new Array(plat_Data_Raw.length).fill("THK");
    let plat_NN_1 = plat_Data_Raw.map(row => row.NN);
    let plat_MeasureType_2 = new Array(plat_Data_Raw.length).fill(null);
    let plat_NN_2 = new Array(plat_Data_Raw.length).fill(null);

    let plat_GSI = plat_Data_Raw.map(row => row.GSI);
    let platePort = plat_Data_Raw.map(row => row.PORT_ID);

    return [plat_LOT_ID,plat_Date,plat_MACHINE_ID_ETCH,plat_PIECEID,plat_WAFER_ID,plat_CHAMBER_ETCH,plat_DEVICE_ID,plat_RI,plat_MeasureType_1,plat_NN_1,plat_MeasureType_2,plat_NN_2,plat_GSI,platePort];
}

function PR_Coat(fileStream){
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let PR_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['工作表2']);

    let LOT_ID3 = _.uniq(PR_Exl.filter(row => row.FIELD_6 === 'UBM' && row.MEASURE !== null).map(row => row.FIELD_1));

    let PR_Data_Raw = PR_Exl.filter(row => LOT_ID3.includes(row.FIELD_1) && row.MEASURE !== null && row.FIELD_6 === 'UBM');

    let coat_LOT_ID = PR_Data_Raw.map(row => row.FIELD_1);
    let coat_Date = PR_Data_Raw.map(row => row.FIELD_2);
    let coat_MACHINE_ID_ETCH = PR_Data_Raw.map(row => row.FIELD_8);
    let coat_PIECEID = PR_Data_Raw.map(row => row.PIECEID);
    let coat_WAFER_ID = PR_Data_Raw.map(row => row.FIELD_5);
    let coat_CHAMBER_ETCH = PR_Data_Raw.map(row => row.FIELD_11);
    let coat_DEVICE_ID = PR_Data_Raw.map(row => row.FIELD_7);
    let coat_RI = new Array(PR_Data_Raw.length).fill(null);

    let coat_MeasureType_1 = new Array(PR_Data_Raw.length).fill(null);
    let coat_NN_1 = new Array(PR_Data_Raw.length).fill(null);
    let coat_MeasureType_2 = new Array(PR_Data_Raw.length).fill(null);
    let coat_NN_2 = new Array(PR_Data_Raw.length).fill(null);

    let coat_GSI = new Array(PR_Data_Raw.length).fill(null);
    let coat_PORT = PR_Data_Raw.map(row => row.PORT_ID);

    return [coat_LOT_ID,coat_Date,coat_MACHINE_ID_ETCH,coat_PIECEID,coat_WAFER_ID,coat_CHAMBER_ETCH,coat_DEVICE_ID,coat_RI,coat_MeasureType_1,coat_NN_1,coat_MeasureType_2,coat_NN_2,coat_GSI,coat_PORT];
}

function PR_Step(fileStream){
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let PR_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['工作表2']);

    let LOT_ID3 = _.uniq(PR_Exl.filter(row => row.FIELD_6 === 'UBM' && row.MEASURE !== null).map(row => row.FIELD_1));

    let PR_Data_Raw = PR_Exl.filter(row => LOT_ID3.includes(row.FIELD_1) && row.MEASURE !== null && row.FIELD_6 === 'UBM');

    let step_LOT_ID = PR_Data_Raw.map(row => row.FIELD_1);
    let step_Date = PR_Data_Raw.map(row => row.FIELD_4);
    let step_MACHINE_ID_ETCH = PR_Data_Raw.map(row => row.FIELD_9);
    let step_PIECEID = PR_Data_Raw.map(row => row.PIECEID);
    let step_WAFER_ID = PR_Data_Raw.map(row => row.FIELD_5);
    let step_CHAMBER_ETCH = PR_Data_Raw.map(row => row.FIELD_12);
    let step_DEVICE_ID = PR_Data_Raw.map(row => row.FIELD_7);
    let step_RI = new Array(PR_Data_Raw.length).fill(null);

    let step_MeasureType_1 = new Array(PR_Data_Raw.length).fill(null);
    let step_NN_1 = new Array(PR_Data_Raw.length).fill(null);
    let step_MeasureType_2 = new Array(PR_Data_Raw.length).fill(null);
    let step_NN_2 = new Array(PR_Data_Raw.length).fill(null);

    let step_GSI = new Array(PR_Data_Raw.length).fill(null);
    let step_PORT = PR_Data_Raw.map(row => row.PORT_ID);

    // let devp_LOT_ID = PR_Data_Raw.map(row => row.FIELD_1);
    // let devp_Date = PR_Data_Raw.map(row => row.FIELD_3);
    // let devp_MACHINE_ID_ETCH = PR_Data_Raw.map(row => row.MachineID);
    // let devp_PIECEID = PR_Data_Raw.map(row => row.PIECEID);
    // let devp_WAFER_ID = PR_Data_Raw.map(row => row.FIELD_5);
    // let devp_CHAMBER_ETCH = PR_Data_Raw.map(row => row.FIELD_13);
    // let devp_DEVICE_ID = PR_Data_Raw.map(row => row.FIELD_7);
    // let devp_RI = PR_Data_Raw.map(row => row.RI);

    // let devp_MeasureType_1 = new Array(PR_Data_Raw.length).fill('CD');
    // let devp_NN_1 = PR_Data_Raw.map(row => row.NN);
    // let devp_MeasureType_2 = new Array(PR_Data_Raw.length).fill(null);
    // let devp_NN_2 = new Array(PR_Data_Raw.length).fill(null);

    // let devp_GSI = PR_Data_Raw.map(row => row.GSI);

    return [step_LOT_ID,step_Date,step_MACHINE_ID_ETCH,step_PIECEID,step_WAFER_ID,step_CHAMBER_ETCH,step_DEVICE_ID,step_RI,step_MeasureType_1,step_NN_1,step_MeasureType_2,step_NN_2,step_GSI,step_PORT];
}

function PR_Devp(fileStream){
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let PR_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['工作表2']);

    let LOT_ID3 = _.uniq(PR_Exl.filter(row => row.FIELD_6 === 'UBM' && row.MEASURE !== null).map(row => row.FIELD_1));

    let PR_Data_Raw = PR_Exl.filter(row => LOT_ID3.includes(row.FIELD_1) && row.MEASURE !== null && row.FIELD_6 === 'UBM');

    let devp_LOT_ID = PR_Data_Raw.map(row => row.FIELD_1);
    let devp_Date = PR_Data_Raw.map(row => row.FIELD_3);
    let devp_MACHINE_ID_ETCH = PR_Data_Raw.map(row => row.MachineID);
    let devp_PIECEID = PR_Data_Raw.map(row => row.PIECEID);
    let devp_WAFER_ID = PR_Data_Raw.map(row => row.FIELD_5);
    let devp_CHAMBER_ETCH = PR_Data_Raw.map(row => row.FIELD_13);
    let devp_DEVICE_ID = PR_Data_Raw.map(row => row.FIELD_7);
    let devp_RI = PR_Data_Raw.map(row => row.RI);

    let devp_MeasureType_1 = new Array(PR_Data_Raw.length).fill('CD');
    let devp_NN_1 = PR_Data_Raw.map(row => row.NN);
    let devp_MeasureType_2 = new Array(PR_Data_Raw.length).fill(null);
    let devp_NN_2 = new Array(PR_Data_Raw.length).fill(null);

    let devp_GSI = PR_Data_Raw.map(row => row.GSI);
    let devp_PORT = PR_Data_Raw.map(row => row.PORT_ID);

    return [devp_LOT_ID,devp_Date,devp_MACHINE_ID_ETCH,devp_PIECEID,devp_WAFER_ID,devp_CHAMBER_ETCH,devp_DEVICE_ID,devp_RI,devp_MeasureType_1,devp_NN_1,devp_MeasureType_2,devp_NN_2,devp_GSI,devp_PORT];
}

function ETCH(fileStream){
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let ETCH_THK_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['THK']);
    let ETCH_CAPUBM_Exl = xlsx.utils.sheet_to_json(workbook.Sheets[' CD y CAP UBM']);

    let ETCH_CAPUBM_Data_Raw = ETCH_CAPUBM_Exl.filter(row => row.Layer === 'UBM');
    ETCH_CAPUBM_Data_Raw = ETCH_CAPUBM_Data_Raw.map(obj => {
        let newObj = {};
        for(let key in obj) {
            newObj['CAPUBM_' + key] = obj[key]; // tambahkan prefix 'CAPUBM_' ke nama properti
        }
        return newObj;
    });
    let merge_ETCH = _.merge(ETCH_THK_Exl, ETCH_CAPUBM_Data_Raw);

    let ETCH_LOT_ID = _.uniq(merge_ETCH.map(row => row.Lot_id));

    let etch_LOT_ID = merge_ETCH.map(row => row.Lot_id);
    let etch_Date = merge_ETCH.map(row => row.TIMETAG);
    let etch_MACHINE_ID_ETCH = merge_ETCH.map(row => row['ETCH MachineID']);
    let etch_PIECEID = merge_ETCH.map(row => row['PIECEID']);
    let etch_WAFER_ID = merge_ETCH.map(row => row.wafer_id);
    let etch_CHAMBER_ETCH = merge_ETCH.map(row => row['ETCH ChamberID']);
    let etch_DEVICE_ID = merge_ETCH.map(row => row['FIELD_1']);
    let etch_RI = merge_ETCH.map(row => row['RI']);

    let etch_MeasureType_1 = merge_ETCH.map(row => row['MeasureType']);
    let etch_NN_1 = merge_ETCH.map(row => row['NN']);
    let etch_MeasureType_2 = merge_ETCH.map(row => row['CAPUBM_MeasureType']);
    let etch_NN_2 = merge_ETCH.map(row => row['CAPUBM_NN']);

    let etch_GSI = merge_ETCH.map(row => row['GSI']);

    let etch_Port = merge_ETCH.map(row => row.PORT_ID);

    return [
        etch_LOT_ID, etch_Date, etch_MACHINE_ID_ETCH, etch_PIECEID, etch_WAFER_ID, etch_CHAMBER_ETCH, etch_DEVICE_ID, etch_RI, 
        etch_MeasureType_1, etch_NN_1, etch_MeasureType_2, etch_NN_2, etch_GSI,etch_Port
    ];
}

function final(fileStream) {
    let workbook = xlsx.read(fileStream, {type: 'buffer',cellDates: true});
    let final_Exl = xlsx.utils.sheet_to_json(workbook.Sheets['FINAL']);

    let LOT_ID_final = _.uniq(final_Exl.map(row => row.LOT_ID));
    let final_Data_Raw = final_Exl.filter(row => LOT_ID_final.includes(row.LOT_ID));

    let final_LOT_ID = final_Data_Raw.map(row => row.LOT_ID);
    let final_Date = final_Data_Raw.map(row => row.TIMETAG);
    let final_MACHINE_ID_ETCH = final_Data_Raw.map(row => row.FINAL_MACHINE);
    let final_PIECEID = final_Data_Raw.map(row => row.PieceID);
    let final_WAFER_ID = final_Data_Raw.map(row => row.WAFER_ID);
    let final_CHAMBER_ETCH = Array(final_Data_Raw.length).fill(null);
    let final_DEVICE_ID = final_Data_Raw.map(row => row.Device_ID);
    let final_RI = Array(final_Data_Raw.length).fill(null);

    let final_MeasureType_1 = Array(final_Data_Raw.length).fill('YIELD');
    let final_NN_1 = final_Data_Raw.map(row => row.YIELD);
    let final_MeasureType_2 = Array(final_Data_Raw.length).fill(null);
    let final_NN_2 = Array(final_Data_Raw.length).fill(null);

    let final_GSI = Array(final_Data_Raw.length).fill(null);
    let final_Port = final_Data_Raw.map(row => row.PORT_ID);

    return [
        final_LOT_ID, final_Date, final_MACHINE_ID_ETCH, final_PIECEID, final_WAFER_ID, final_CHAMBER_ETCH, final_DEVICE_ID, final_RI, 
        final_MeasureType_1, final_NN_1, final_MeasureType_2, final_NN_2, final_GSI,final_Port
    ];
}

function mergeFile(r_sput, r_plate, r_PR_coat,r_PR_Step,r_PR_Devp, r_ETCH, r_final) {
    let arr_LOT_ID = [r_sput[0], r_plate[0], r_PR_coat[0], r_PR_Step[0], r_PR_Devp[0], r_ETCH[0], r_final[0]].filter(array => array !== undefined);
        let filteredLOT_ID = arr_LOT_ID.filter(item => item !== undefined);
        let final_LOT_ID = _.flatten(filteredLOT_ID);

    let arr_Date = [r_sput[1], r_plate[1], r_PR_coat[1], r_PR_Step[1], r_PR_Devp[1], r_ETCH[1], r_final[1]].filter(array => array !== undefined);
        let filtered_Date = arr_Date.filter(item => item !== undefined);
        let final_Date = _.flatten(filtered_Date);

    let arr_Machine_ID = [r_sput[2], r_plate[2], r_PR_coat[2], r_PR_Step[2], r_PR_Devp[2], r_ETCH[2], r_final[2]].filter(array => array !== undefined);
        let filtered_Machine_ID  = arr_Machine_ID.filter(item => item !== undefined);
        let final_MACHINE_ID = _.flatten(filtered_Machine_ID);

    let arr_PIECEID_ID = [r_sput[3], r_plate[3], r_PR_coat[3], r_PR_Step[3], r_PR_Devp[3], r_ETCH[3], r_final[3]].filter(array => array !== undefined);
        let filtered_PIECEID_ID   = arr_PIECEID_ID.filter(item => item !== undefined);
        let final_PIECEID_ID = _.flatten(filtered_PIECEID_ID);

    let arr_WAFER_ID = [r_sput[4], r_plate[4], r_PR_coat[4], r_PR_Step[4], r_PR_Devp[4], r_ETCH[4], r_final[4]].filter(array => array !== undefined);
        let filtered_WAFER_ID    = arr_WAFER_ID.filter(item => item !== undefined);
        let final_WAFER_ID = _.flatten(filtered_WAFER_ID);

    let arr_CHAMBER_ID = [r_sput[5], r_plate[5], r_PR_coat[5], r_PR_Step[5], r_PR_Devp[5], r_ETCH[5], r_final[5]].filter(array => array !== undefined);
        let filtered_CHAMBER_ID    = arr_CHAMBER_ID.filter(item => item !== undefined);
        let final_CHAMBER_ID = _.flatten(filtered_CHAMBER_ID);

    let arr_DEVICE_ID = [r_sput[6], r_plate[6], r_PR_coat[6], r_PR_Step[6], r_PR_Devp[6], r_ETCH[6], r_final[6]].filter(array => array !== undefined);
        let filtered_DEVICE_ID    = arr_DEVICE_ID.filter(item => item !== undefined);
        let final_DEVICE_ID = _.flatten(filtered_DEVICE_ID);

    let arr_RI = [r_sput[7], r_plate[7], r_PR_coat[7], r_PR_Step[7], r_PR_Devp[7], r_ETCH[7], r_final[7]].filter(array => array !== undefined);
        let filtered_RI    = arr_RI.filter(item => item !== undefined);
        let final_RI = _.flatten(filtered_RI);

    let arr_MeasureType_1 = [r_sput[8], r_plate[8], r_PR_coat[8], r_PR_Step[8], r_PR_Devp[8], r_ETCH[8], r_final[8]].filter(array => array !== undefined);
        let filtered_MeasureType_1   = arr_MeasureType_1.filter(item => item !== undefined);
        let final_MeasureType_1 = _.flatten(filtered_MeasureType_1);

    let arr_NN_1 = [r_sput[9], r_plate[9], r_PR_coat[9], r_PR_Step[9], r_PR_Devp[9], r_ETCH[9], r_final[9]].filter(array => array !== undefined);
        let filtered_NN_1   = arr_NN_1.filter(item => item !== undefined);
        let final_NN_1 = _.flatten(filtered_NN_1);

    let arr_MeasureType_2 = [r_sput[10], r_plate[10], r_PR_coat[10], r_PR_Step[10], r_PR_Devp[10], r_ETCH[10], r_final[10]].filter(array => array !== undefined);
        let filtered_MeasureType_2   = arr_MeasureType_2.filter(item => item !== undefined);
        let final_MeasureType_2 = _.flatten(filtered_MeasureType_2);

    let arr_NN_2 = [r_sput[11], r_plate[11], r_PR_coat[11], r_PR_Step[11], r_PR_Devp[11], r_ETCH[11], r_final[11]].filter(array => array !== undefined);
        let filtered_NN_2  = arr_NN_2.filter(item => item !== undefined);
        let final_NN_2 = _.flatten(filtered_NN_2);

    let arr_GSI = [r_sput[12], r_plate[12], r_PR_coat[12], r_PR_Step[12], r_PR_Devp[12], r_ETCH[12], r_final[12]].filter(array => array !== undefined);
        let filtered_GSI  = arr_GSI.filter(item => item !== undefined);
        let final_GSI = _.flatten(filtered_GSI);

    let arr_PORT = [r_sput[13], r_plate[13], r_PR_coat[13], r_PR_Step[13], r_PR_Devp[13], r_ETCH[13], r_final[13]].filter(array => array !== undefined);
        let filtered_PORT  = arr_PORT.filter(item => item !== undefined);
        let final_PORT = _.flatten(filtered_PORT);


    // create final data object
    let arrayOfObjects = final_Date.map((item, index) => {
        return {
            'Date': final_Date[index],
            'PieceID': final_PIECEID_ID[index],
            'LOT_ID': final_LOT_ID[index],
            'WAFER_ID': parseInt(final_WAFER_ID[index]),
            'MACHINE_ID': final_MACHINE_ID[index],
            'CHAMBER_ID': final_CHAMBER_ID[index],
            'DEVICE': final_DEVICE_ID[index],
            'MEASURE1': final_MeasureType_1[index],
            'MEASURE1_VAL': final_NN_1[index],
            'MEASURE2': final_MeasureType_2[index],
            'MEASURE2_VAL': final_NN_2[index],
            'RI': final_RI[index],
            'GSI':final_GSI[index],
            'PORT':final_PORT[index]
        };
    });

    //! tambahin 1 msec
    arrayOfObjects.forEach(item => {
        let date = moment(item.Date);
      
        if (date.millisecond() === 999) {
          date.add(1, 'milliseconds');
          item.Date = date.toISOString();
        }
      });

    // sort data by Date
    arrayOfObjects = _.orderBy(arrayOfObjects, ['Date'], ['asc']);
    // console.log(arrayOfObjects)
    // format Date and replace undefined or null with ''
    for (let obj of arrayOfObjects) {
        // console.log(obj.Date)
        obj.Date = obj.Date ? moment(obj.Date).format('MM/DD/YYYY hh:mm:ss A') : '';
        for (let key in obj) {
            obj[key] = obj[key] ?? '';
        }
    }

    //! OLD
    // let json = JSON.stringify(arrayOfObjects);
    // return json

    //! AMBIL DATA BENTUK JSON NEW
    return arrayOfObjects
}

router.post('/upload', upload.array('files'), async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No 'files' key in request.files" });
    }
  
    let uploadedFiles = req.files;
    let validFiles = uploadedFiles.filter(file => allowedFile(file.originalname));
  
  //   console.log(validFiles)
  
    if (validFiles.length === 0) {
        return res.status(400).json({ error: "No valid files provided" });
    }
  
    let listFile = ['sput', 'plate', 'PR', 'ETCH', 'final'];
  
    let r_sput = [];
    let r_plate = [];
    let r_PR_coat = [];
    let r_PR_Step = [];
    let r_PR_Devp= [];
    let r_ETCH = [];
    let r_final = [];
  
    for (let file of validFiles) {
      let bufferData = file.buffer; // This is how you access the buffer data
      let filename = file.originalname;
  
        for (let fileType of listFile) {
            if (filename.includes(fileType)) {
                switch (fileType) {
                    case 'sput':
                        r_sput = sput(bufferData);
                        break;
                    case 'plate':
                        r_plate = plate(bufferData);
                        break;
                    case 'PR':
                        r_PR_coat = PR_Coat(bufferData);
                        r_PR_Step = PR_Step(bufferData);
                        r_PR_Devp = PR_Devp(bufferData);
                        break;
                    case 'ETCH':
                        r_ETCH = ETCH(bufferData);
                        break;
                    case 'final':
                        r_final = final(bufferData);
                        break;
                    default:
                        console.log('gakada');
                }
            }
        }
    }
  //   console.log(r_PR)
    let finalJson = mergeFile(r_sput, r_plate, r_PR_coat,r_PR_Step,r_PR_Devp, r_ETCH, r_final);
    //!! OLD
    // res.json(finalJson);

    //!NEW 
    res.status(200).send(finalJson);
});

module.exports = router;