const express = require('express')
const bodyParser = require ('body-parser')
const cors = require('cors')
const app = express()
const mysql = require('mysql')
const dotenv = require('dotenv').config()

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


// ===========================
// ==== NEW FOR GROUP 20 =====
// ===========================

// READ (remaining vouchers)
app.get("/api/vouchersremaining", (req, res) => {
    const voucherRead = "SELECT COUNT(*) as Count FROM tickets WHERE issued_to is NULL;"
    db.query(voucherRead, (err, result) => {
        if(err){
            throw err;
        }
        res.send(result);
    })
})

// READ (volunteers who don't have a voucher assigned)
app.get("/api/unrewardedvolunteercount", (req, res) => {
    const checkVolunteers = "SELECT COUNT(*) as Count FROM volunteers LEFT OUTER JOIN tickets on volunteers.id = tickets.issued_to WHERE is_issued is NULL"
    db.query(checkVolunteers, (err, result) => {
        if (err){
            throw err;
        }
        res.send(result);
    })
})

// READ (get only volunteers without voucher)
app.get("/api/unrewardedvolunteers", (req,res) => {
    const getVolunteers = "SELECT * FROM volunteers LEFT OUTER JOIN tickets on volunteers.id = tickets.issued_to WHERE is_issued is NULL;"
    db.query(getVolunteers, (err, result) => {
        if (err) {
            throw err;
        }
        res.send(result);
    })
})

// READ (get only available vouchers)
app.get("/api/getvouchers", (req, res) => {
    const getVouchers = "SELECT * FROM tickets WHERE is_issued = 0;"
    db.query(getVouchers, (err, result) => {
        if (err) {
            throw err;
        }
        res.send(result);
    })
})

// UPDATE (Assign vouchers to volunteers)
app.put("/api/assignvouchers", (req, res) => {
    // get params from req.body.variableName
    personId = parseInt(req.body.personId)
    ticket = req.body.ticket;

    const update = "UPDATE tickets SET issued_to = ?, is_issued = 1 WHERE ticketCode = ?;"
    db.query(update, [personId, ticket], (err, result) => {
        if(err) {
            throw err;
        }
        res.send(result)
    })
})

// ====================
// === END GROUP 20 ===
// ====================


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

// CREATE
app.post("/api/create", (req, res) => {
    const fn = req.body.first
    const ln = req.body.last
    const ea = req.body.email
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

const PORT = process.env.EXPRESSPORT;
const msg = `Running on PORT ${PORT}`
app.get("/", (req, res) => {
    res.send(`<h1>Express Server</h1><p>${msg}<p>`)
})
app.listen(PORT, () => {
    console.log(msg)
})

