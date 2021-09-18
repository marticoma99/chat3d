var DB = require('./db.js');
var md5 = require('md5');
const { connection } = require('websocket');

var CORE = {

    usersPositions: [],
    usersRooms: {},
    usersRoomsOwners: {},
    usersPendingToEnter: {},


    send: function (connection, message, room) {
        if (this.usersRooms[room])
            if (this.usersRooms[room].find(function (c) { return c == connection }))
                connection.send(message);
    },

    deleteArrayElement: function (arr, elem) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == elem) arr.splice(i, 1);
        }
    },

    newUser: function (connection, messageText) {
        var user = messageText;
        var messageToSend2 = {
            type: "initialInfo",
            content: user,
        }

        user.targetPosition = user.position;

        if (!this.usersRooms[user.room_name]) this.usersRooms[user.room_name] = [];
        this.usersRooms[user.room_name].push(connection);

        this.usersPositions.push(this.formatUserPosition(user, connection));

        this.sendMessage(connection, JSON.stringify(messageToSend2));
        connection.send(this.sendUsersConnected(user.room_name, connection));
    },

    updateTargetPosition: function (messageText) {
        var modifiedUser = this.usersPositions.find(function (c) { return c.content.email == messageText.email });
        if (!modifiedUser) return;
        modifiedUser.content.position = messageText.content.target_position;
        modifiedUser.content.targetPosition = messageText.content.target_position;
        modifiedUser.content.sit = messageText.content.sit;
    },

    formatUserPosition: function (messageRecived, connecttion) {
        var mesageToStore = {
            connection: connecttion,
            content: messageRecived
        }
        return mesageToStore;
    },

    sendUsersConnected: function (room, connection) {
        var msg = {
            type: "userConnectedPositions",
            content: this.usersPositions.filter(function (c) { return c.connection != connection }).map(obj => obj.content).filter(function (c) { return c.room_name == room })
        };
        return JSON.stringify(msg);
    },

    sendMessage: function (connection, msg) {
        //for every user connected...
        if (!this.usersPositions.find(function (c) { return c.connection == connection })) return;
        var room = this.usersPositions.find(function (c) { return c.connection == connection }).content.room_name;
        for (var i = 0; i < this.usersPositions.length; i++) {
            var user = this.usersPositions[i].connection;
            //avoid feedback
            if (user != connection)
                this.send(user, msg, room);
        }
    },

    deleteUserAdmin: function (email, connection) {
        if (!this.usersPositions.find(function (c) { return c.content.email == email })) return;
 
        var userConnection = this.usersPositions.find(function (c) { return c.content.email == email });
  
        var roomName = userConnection.content.room_name;

        //if is not the owner retrun
        if (this.usersRoomsOwners[userConnection.content.room_name] != connection) return;

        var messageToSend = {
            type: "disconnectUser"
        }
        userConnection.connection.send(JSON.stringify(messageToSend));
        this.deleteUser(userConnection.connection);
        console.log("User Banned:", email);
        DB.removeUserFromAllowed(roomName, email);
    },

    deleteUser: function (connection) {
        var roomName = "";
        for (var i = 0; i < this.usersPositions.length; i++) {
            var ch = this.usersPositions[i];
            if (ch.connection == connection) {
                var msg = {
                    type: "userDesconnected",
                    email: ch.content.email,
                };
                roomName = ch.content.room_name;
                this.sendMessage(connection, JSON.stringify(msg));
                this.usersPositions.splice(i, 1);
                if (this.usersRoomsOwners[ch.content.room_name] == connection) {
                    delete this.usersRoomsOwners[ch.content.room_name];
                    console.log("The owner of the room " + ch.content.room_name + " has disconnected");

                }
            }
        }
        if (!this.usersRooms[roomName]) return;
        for (var i = 0; i < this.usersRooms[roomName].length; i++) {
            var user = this.usersRooms[roomName][i];
            if (user === connection)
                this.usersRooms[roomName].splice(i, 1);
        }
    },


    sendMessageChat: function (connection, msg) {
        var room = this.usersPositions.find(function (c) { return c.connection == connection }).content.room_name;
        for (var i = 0; i < this.usersPositions.length; i++) {
            var user = this.usersPositions[i].connection;
            //avoid feedback
            if (user != connection)
                this.send(user, msg, room);
        }
    },

    allowUserToEnter: function (email, connection) {
        var userToSave = this.usersPendingToEnter[email];

        //if is not the owner retrun
        if (this.usersRoomsOwners[userToSave.content.room_name] != connection) return;

        this.newUser(userToSave.connection, userToSave.content);
        userToSave.connection.send(JSON.stringify({ type: "checkAllowedUser", status: true }));
        delete this.usersPendingToEnter[email];
    },

    notAllowUserToEnter: function (email, connection) {
        var userRecived = this.usersPendingToEnter[email];

        //if is not the owner return
        if (this.usersRoomsOwners[userRecived.content.room_name] != connection) return;

        userRecived.connection.send(JSON.stringify({
            type: "checkAllowedUser", status: false,
            msg: "You are not allowed to access the room"
        }));
        delete this.usersPendingToEnter[email];
    },

    /***************************database stuff***************************/
    //debug
    onHTTPRequest: function (request, response) {
        console.log(request.method);
    },

    createUserOnDB: function (username, user_password, mail, connection) {
        var rnd = Math.random(); var now = Date.now();
        var salt = username + String(rnd) + String(now);
        var password = md5(salt + user_password);
        DB.getUserBymail(mail, function (info) {
            if (info.length != 0) {
                console.log("Existing mail in the DB");
                return connection.send(JSON.stringify({ type: "mailExists", content: "This email is already in use by an user." }));
            } else {
                console.log("Creating the user...");
                var session_token = String(Math.random());
                var salted_session_token = md5(session_token);
                DB.create_user(username, password, salt, mail, salted_session_token, function () {
                    connection.send(JSON.stringify({ type: "userCreated", content: { token: session_token } }));
                });
            }
        });
    },

    setTexureID: function (texid, mail) {
        DB.changeTextureID(texid, mail);
    },

    login: function (mail, password, response) {
        DB.getPassword(mail, function (user_info) {
            var db_pass = String(user_info[0].password_hashed); //password from the database
            var salt = String(user_info[0].salt); //salt from the database
            var password_attempt = md5(salt + password);
            if (password_attempt == db_pass) {
                response.end("Correct Password");
                return true; //login accepted
            }
            response.end("Wrong Password");
            return false; //wrong password
        })
    },

    checkLogin: function (mail, password, connection) {
        DB.getPassword(mail, function (user_info) {
            if (user_info[0]) {
                var db_pass = String(user_info[0].password_hashed); //password from the database
                var salt = String(user_info[0].salt); //salt from the database
                var password_attempt = md5(salt + password);
                if (password_attempt == db_pass) {
                    console.log("Correct Password");
                    DB.getLoginInfo(mail, function (info) {
                        if (info[0]) {
                            var username = String(info[0].username);
                            var texid = info[0].texture;
                            var token_ = info[0].token;
                            connection.send(JSON.stringify({ type: "checkUser", status: true, content: { name: username, texture: texid, email: mail, token: token_ } }));
                        } else {
                            console.log("Error, no user info.");
                            connection.send(JSON.stringify({ type: "checkUser", status: false }));
                        }
                    });
                    return;
                }
                console.log("Wrong Password");
                return connection.send(JSON.stringify({ type: "checkUser", status: false }));
            }
            else {
                console.log("Wrong Password");
                connection.send(JSON.stringify({ type: "checkUser", status: false }));
            }
        });
    },

    createNewRoom: function (roomInfo, connection) {
        var that = this;
        this.usersRoomsOwners[roomInfo.name] = connection;
        DB.createRoom(roomInfo.name, roomInfo.students, roomInfo.isPublic, roomInfo.ownerEmail, connection,
            function () {
                var messageToSend = {
                    type: "roomCreated"
                }
                connection.send(JSON.stringify(messageToSend));
                var allowedUsers = roomInfo.allowedUsers;
                DB.addAllowedUsers(allowedUsers);
                that.newUser(connection, roomInfo.userInfo);
            });
    },

    checkRoomIsFull: function (userInfo, connection) {
        var that = this;
        DB.getRoomMaxUsers(userInfo.roomName, function (result) {
            var usersConnected = 0;
            if (that.usersRooms[userInfo.roomName])
                usersConnected = that.usersRooms[userInfo.roomName].length;
            if (!result[0]) {
                connection.send(JSON.stringify({
                    type: "checkAllowedUser", status: false,
                    msg: "The room you are triying to access does not exist"
                }));
                return;
            }
            if (usersConnected < result[0].maxStudents)
                that.checkRoomIsPublic(userInfo, connection);
            else connection.send(JSON.stringify({
                type: "checkAllowedUser", status: false,
                msg: "The room you are trying to access is full"
            }));
        });
    },

    checkRoomIsPublic: function (userInfo, connection) {
        var that = this;
        DB.getRoomIsPublic(userInfo.roomName, function (result) {
            if (result[0].isPublic == true) {
                that.newUser(connection, userInfo.userInfo);
                that.checkRoomOwner(userInfo.userName, userInfo.roomName, connection, that);
            } else that.checkAllowedUser(userInfo, connection);
        })
    },

    checkAllowedUser: function (userInfo, connection) {
        var that = this;
        if (this.checkUserInTheRoom(userInfo.userName, connection)) return;
        DB.checkAllowedUsers(userInfo.userName, userInfo.roomName, function (result) {
            if (result[0]) {
                that.newUser(connection, userInfo.userInfo);
                that.checkRoomOwner(userInfo.userName, userInfo.roomName, connection, that);
            }
            else {
                var ownerConnection = that.usersRoomsOwners[userInfo.roomName];
                if (ownerConnection) {
                    that.usersPendingToEnter[userInfo.userName] = {
                        connection: connection,
                        content: userInfo.userInfo
                    };

                    ownerConnection.send(JSON.stringify({
                        type: "ownerAllowUser",
                        email: userInfo.userName,
                    }));
                    connection.send(JSON.stringify({
                        type: "checkAllowedUser", status: false,
                        msg: "Witing room owner permision to access..."
                    }));
                }
                else connection.send(JSON.stringify({
                    type: "checkAllowedUser", status: false,
                    msg: "You are not allowed to access the room"
                }));
            }
        });
    },

    checkUserInTheRoom: function (email, connection) {
        var user = this.usersPositions.find(function (c) { return c.content.email == email });
        if (user) {
            connection.send(JSON.stringify({
                type: "checkAllowedUser", status: false,
                msg: "You are already inside the room"
            }));
            return true;
        }
        else return false;
    },

    checkRoomOwner: function (userMail, roomName, connection, that) {
        DB.checkRoomOwners(userMail, roomName, function (result) {
            if (result[0]) {
                that.usersRoomsOwners[roomName] = connection;
                connection.send(JSON.stringify({ type: "checkAllowedUser", status: true, isOwner: true }));
                console.log("The owner (" + userMail + ") of the room " + roomName + " has joined the room");
            }
            else connection.send(JSON.stringify({ type: "checkAllowedUser", status: true, isOwner: false }));
        });
    },

    getUserRooms: function (userMail, connection) {
        DB.getUserRooms(userMail, function (result) {
            var messageToSend = {
                type: "userRooms",
                content: result
            }
            connection.send(JSON.stringify(messageToSend));
        });
    },

    deleteRoom: function (roomName) {
        DB.deleteRoom(roomName);
    },

    deleteRoomById: function (roomId) {
        DB.deleteRoomById(roomId);
    },

    loadRoom: function (roomName, connection) {
        DB.loadRoom(roomName, function (result) {
            DB.loadRoomAllowedUsers(result[0].id, function (allowedUsers) {
                var allowedUsersArray = []
                for (var i = 0; i < allowedUsers.length; i++) {
                    allowedUsersArray.push(allowedUsers[i].userName);
                }
                var messageToSend = {
                    type: "loadRoom",
                    content: {
                        id: result[0].id,
                        maxStudents: result[0].maxStudents,
                        isPublic: result[0].isPublic,
                        ownerMail: result[0].ownerMail,
                        allowedUsers: allowedUsersArray
                    }
                }
                connection.send(JSON.stringify(messageToSend));
            });
        })
    },

    modifyRoom: function (roomInfo, connection) {
        if(this.usersRooms[roomInfo.name]){
            if(this.usersRooms[roomInfo.name].length > 0 ){
                var messageToSend = {
                    type: "roomInUse"
                }
                connection.send(JSON.stringify(messageToSend));
                return;
            }
        }
        this.deleteRoomById(roomInfo.id);
        this.createNewRoom(roomInfo, connection);
    },

    validateToken: function (connection, mail, token1) {
        DB.getToken(mail, function (result) {
            if (result[0]) {
                if (result[0].token == md5(token1) || result[0].token == token1) {
                    DB.getLoginInfo(mail, function (info) {
                        if (info[0]) {
                            var username = String(info[0].username);
                            var texid = info[0].texture;
                            var token_ = info[0].token;
                            connection.send(JSON.stringify({ type: "checkUser", status: true, content: { name: username, texture: texid, email: mail, token: token_ } }));
                        } else {
                            console.log("Error, no user info.");
                            connection.send(JSON.stringify({ type: "checkUser", status: false }));
                        }
                    });
                }else{
                    connection.send(JSON.stringify({ type: "checkUser", status: false }));
                }
            }
        });
    }

}

module.exports = CORE;