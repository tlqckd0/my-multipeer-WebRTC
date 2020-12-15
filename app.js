
const express= require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);


app.set('view engine','ejs');

app.use('/public',express.static('static'));


require('./socket')(io);

app.get('/',(req,res)=>{
    res.render('index.ejs');
})

app.get('/room',(req,res)=>{
    res.render('room.ejs');
})

app.get('/test',(req,res)=>{
    res.render('roomtest.ejs');
})

http.listen(8080,()=>{
    console.log('start');
})
