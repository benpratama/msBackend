const express = require('express');
const moment = require('moment-timezone');
const Validator = require('jsonschema').Validator;

const SR_Config = require('../models/SR_Config')
const SR_Step = require('../models/SR_Step')
const srStepSchema = require('../JSON SCHEMA/SR/step')
const srConfigSchema = require('../JSON SCHEMA/SR/config')

const authenticateJWT = require('../authMiddleware')

const router = express.Router();
const Time = moment().tz(process.env.TZ).format('MM/DD/YYYY');
const ObjectId = require('mongodb').ObjectId;


/**
 * * GET all config using pagination
 * * CREATE config
 * * UPDATE cards config
 * * UPDATE active / inactive config
 * * UPDATE isdeleted config 
 * * Get one Config
 */

router.post('/delete', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { configID } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        //! find config using id update and add information deleted_at
        const config = await SR_Config.findByIdAndUpdate(configID, {isDeleted: true, deleted_at: Time})

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

router.post('/active', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { configID } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const seachConfig = await SR_Config.find({isDeleted:false,isActive:true}) //! find yang lagi active

        if (seachConfig.length!==0) {
            await SR_Config.findByIdAndUpdate(seachConfig[0]._id, {isActive: false}) //! update yang lagi active jadi inactive
        }        

        await SR_Config.findByIdAndUpdate(configID, {isActive: true}) //! active based on configID
        const activeConfig = await SR_Config.findById(configID) //! find yang lagi active

        res.status(200).send({stat:'success', data:"Configuration " + activeConfig.name+" is actived"});
    } catch (error) {

        res.status(200).send({stat:'failed', data:"Failed to activate"});
    }
});

router.post('/update', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { configID,steps } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    try {
        var steps_ = []
         //! cek step and get object id
         for (const step of steps) {
            // const findStep = await SR_Step.findOne({StepID:step.StepID,STEPDESCRIPTION:step.STEPDESCRIPTION})
            // if(findStep!==null){
            //     steps_.push(findStep._id)
            //     // console.log('Onld '+findStep._id)
            // }else{
            //     const newStep = new SR_Step({StepID:step.StepID,STEPDESCRIPTION:step.STEPDESCRIPTION})
            //     let newStepId = await newStep.save();
            //     steps_.push(newStepId._id)
            //     // console.log('new '+newStepId._id)
            // }
            steps_.push(step.Step_id)
        }
        let cleanStep = [...new Set(steps_)]
        let cards_ = cleanStep.map(item => new ObjectId(item));

        await SR_Config.findByIdAndUpdate(configID, {cards: cards_})
        let updateConfig = await SR_Config.findById({_id:configID})

        res.status(200).send({stat:'success', data:"Configuration "+updateConfig.name+" successfully updated"});
        
    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error});
    }

});

router.post('/add', authenticateJWT, async (req, res) => {
    const { name,steps,created_by } = req.body;
    
    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }
    let steps_ = []
    try {
        const findConfig = await SR_Config.findOne({name:name})

        //! cek step and get object id
        for (const step of steps) {
            // const findStep = await SR_Step.findOne({StepID:step.StepID,STEPDESCRIPTION:step.STEPDESCRIPTION})
            // if(findStep!==null){
            //     steps_.push(findStep._id)
            //     // console.log('Onld '+findStep._id)
            // }else{
            //     const newStep = new SR_Step({StepID:step.StepID,STEPDESCRIPTION:step.STEPDESCRIPTION})
            //     let newStepId = await newStep.save();
            //     steps_.push(newStepId._id)
            //     // console.log('new '+newStepId._id)
            // }
            steps_.push(step.Step_id)
        }
        let cleanStep = [...new Set(steps_)]

       if(!findConfig){
        let created_at = Time
        let isActive = false
        let isDeleted = false
        let cards = cleanStep.map(item => new ObjectId(item));

        var v = new Validator();
        var result = v.validate({ name, cards, created_at, created_by, isActive, isDeleted }, srConfigSchema);

        if (result.valid==false) {
            throw new Error("Config Invalid data");
        }
        
        const newConfig = new SR_Config({ name, cards, created_at, created_by, isActive, isDeleted });
        await newConfig.save(); // ! save datanya

        res.status(200).send({stat:'success', data:"Configuration "+name+" successfully added"});
       }else{

        throw new Error("Configuration "+name+" already exists");

       }

    } catch (error) {
        res.status(200).send({stat:'failed', data:error.message});
    }
});

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

        var datas = await SR_Config.countDocuments({isDeleted:false}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }
    
        let listConfig=[]
        let data =''

        if (search=="") {
            data = await SR_Config.find({isDeleted:false}).skip(skip).limit(limit);
        }else{
            data = await SR_Config.find({isDeleted: false, name: { $regex: search, $options:'i' }});
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

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        let listofCard = []

        const config = await SR_Config.findById(new ObjectId(id)) //! find yang lagi active
        let listofCards = config.cards
        for (const cardId of listofCards) {
            let card = await SR_Step.findById(cardId)
            listofCard.push(
            {
                value:card._id,
                label:card.StepID+' - '+card.STEPDESCRIPTION
            })
            // console.log(card)
        }
        res.send({'_id':config._id,'cards':listofCard,'configName':config.name})
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }
})

//! ambil layout yang active
router.get('/layout', authenticateJWT, async (req, res)=>{
    
    // if(req.user.role!=='Admin'){
    //     return res.sendStatus(403);
    // }

    try {
        let cardID = await SR_Config.find({isActive:true})
        let Layout = await SR_Step.find({_id:{$in:cardID[0].cards}})
        
        return res.status(200).send({stat:'success',data:Layout});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});

// !------ STEPS ------
    //! with pagination
router.post('/step/list', authenticateJWT, async (req, res)=>{
    
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

        var datas = await SR_Step.countDocuments({isDeleted:{$in:[false,null]}}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }
    
        let listStep=[]
        let data =''

        if (search=="") {
            data = await SR_Step.find({isDeleted:{$in:[false,null]}}).skip(skip).limit(limit);
        }else{
            data = await SR_Step.find({isDeleted:{$in:[false,null]}, StepID: { $regex: search, $options:'i' }});
        }
        
        //! buat object masukin kedalem array
        listStep.push(
            data.map(item => (
                {
                    _id: item._id,
                    StepID:item.StepID,
                    created_at:item.created_at,
                    STEPDESCRIPTION:item.STEPDESCRIPTION
                }
            ))
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
    //!without pagination
router.get('/step/all', authenticateJWT, async (req, res)=>{
    
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        let steps = await SR_Step.find({isDeleted:{$in:[false,null]}})
        
        let cleanData = steps.map(step => (
            {
                value:step._id,
                label:step.StepID +' - '+step.STEPDESCRIPTION
            })   
        )
        
        return res.status(200).send({stat:'success',data:cleanData});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});


router.post ('/step/delete', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { stepID } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        //! find config using id update and add information deleted_at
        const step = await SR_Step.findByIdAndUpdate(stepID, {isDeleted: true, deleted_at: Time})
        
        // console.log(step)
        if (!step) {
            res.status(200).send({stat:'failed', data:"Step failed to delete"});
        } else {
            res.status(200).send({stat:'success', data:"Step successfully deleted"});
        }

    } catch (err) {
        es.status(200).send({stat:'failed', data:err.message});
    }
})

router.post ('/step/add', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { StepID, STEPDESCRIPTION} = req.body;
    // console.log(req.body)
    // //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const findStep = await SR_Step.findOne({StepID:StepID})

       if(!findStep){

        var v = new Validator();
        var result = v.validate(req.body, srStepSchema);

        if (result.valid==false) {
            throw new Error("Invalid data");
        }
        
        const newStep = new SR_Step({ StepID, STEPDESCRIPTION});
        await newStep.save(); // ! save datanya

        res.status(200).send({stat:'success', data:"StepID "+StepID+" successfully added"});
       }else{

        throw new Error("StepID "+StepID+" already exists");

       }

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})

router.post ('/step/update', authenticateJWT, async (req, res) => {
    // res.send(req.user.role);
    const { id,StepID, STEPDESCRIPTION} = req.body;
    // //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        await SR_Step.findByIdAndUpdate(id, {StepID: StepID,STEPDESCRIPTION:STEPDESCRIPTION})

        res.status(200).send({stat:'success', data:"StepID "+StepID+" successfully update"});

    } catch (error) {
        
        res.status(200).send({stat:'failed', data:error.message});

    }
})

router.post ('/step/data', authenticateJWT, async (req, res) => {
    const { id } = req.body;

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const step = await SR_Step.findById(id) //! find yang lagi active

        res.status(200).json({stat:'success',data: step});
    } catch (error) {
        res.status(200).json({stat:'success',data: 'no data'});
    }
})


module.exports = router;