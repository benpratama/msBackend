const express = require('express');
const moment = require('moment-timezone');
const Validator = require('jsonschema').Validator;

const PL_Config = require('../models/PL_Config')
const PL_Process = require('../models/PL_Processes')
const PL_Machine = require('../models/PL_Machine')
const PL_Chamber = require('../models/PL_Chamber')

const plMachineSchema = require('../JSON SCHEMA/PL/machine')
const plChamberSchema = require('../JSON SCHEMA/PL/chamber')
const plConfigSchema = require('../JSON SCHEMA/PL/config')
const ObjectId = require('mongodb').ObjectId;


const authenticateJWT = require('../authMiddleware')

const router = express.Router();
const Time = moment().tz(process.env.TZ).format('MM/DD/YYYY');


router.post('/add', authenticateJWT, async (req, res)=>{
    const { name,layout,created_by } = req.body;
    let seenMachineIds = new Set();

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    
    let dataLayout = layout
    .filter(item =>item.machine.length >0)
    .map(l=>{
        return{
            process: new ObjectId(l.processID),
            machine: l.machine
            .filter(m=>{
                if (seenMachineIds.has(m.machine_id)) {
                    return false
                } else {
                    seenMachineIds.add(m.machine_id)
                    return true
                }
            })
            .map(m => {
                let seenChamberIds = new Set();
                
                return {
                    machine_id: new ObjectId(m.machine_id),
                    chambers: m.chambers
                        .filter(c => {
                            if (seenChamberIds.has(c.chamber_id)) {
                                return false;
                            } else {
                                seenChamberIds.add(c.chamber_id);
                                return true;
                            }
                        })
                        .map(c => c.chamber_id)
                };
            })
        }
    })

    try {
        const findConfig = await PL_Config.findOne({name:name})

       if(!findConfig){
        let created_at = Time
        let isActive = false
        let isDeleted = false
        let layout=dataLayout

        var v = new Validator();
        var result = v.validate({ name, layout, created_at, created_by, isActive, isDeleted }, plConfigSchema);

        if (result.valid==false) {
            throw new Error("Config Invalid data");
        }

        const newConfig = new PL_Config({ name, layout, created_at, created_by, isActive, isDeleted });
        await newConfig.save(); // ! save datanya

        res.status(200).send({stat:'success', data:"Configuration "+name+" successfully added"});
       }else{

        throw new Error("Configuration "+name+" already exists");

       }

    } catch (error) {
        res.status(200).send({stat:'failed', data:error.message});
    }

})

router.post('/list', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { _page,_limit=10,_search} = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    
    try {
        var page = parseInt(_page) || 1; // ! Menentukan halaman saat ini
        var limit = parseInt(_limit) || 10; // ! Menentukan jumlah data per halaman default 10
        var skip = (page - 1) * _limit; // ! Menentukan jumlah data yang akan dilewati
        var search = _search; // ! Menentukan jumlah data yang akan dilewati

        var datas = await PL_Config.countDocuments({isDeleted:false}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }
    
        let listConfig=[]
        let data =''

        if (search=="") {
            data = await PL_Config.find({isDeleted:false}).skip(skip).limit(limit);
        }else{
            data = await PL_Config.find({isDeleted: false, name: { $regex: search, $options:'i' }});
        }
        
        //! buat object masukin kedalem array
        listConfig.push(
            data.map(item => (
                {
                    _id: item._id,
                    name:item.name,
                    created_at:item.created_at,
                    isActive:item.isActive,
                    isDeleted:item.isDeleted,
                }
            ))
        );
        listConfig.push({'maxPage':maxPage})

        res.send(listConfig)

        // ! hasilnya 1
        // let maxPageValue = listConfig[1].MaxPage;
        // res.send(maxPageValue.toString())
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }

});

router.post('/data', authenticateJWT, async (req, res) => {
    const { id } = req.body;

    // //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {

        const config = await PL_Config.findById(new ObjectId(id)) //! find yang lagi active
        res.send({'data':config})
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }
})

router.post('/active', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { configID } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const seachConfig = await PL_Config.find({isDeleted:false,isActive:true}) //! find yang lagi active

        if (seachConfig.length!==0) {
            await PL_Config.findByIdAndUpdate(seachConfig[0]._id, {isActive: false}) //! update yang lagi active jadi inactive
        }        

        await PL_Config.findByIdAndUpdate(configID, {isActive: true}) //! active based on configID
        const activeConfig = await PL_Config.findById(configID) //! find yang lagi active

        res.status(200).send({stat:'success', data:"Configuration " + activeConfig.name+" is actived"});
    } catch (error) {

        res.status(200).send({stat:'failed', data:"Failed to activate"});
    }
});

router.post('/delete', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { configID } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        //! find config using id update and add information deleted_at
        const config = await PL_Config.findByIdAndUpdate(configID, {isDeleted: true, deleted_at: Time})

        if (!config) {
            // res.status(400).json({message: 'Configuration failed to delete'});
            res.status(200).send({stat:'failed', data:"Configuration failed to delete"});
        } else {
            // res.status(200).json({message: 'Configuration successfully deleted'});
            res.status(200).send({stat:'success', data:"Configuration successfully deleted"});
        }

    } catch (err) {
        // res.status(400).json({message: 'Configuration failed to delete', error: err.message});
        es.status(200).send({stat:'failed', data:err.message});
    }
});

router.post('/update', authenticateJWT, async (req, res) => {
    const { configID,layout } = req.body;
    let seenMachineIds = new Set();

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    let dataLayout = layout
    .filter(item =>item.machine.length >0)
    .map(l=>{
        return{
            process: new ObjectId(l.processID),
            machine: l.machine
            .filter(m=>{
                if (seenMachineIds.has(m.machine_id)) {
                    return false
                } else {
                    seenMachineIds.add(m.machine_id)
                    return true
                }
            })
            .map(m => {
                let seenChamberIds = new Set();
                
                return {
                    machine_id: new ObjectId(m.machine_id),
                    chambers: m.chambers
                        .filter(c => {
                            if (seenChamberIds.has(c.chamber_id)) {
                                return false;
                            } else {
                                seenChamberIds.add(c.chamber_id);
                                return true;
                            }
                        })
                        .map(c => c.chamber_id)
                };
            })
        }
    })

    try {

        let layout=dataLayout

        await PL_Config.findByIdAndUpdate(configID, {layout: layout})
        let updateConfig = await PL_Config.findById({_id:configID})

        res.status(200).send({stat:'success', data:"Configuration "+updateConfig.name+" successfully updated"});
        
    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error});
    }

});

//! ambil layout yang active
router.get('/layout', authenticateJWT, async (req, res)=>{

    try {
        let activeLayout = await PL_Config.find({isActive:true})
        let processes_ = await PL_Process.find({})
        let machines_ = await PL_Machine.find({})
        let chambers_ = await PL_Chamber.find({})

        let result={}

        activeLayout[0]['layout'].forEach(l=>{
            let process = processes_.find(p_=>p_._id.toString()===l.process.toString())
            if (process) {
                if(!result[process.processOrder]){
                    result[process.processOrder]={
                        "processCode": process.processCode,
                        "processName": process.processName,
                        "machines":l.machine.map(m=>{
                            let machine = machines_.find(m_ => m_._id.toString() === m.machine_id.toString())
                            if(machine){
                                return {
                                    machineCode:machine.machineCode,
                                    machineName:machine.machineName,
                                    machineType:machine.machineType,
                                    machineLocation:machine.machineLocation,
                                    chambers:m.chambers.map(c=>{
                                        let chamber = chambers_.find(c_=>c_._id==c)
                                        if (chamber){
                                            return{
                                                chamberCode:chamber.chamberCode,
                                                chamberName:chamber.chamberName,
                                            }
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            }
        })
        
        return res.status(200).send({stat:'success',data:result});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});


//! MACHINE AND CHAMBER
router.post('/machine/list', authenticateJWT, async (req, res)=>{
    
    // res.send(req.user.role);
    const { _page,_limit=10,_search} = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    
    try {
        var page = parseInt(_page) || 1; // ! Menentukan halaman saat ini
        var limit = parseInt(_limit) || 10; // ! Menentukan jumlah data per halaman default 10
        var skip = (page - 1) * _limit; // ! Menentukan jumlah data yang akan dilewati
        var search = _search; // ! Menentukan jumlah data yang akan dilewati

        var datas = await PL_Machine.countDocuments({isDeleted:{$in:[false,null]}}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }
    
        let listStep=[]
        let data =''

        if (search=="") {
            data = await PL_Machine.find({isDeleted:{$in:[false,null]}}).skip(skip).limit(limit);
        }else{
            data = await PL_Machine.find({isDeleted:{$in:[false,null]}, machineCode: { $regex: search, $options:'i' }});
        }
        
        let process = await PL_Process.find({})

        //! buat object masukin kedalem array
        listStep.push(
            data.map(item => {
                let processItem = process.find(p => p._id.toString() === item.machineTypeProcess.toString());
                return{
                    _id: item._id,
                    machineCode:item.machineCode,
                    machineName:item.machineName,
                    machineType:item.machineType,
                    machineLocation:item.machineLocation,
                    machineTypeProcess: processItem ? processItem.processCode : ''
                }
            })
        );
        listStep.push({'maxPage':maxPage})

        res.send(listStep)

        // ! hasilnya 1
        // let maxPageValue = listConfig[1].MaxPage;
        // res.send(maxPageValue.toString())
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }

})

router.post('/machine/getone', authenticateJWT, async (req, res)  =>{
    const { id } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const machine = await PL_Machine.findById(id)
        
        return res.status(200).send({stat:'success',data:machine});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});

router.post ('/machine/update', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { id,machineCode, machineName, machineType, machineLocation, machineTypeProcess} = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {   
        await PL_Machine.findByIdAndUpdate(id, {machineCode: machineCode, machineName:machineName, machineType:machineType, machineLocation:machineLocation, machineTypeProcess:machineTypeProcess})

        res.status(200).send({stat:'success', data:"Machine Code "+machineCode+" successfully update"});

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})

router.post ('/machine/add', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { machineCode, machineName, machineType, machineLocation ,machineTypeProcess} = req.body;
    // console.log(req.body)
    // //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const findMachineCode = await PL_Machine.findOne({machineCode:machineCode, machineTypeProcess:new ObjectId(machineTypeProcess)})

       if(!findMachineCode){

        var v = new Validator();
        var result = v.validate(req.body, plMachineSchema);

        if (result.valid==false) {
            throw new Error("Invalid data");
        }

        const newMachine = new PL_Machine({ machineCode, machineName, machineType, machineLocation, machineTypeProcess});
        await newMachine.save(); // ! save datanya

        res.status(200).send({stat:'success', data:"Machine "+machineCode+" successfully added"});

       }else{

        throw new Error("Machine with code  "+machineCode+" already exists");

       }

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})

router.post('/chamber/list', authenticateJWT, async (req, res)=>{
    
    // res.send(req.user.role);
    const { _page,_limit=10,_search} = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    
    try {
        var page = parseInt(_page) || 1; // ! Menentukan halaman saat ini
        var limit = parseInt(_limit) || 10; // ! Menentukan jumlah data per halaman default 10
        var skip = (page - 1) * _limit; // ! Menentukan jumlah data yang akan dilewati
        var search = _search; // ! Menentukan jumlah data yang akan dilewati

        var datas = await PL_Chamber.countDocuments({isDeleted:{$in:[false,null]}}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }
    
        let listStep=[]
        let data =''

        if (search=="") {
            data = await PL_Chamber.find({isDeleted:{$in:[false,null]}}).skip(skip).limit(limit);
        }else{
            data = await PL_Chamber.find({isDeleted:{$in:[false,null]}, chamberCode: { $regex: search, $options:'i' }});
        }

        let process = await PL_Process.find({})

        //! buat object masukin kedalem array
        listStep.push(
            data.map(item => 
                {
                    let processItem = process.find(p => p._id.toString() === item.chamberTypeProcess.toString());
                    return{
                        _id: item._id,
                        chamberName:item.chamberName,
                        chamberCode:item.chamberCode,
                        chamberTypeProcess:processItem ? processItem.processCode : ''
                    }
                }
            )
        );
        listStep.push({'maxPage':maxPage})

        res.send(listStep)

        // ! hasilnya 1
        // let maxPageValue = listConfig[1].MaxPage;
        // res.send(maxPageValue.toString())
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }

})

router.post('/chamber/getone', authenticateJWT, async (req, res)  =>{
    const { id } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const chamber = await PL_Chamber.findById(id)
        
        return res.status(200).send({stat:'success',data:chamber});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});

router.post ('/chamber/update', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { id,chamberCode, chamberName, chamberTypeProcess} = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        await PL_Chamber.findByIdAndUpdate(id, {chamberCode: chamberCode,chamberName:chamberName, chamberTypeProcess:chamberTypeProcess})

        res.status(200).send({stat:'success', data:"Chamber Code "+chamberCode+" successfully update"});

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})

router.post ('/chamber/add', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { chamberCode, chamberName, chamberTypeProcess} = req.body;

    // //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const findChamberCode = await PL_Chamber.findOne({chamberCode:chamberCode, chamberTypeProcess:new ObjectId(chamberTypeProcess)})
        

       if(!findChamberCode){

        var v = new Validator();
        var result = v.validate(req.body, plChamberSchema);

        if (result.valid==false) {
            throw new Error("Invalid data");
        }
        
        const newChamber = new PL_Chamber({chamberCode, chamberName, chamberTypeProcess});
        await newChamber.save(); // ! save datanya

        res.status(200).send({stat:'success', data:"Chamber"+chamberCode+" successfully added"});

       }else{

        throw new Error("Chamber "+chamberCode+" already exists");

       }

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})


//!  NO PAGINATION
router.get('/process/all', authenticateJWT, async (req, res)=>{
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    try {
        let process = await PL_Process.find({})
        
        return res.status(200).send({stat:'success',data:process});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
})

router.get('/machine/all', authenticateJWT, async (req, res)=>{
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    try {
        let machines = await PL_Machine.find({})

        const listMachines = machines.reduce((acc, curr) => {
            if (!acc[curr.machineTypeProcess]) {
                acc[curr.machineTypeProcess] = [];
            }
            acc[curr.machineTypeProcess].push(
                {
                    value: curr._id,
                    label: curr.machineCode+' - '+curr.machineName
                }
            );
            return acc;
        }, {});


        // let listMachines = machines.map(machine =>(
        //     {
        //         value: machine._id,
        //         label: machine.machineCode+' - '+machine.machineName
        //     }
        // ))
        
        return res.status(200).send({stat:'success',data:listMachines});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
})

router.get('/chamber/all', authenticateJWT, async (req, res)=>{
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    try {
        let chambers = await PL_Chamber.find({})

        const listChambers = chambers.reduce((acc, curr) => {
            if (!acc[curr.chamberTypeProcess]) {
                acc[curr.chamberTypeProcess] = [];
            }
            acc[curr.chamberTypeProcess].push(
                {
                    value: curr._id,
                    label: curr.chamberCode+' - '+curr.chamberName
                }
            );
            return acc;
        }, {});

        // let listChambers = chambers.map(chamber=>(
        //     {
        //         value: chamber._id,
        //         label: chamber.chamberCode+' - '+chamber.chamberName
        //     }
        // ))
        
        return res.status(200).send({stat:'success',data:listChambers});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
})


module.exports = router;