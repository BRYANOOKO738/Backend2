const mysql = require("mysql2");
const express = require("express");
const dotenv = require("dotenv")
dotenv.config();

const con = mysql.createConnection({
host:'localhost',
  user:'root',
  password:'1234' ,
  database:'ookorealestate'
}) 

con.connect((err)=>{
    if (err) {
        console.log('Problem while conecting to Database', err)
    }
    else {
        console.log("Database connected succesfully")
    }
})


module.exports = con;