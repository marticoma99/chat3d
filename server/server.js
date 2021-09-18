console.log("P3 Server***********");
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');
var CORE = require('./core.js');
var DB = require('./db.js');
var process = require('process');

var server = http.createServer(function (request, response) {
    var data = CORE.onHTTPRequest(request, response);
    console.log("Request: " + request.url);
    if (data === false)
        return;
    if (data != null)
        response.end(data);
    else
        response.end("");
});

var port = 9012;
server.listen(port, function () { });
console.log("Server listening in port ", port);
console.log("Process ID:", process.pid);

// create the WebSocket Server
wsServer = new WebSocketServer({ httpServer: server });

// Add event handler when one user connects
wsServer.on('request', function (request) {
    var connection = request.accept(null, request.origin);
    // This is the most important callback for us, we'll handle all messages from users here.
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            var messageText = JSON.parse(message.utf8Data);
            if (messageText.type == "initialInfo") CORE.newUser(connection, messageText, false);
            if (messageText.type == "updateTargetPosition") {
                CORE.sendMessage(connection, message.utf8Data);
                CORE.updateTargetPosition(messageText);
            }
            if (messageText.type == "text") CORE.sendMessageChat(connection, message.utf8Data);
            if (messageText.type == "sign_in") CORE.checkLogin(messageText.mail,messageText.pass,connection);
            if (messageText.type == "sign_up") CORE.createUserOnDB(messageText.username, messageText.pass, messageText.mail, connection);
            if (messageText.type == "change_tex") CORE.setTexureID(messageText.texture, messageText.mail);
            if (messageText.type == "newRoom") CORE.createNewRoom(messageText.content, connection);
            if (messageText.type == "checkAllowedUser") CORE.checkRoomIsFull(messageText.content, connection);
            if (messageText.type == "userAllowed") CORE.allowUserToEnter(messageText.email, connection);
            if (messageText.type == "userNotAllowed") CORE.notAllowUserToEnter(messageText.email, connection);
            if (messageText.type == "getUserRooms") CORE.getUserRooms(messageText.email, connection);
            if (messageText.type == "deleteRoom") CORE.deleteRoom(messageText.roomName);
            if (messageText.type == "loadRoom") CORE.loadRoom(messageText.roomName,connection);
            if (messageText.type == "modifyRoom") CORE.modifyRoom(messageText.content, connection);
            if (messageText.type == "paint" || messageText.type == "fill" || messageText.type == "paint_end" || messageText.type == "stand_up" || messageText.type == "allowBB") CORE.sendMessage(connection, message.utf8Data);
            if(messageText.type == "deleteUser") CORE.deleteUserAdmin(messageText.email, connection);  
            if(messageText.type == "disconnectFromRoom") CORE.deleteUser(connection); 
            if(messageText.type == "loginToken") CORE.validateToken(connection, messageText.email, messageText.token); 
        }
    });
    connection.on('close', function () {
        CORE.deleteUser(connection, false);
    });
});