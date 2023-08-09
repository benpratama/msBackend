const express = require('express');
var cors = require('cors');
const mongoose = require('mongoose');
const msUserRoutes = require('./routes/ms_user');
const srConfigRoutes = require('./routes/sr_config');
const srDataRoutes = require('./routes/sr_data');
const plDataRoutes = require('./routes/pl_data')
const plConfigRoutes = require('./routes/pl_config')
const plMergeExcel = require('./routes/pl_mergeData') //! SPECIAL

const bodyParser = require('body-parser');
require('dotenv').config()

const app = express();
app.use(bodyParser.json({limit: '15mb'}));
app.use(bodyParser.urlencoded({limit: '15mb', extended: true}));
app.use(cors({
    //! cuma kasih izin yang MonitoringSystem app aja
    origin: 'http://localhost:3000',
    credentials: true
}));
const port = 8001;

// ! Untuk connect ke mongodb
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB MonitoringSystem connected...'))
    .catch((err) => console.log(err));

app.use(express.json());
/** ===== NOTE =====
 * Prefix buat route-nya
 * ! EX-> localhost:8001/ms/user/register
 */
app.use('/ms/user', msUserRoutes);
app.use('/ids/config', srConfigRoutes);
app.use('/ids/data', srDataRoutes);
app.use('/avm/data', plDataRoutes);
app.use('/avm/config',plConfigRoutes)

app.use('/pl/mergeData',plMergeExcel) //! SPECIAL

// app.get('/test', (req, res) => {
//     res.json({'message':'mantapp'});
// });

app.listen(port, () => {
    console.log('Monitoring System server running on port '+port);
  });