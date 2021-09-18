
var mysql = require('mysql');

var DB = {
    mysql: null,
    USERS: [],
    getUserBymail: function (mail, callback) {
        this.mysql.query('SELECT username FROM marpa_users WHERE email = ?', [mail],
            function (err, result) {
                if (err) {
                    console.log("Error: ", err);
                    throw (err);
                }
                if (callback)
                    callback(result);
            });
    },
    create_user: function (username, password, salt, mail, token, callback) {
        this.mysql.query('INSERT INTO marpa_users SET username = ?, password_hashed = ?, salt = ?, email = ?, token = ?', [username, password, salt, mail, token], 
        function (err) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            console.log("User created");
            if (callback)
                callback();
        });
    },
    getUsersList: function (callback) {
        this.mysql.query('SELECT * FROM marpa_users', function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },
    getPassword: function (mail, callback) {
        this.mysql.query('SELECT password_hashed, salt FROM marpa_users WHERE email = ?', [mail],
            function (err, result) {
                if (err) {
                    console.log("Error: ", err);
                    throw (err);
                }
                if (callback)
                    callback(result);
            });
    },

    getLoginInfo: function(mail, callback){
        this.mysql.query('SELECT username, texture, token FROM marpa_users WHERE email = ?', [mail],
            function (err, result) {
                if (err) {
                    console.log("Error: ", err);
                    throw (err);
                }
                if (callback)
                    callback(result); 
            });
    },

    getToken: function(mail, callback){
        this.mysql.query('SELECT token FROM marpa_users WHERE email = ?', [mail],
            function (err, result) {
                if (err) {
                    console.log("Error: ", err);
                    throw (err);
                }
                if (callback)
                    callback(result);
            });
    },

    changeTextureID: function(texture_id, mail){
        this.mysql.query('UPDATE marpa_users SET texture = ? WHERE marpa_users.email = ?', [texture_id, mail],
            function (err) {
                if (err) {
                    console.log("Error: ", err);
                    throw (err);
                }
                console.log("Texture ID updated.");
            });
    },

    createRoom: function (roomName, maxStudents, isPublic, ownerEmail, connection, callback) {
        this.mysql.query('INSERT INTO marpa_rooms SET name = ?, maxStudents = ?, isPublic = ?, ownerMail = ?', [roomName, maxStudents, isPublic, ownerEmail],
            function (err, result) {
                if (err) {
                    if(err != "ER_DUP_ENTRY" ){
                        var messageToSend = {
                            type: "roomNameExists"
                        }
                        connection.send(JSON.stringify(messageToSend));
                    }
                    else{
                        console.log("Error: ", err);
                        throw (err);
                    }
                }
                else if (callback)
                    callback();
            });
    },

    addAllowedUsers: function (allowedUsers) {
        var that = this;
        this.mysql.query("SELECT LAST_INSERT_ID() FROM marpa_rooms",
            function (err, result) {
                for (var i = 0; i < allowedUsers.length; i++) {
                    that.mysql.query("INSERT INTO marpa_allowed_users SET roomId = ?, userName = ?", [result[0]['LAST_INSERT_ID()'], allowedUsers[i]],
                    function(err, result){
                        if( err & err != "ER_DUP_ENTRY" ) return;
                    });
                }
            });
    },

    checkAllowedUsers: function(userName, roomName, callback){
        this.mysql.query('SELECT b.userName FROM marpa_rooms AS a JOIN marpa_allowed_users AS b ON a.id = b.roomId where b.userName = ? && a.name = ?', [userName, roomName],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    getRoomMaxUsers: function(roomName, callback){
        this.mysql.query("SELECT maxStudents FROM marpa_rooms where name = ?", [roomName],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    getRoomIsPublic: function(roomName, callback){
        this.mysql.query("SELECT isPublic FROM marpa_rooms where name = ?", [roomName],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    checkRoomOwners: function(userMail, roomName, callback){
        this.mysql.query("SELECT ownerMail FROM marpa_rooms where ownerMail = ? and name = ?", [userMail, roomName],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    getUserRooms: function(userMail, callback){
        this.mysql.query("SELECT name FROM marpa_rooms where ownerMail = ?", [userMail],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    deleteRoom: function(roomName){
        this.mysql.query("DELETE FROM marpa_rooms where name = ?", [roomName])
    },

    deleteRoomById: function(roomId){
        this.mysql.query("DELETE FROM marpa_rooms where id = ?", [roomId])
    },

    loadRoom: function(roomName, callback){
        this.mysql.query("SELECT * FROM marpa_rooms where name = ?", [roomName],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    loadRoomAllowedUsers: function(roomId, callback){
        this.mysql.query("SELECT userName FROM marpa_allowed_users where roomId = ?", [roomId],
        function (err, result) {
            if (err) {
                console.log("Error: ", err);
                throw (err);
            }
            if (callback)
                callback(result);
        });
    },

    removeUserFromAllowed: function(roomName, email){
        var that = this;
        this.mysql.query("SELECT id FROM marpa_rooms where name = ?", [roomName],
        function(err, result){
            if(err) return;
            else{
                that.mysql.query("DELETE FROM marpa_allowed_users where roomId = ? and userName = ?", [result[0].id, email]);
            }
        });
    }
};

DB.mysql = mysql.createConnection({ database: 'ecv-2019', user: 'ecv-user', password: 'ecv-upf-2019', host: '127.0.0.1' });
console.log("Connected to mySQL***********");


module.exports = DB;
