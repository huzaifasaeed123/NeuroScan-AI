require('dotenv').config();
const mysql = require('mysql2'); 



const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
});

// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     database: 'FYP_HMS',
//     password: 'saeed123',
// });
module.exports=connection;