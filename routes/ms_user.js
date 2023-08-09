require('dotenv').config()

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const moment = require('moment-timezone');
const Validator = require('jsonschema').Validator;

const User = require('../models/Users')
const Roles = require('../models/Roles')
const userSchema = require('../JSON SCHEMA/user')
const authenticateJWT = require('../authMiddleware')

// ! ini untuk definisiin rute di aplikasi
const router = express.Router();
const Time = moment().tz(process.env.TZ).format('MM/DD/YYYY');
const { ObjectId } = require('mongodb');



/**
 * * Add new user
 * * login
 * * UPDATE data user
 * * GET one user
 * * DELETE user
 */

router.post('/add', authenticateJWT, async (req, res) => { 
    // res.send(req.user.role);
    const { username, password, role_id, created_by } = req.body;
    let created_at = Time // ! ubah value variable time ke created_at

    //! cek role
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        //! cek username dulu
        const isUserExist = await User.exists({ username });
        if (isUserExist) {
            return res.status(200)
            .send({stat:'failed',data:'User with that '+ username +' already exists'});
        }

        var v = new Validator();
        var result = v.validate({ username, password, role_id, created_at,created_by }, userSchema);

        if (result.valid==false) {
            throw new Error("Invalid data");
        }
        
        const user = new User({ username, password, role_id, created_at,created_by });
        await user.save(); // ! save datanya

        // const token = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN);
        res.status(200).send({stat:'success', data:'Add new user successfully'});
    } catch (error) {
        res.status(200).send({stat:'failed', data:error.message});
    }
    
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !await bcrypt.compare(password, user.password)) {
       return res.send({stat:'failed' ,data:'Invalid username or password'});
    }
    const userRole = await Roles.findById(user.role_id)

    const token = jwt.sign({ _id: user._id, role: userRole.name, username:user.username }, process.env.ACCESS_TOKEN,{
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
    res.status(200).send({ stat:'success' ,token, role:userRole.name, username:user.username  });
});

router.post('/update', authenticateJWT, async (req, res) => { 
    const { id, username, role_id } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const user = await User.findOneAndUpdate(
            {_id:id},
            {username:username,role_id:role_id}
        ) //! find yang lagi active
        // res.send('successfully update user')
        res.status(200).json({stat:'success',data: 'User successfully update'});
    } catch (error) {
        res.status(200).json({stat:'failed',data: 'no data'});
    }
});

router.post('/getone', authenticateJWT, async (req, res)  =>{
    const { id } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        const user = await User.findById(id) //! find yang lagi active//! find yang lagi active
        var data ={
            '_id':user._id,
            'username':user.username,
            'role_id':user.role_id,
            'created_at':user.created_at,
            'created_by':user.created_by
        }
        return res.status(200).send({stat:'success',data:data});
    } catch (error) {
        return res.status(200).send({stat:'failed',data:null});
    }
});

router.post('/delete', authenticateJWT, async (req, res)  =>{
    const { id } = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        //! find config using id update and add information deleted_at
        const config = await User.findByIdAndUpdate(id, {isDeleted: true, deleted_at: Time})

        if (!config) {
            res.status(200).json({stat:'failed',data: 'User failed to delete'});
        } else {
            res.status(200).json({stat:'success',data: 'User successfully deleted'});
        }

    } catch (err) {
        res.status(200).json({stat:'failed',data: 'User failed to delete'});
    }
});

router.post('/list', authenticateJWT, async (req, res)  =>{
    
    const { _page,_limit=10,_search} = req.body;

    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    let roles =''
    roles = await Roles.find({})

    try {
        var page = parseInt(_page) || 1; // ! Menentukan halaman saat ini
        var limit = parseInt(_limit) || 10; // ! Menentukan jumlah data per halaman default 10
        var skip = (page - 1) * _limit; // ! Menentukan jumlah data yang akan dilewati
        var search = _search; // ! Menentukan jumlah data yang akan dilewati

        var datas = await User.countDocuments({isDeleted:{$in:[false,null]}}) // tau jumlah data
        var maxPage = Math.ceil(datas.toString()/_limit)

        if(_page>maxPage){
            return res.status(400).json({ message: "no page" });
        }

        let listUser=[]
        let data =''

        if (search=="") {
            data = await User.find({isDeleted:{$in:[false,null]}}).skip(skip).limit(limit);
        }else{
            data = await User.find({isDeleted:{$in:[false,null]}, username: { $regex: search, $options:'i' }});
        }
        
        // //! buat object masukin kedalem array
        listUser.push(data.map(item => {
            // cari role
            let role = roles.find(r => r._id.equals(new ObjectId(item.role_id)));

            return {
                _id: item._id,
                name: item.username,
                role: role ? role.name : undefined,
                created_at: item.created_at,
                isActive: item.isActive,
                isDeleted: item.isDeleted,
            };
        }));
        listUser.push({'maxPage':maxPage})

        res.send(listUser)
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }
});

router.get('/roles', authenticateJWT, async (req, res)=>{
    
    if(req.user.role!=='Admin'){
        return res.sendStatus(403);
    }

    try {
        var roles = await Roles.find({})
        res.send(roles)
    } catch (error) {
        return res.status(400).json({ message: "no data" });
    }
});


// router.post('/test', async (req, res) => {
//     User.collection.getIndexes({full: true})
//     .then(indexes => {
//         console.log("indexes:", indexes);
//     })
//     .catch(console.error);
// });

module.exports = router;