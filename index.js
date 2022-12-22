
const express = require('express');

const mongoose = require('mongoose');

const cors = require('cors');

const fileUpload = require('express-fileupload');

const  dotenv = require('dotenv');

const {readdirSync} = require('fs');



dotenv.config();



const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload({
    useTempFiles: true
}));




// routes

readdirSync('./routes').map( r => app.use('/' , require('./routes/' + r)));

// database

mongoose.connect(process.env.DATABASE_URL , {
    useNewUrlParser: true
})
.then(() => console.log('connected to database'))
.catch(err => console.log(err));



const port = process.env.PORT || 8000 ;

app.listen(port , () => console.log('the server is running on port N 8000'));