var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');



var app = express();


app.get('/', function(req, res) {
        res.send({'message': 'Hello'});
});


app.listen(80, function () {
    console.log('Node app is running on port 80');
});
