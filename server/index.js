const express = require('express')
const bodyParser = require ('body-parser')
const cors = require('cors')
const app = express()
const mysql = require('mysql')
const dotenv = require('dotenv').config()
const emailer = require('./emailer/emailer')

const db = mysql.createPool({ // createConnection
    host: 'localhost',
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DATABASE,
    port: process.env.DBPORT
})

app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({extended: true}))

// READ
app.get("/api/read", (req, res) => {
    const sqlSelect = "SELECT * FROM volunteers;"
    db.query(sqlSelect, (err, result) => { 
        if(err){
            throw err;
        }
        res.send(result);
    })
})

//email participants
app.get("/api/sendvouchers", (req, res) => {

    const sqlSelect = "SELECT * FROM volunteers;"
    db.query(sqlSelect, (err, result) => { 
        if(err){
            throw err;
        }
        console.log(result)
        for(var i = 0; i < result.length; i++){

            first = result[i].first_name
            last = result[i].last_name
            email = result[i].email_address
            voucher = 'FAKE1234'
            message = emailer.generateVoucherMessage(first, last, email, voucher)
            emailer.sendMail(message)
        }
        res.send(result);
    })
})

// CREATE
app.post("/api/create", (req, res) => {
    console.log("entry received:")
    const fn = req.body.first
    const ln = req.body.last
    const ea = req.body.email
    console.log(fn + " " + ln + " " + ea);
    const sqlInsert = "INSERT INTO volunteers (first_name, last_name, email_address) VALUES (?,?,?);"
    db.query(sqlInsert, [fn, ln, ea], (err, result) => {
        if(err) throw err
        console.log("Server posted: ", fn, ln)
        res.send(result)
    })
}) 

// DELETE
app.delete("/api/delete/:emailAddress", (req, res) => {
    const ea = req.params.emailAddress;
    console.log(ea)
    const sqlDelete = "DELETE FROM volunteers WHERE email_address = ?";
    db.query(sqlDelete, [ea], (err, result) => {
        if(err) throw err
        console.log("Server: deleted: ", ea)
        res.send(result)
    }) 
})

// UPDATE
app.put("/api/update", (req, res) => {
    // console.log(req)
    
    const ne = req.body.new;
    const oe = req.body.old;
    console.log("Ready to change: ", oe, "to", ne)
    const sqlUpdate = "UPDATE volunteers SET email_address = ? WHERE email_address = ?"
    db.query(sqlUpdate, [ne, oe], (err, result)=>{
        if(err)  throw err;
        console.log("Server changed: ", oe, "to", ne)
        res.send(result)
    })
})

const PORT = 5006 //process.env.EXPRESSPORT;
const msg = `Running on PORT ${PORT}`
const dbInfo = `
    <p>
    user: ${process.env.DBUSER}, 
    password: ${process.env.DBPASS}, 
    database: ${process.env.DATABASE}, 
    port: ${process.env.DBPORT} </p>
    `
app.get("/", (req, res) => {
    res.send(`<h1>Express Server</h1><p>${msg}<p>` + dbInfo)
})
app.listen(PORT, () => {
    console.log(msg)
})

