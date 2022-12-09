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
    const sqlSelect = "SELECT DISTINCT first_name, last_name, email_address FROM volunteers order by last_name;"
    db.query(sqlSelect, (err, result) => { 
        if(err){
            throw err;
        }
        res.send(result);
    })
})

// READ VOLUNTEERS BY EVENT ID FROM DB
function getVolunteersByEventId(eventId){
    return new Promise((resolve, reject)=>{
        const sqlSelect = "SELECT volunteers.*, tickets.ticketCode as TicketCode FROM volunteers LEFT JOIN tickets on volunteers.id = tickets.issued_to where event_id = ? order by last_name;"
        db.query(sqlSelect, [eventId], (err, result) => {        
            if(err){
                reject(err);
            } 
            console.log(result)
            resolve(result);
        })
    })
}

// GET VOLUNTEERS BY EVENT ID
app.get("/api/read/:event_id", async (req, res) => {
    const ea = req.params.event_id
    result = await getVolunteersByEventId(ea);
    res.send(result)
})

// READ EVENTS 
app.get("/api/readEvents", (req, res) => {
    const sqlSelect = "SELECT event_id, event_name, DATE_FORMAT(event_date, '%m/%d/%Y') as event_date FROM events;"
    db.query(sqlSelect, (err, result) => {        
        if(err){
            throw err;
        }
        res.send(result);
    })
})

// GET VOUCHERS FROM DB
function getNUnusedVouchers(n) {
    return new Promise((resolve, reject) => {
        const sqlSelect = "SELECT * FROM tickets where is_issued = 0;"
        db.query(sqlSelect, [n], (err, result) => {        
            if(err){
                reject(err);
            } 
        resolve(result);
        });
    })
}

// UPDATE VOUCHERS IN DB
function assignVoucher(TicketCode, user_id) {
    return new Promise((resolve, reject) => {
        console.log("assignVoucher Func: ticket code & userId:" + TicketCode + user_id)
        const sqlUpdate = "UPDATE tickets SET is_issued = 1, issued_to = ?, issued_on = NOW() WHERE ticketCode = ?"
        db.query(sqlUpdate, [user_id, TicketCode], (err, result) => {        
            if(err){
                reject(err);
            } 
        resolve(result);
        });
    })
}

//ASSIGN VOUCHERS TO PARTICIPANTS BY EVENT ID
app.get("/api/issuevouchers/:event_id", async (req, res) => {
    console.log("issuing vouchers for eventID: " + req.params.event_id)
    volunteers = await getVolunteersByEventId(req.params.event_id);
    volunteerCount = volunteers.length;

    vouchers = await getNUnusedVouchers(volunteerCount);

    assignments = []
    volunteers.map((val, i) => {
        assignments.push({"user_id":val.id, "voucher_id": vouchers[i].ticketCode})
    });

    assignments.forEach(element => {
        assignVoucher(element.voucher_id, element.user_id);        
    });
    res.send();
})

//email participants by event ID
app.get("/api/sendvouchers/:event_id", (req, res) => {

    eventId = req.params.event_id;
    const sqlSelect = "SELECT * FROM volunteers JOIN tickets ON volunteers.id = tickets.issued_to WHERE event_id = ? ;";

    db.query(sqlSelect, [eventId], (err, result) => { 
        if(err){
            throw err;
        }
        for(var i = 0; i < result.length; i++){
            first = result[i].first_name
            last = result[i].last_name
            email = result[i].email_address
            voucher = result[i].ticketCode
            message = emailer.generateVoucherMessage(first, last, email, voucher)
            emailer.sendMail(message)
        }
        res.send(result);
    })
})

//email participants upon registering
function emailRegistrationConfirmation(volunteerId){

    const sqlSelect = "SELECT volunteers.*, events.* FROM volunteers JOIN events ON volunteers.event_id = events.event_id WHERE id = ? ;";

    db.query(sqlSelect, [volunteerId], (err, result) => { 
        if(err){
            throw err;
        }
        for(var i = 0; i < result.length; i++){
            first = result[i].first_name
            last = result[i].last_name
            email = result[i].email_address
            eventName = result[i].event_name
            date = result[i].event_date
            message = emailer.generateConfirmationEmail(first, last, email, eventName, date)
            emailer.sendMail(message)
        }
    })
}


// CREATE
app.post("/api/create", (req, res) => {
    const fn = req.body.first
    const ln = req.body.last
    const ea = req.body.email
    const ev = req.body.event
    const sqlInsert = "INSERT INTO volunteers (first_name, last_name, email_address, event_id) VALUES (?,?,?,?);"
    db.query(sqlInsert, [fn, ln, ea, ev], (err, result) => {
        if(err) throw err
        try{
            emailRegistrationConfirmation(result.insertId);
        }
        catch(err){
            console.log("could not send confirmation email.");
            console.log(err)
        }
        finally{
            res.send(result)
        }
    })
}) 

// CREATE EVENT
app.post("/api/createEvent", (req, res) => {
    console.log("entry received:")
    const nm = req.body.event_name
    const dt = req.body.event_date
    const sqlInsert = "INSERT INTO events (event_name, event_date) VALUES (?,?);"
    db.query(sqlInsert, [nm,dt], (err, result) => {
        if(err) throw err
        console.log("Server posted: ", nm)
        res.send(result)
    })
}) 

// DELETE
app.delete("/api/delete/:emailAddress", (req, res) => {
    const ea = req.params.emailAddress;
    const sqlDelete = "DELETE FROM volunteers WHERE email_address = ?";
    db.query(sqlDelete, [ea], (err, result) => {
        if(err) throw err
        res.send(result)
    }) 
})

// DELETE EVENT
app.delete("/api/deleteEvent/:event_id", (req, res) => {
    const id = req.params.event_id;
    console.log(id)
    const sqlDelete = "DELETE FROM events WHERE event_id = ?";
    db.query(sqlDelete, [id], (err, result) => {
        if(err) throw err
        console.log("Server: deleted: ", id)
        res.send(result)
    }) 
})

// UPDATE
app.put("/api/update", (req, res) => {

    const ne = req.body.new;
    const oe = req.body.old;
    const sqlUpdate = "UPDATE volunteers SET email_address = ? WHERE email_address = ?"
    db.query(sqlUpdate, [ne, oe], (err, result)=>{
        if(err)  throw err;
        
        res.send(result)
    })
})

// UPDATE EVENT NAME AND DATE
app.put("/api/updateEvent", (req, res) => {
    const nm = req.body.newName;
    const dt = req.body.newDate;
    const id = req.body.event_id;
    console.log("Updating event: " + id)
    const sqlUpdate = "UPDATE events SET event_name = ?, event_date = ? WHERE event_id = ?"
    db.query(sqlUpdate, [nm, dt, id], (err, result)=>{
        if(err)  throw err;
        console.log("Server updated: ", id);
        res.send(result)
    })
})

const PORT = process.env.EXPRESSPORT;
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

