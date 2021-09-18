var server = new WebSocket("wss://ecv-etic.upf.edu/node/9012/ws/");

function ServerHandler() {
    var that = this;
    this.sendMessage = function (messageToSend) {
        server.send(messageToSend);
    }

    this.updateTarget = function (character) {
        var message = {
            type: "updateTargetPosition",
            name: character.name, 
            email: character.email,
            content: {
                current_position: character.position,
                target_position: character.target_pos,
                vector: character.vec,
                sit: character.sit,
            }
        }
        server.send(JSON.stringify(message));
    };

    this.sendInitialInfo = function (character) {
        var message = {
            type: "initialInfo",
            content: {
                id: character.id,
                name: character.name,
                email: character.email,
                mesh: 0,
                texture: character.texID,
                position: character.target_pos,
                scale: character.scale,
                room_name: character.name,
            }
        }
        server.send(JSON.stringify(message));
        console.log("Sending initial information");
    };

    this.change_room = function (character, room_value) {
        var msg = {
            type: "room_change",
            content: {
                name: character.name,
                email: character.email,
                room: room_value
            }
        };
        that.sendMessage(JSON.stringify(msg));
    }

    this.send_canvas = function (_canvas) {
        msg = {
            type: "canvas",
            canvas: _canvas
        };
        that.sendMessage(JSON.stringify(msg));
    }

    this.sendPaintingInfo = function (_color, _mode, _size, _x, _y) {
        msg = {
            type: _mode,
            color: _color
        };
        if (_mode == "paint") {
            msg.size = _size;
            msg.x = _x; msg.y = _y;
        }
        that.sendMessage(JSON.stringify(msg));
    }

    this.sendPaintingEnd = function () {
        msg = { type: "paint_end" };
        that.sendMessage(JSON.stringify(msg));
    }

    this.standUp = function (ch) {
        msg = {
            type: "stand_up",
            name: ch.name,
            email: ch.email,
        };
        that.sendMessage(JSON.stringify(msg));
        that.updateTarget(ch);
    }

    this.disconnectFromRoom = function () {
        msg = {
            type: "disconnectFromRoom"
        };
        that.sendMessage(JSON.stringify(msg));
    };

    this.sendLoginToken = function (token_, mail) {
        msg = {
            type: "loginToken",
            email: mail,
            token: token_
        };
        that.sendMessage(JSON.stringify(msg));
    };

    //send blackBoard
    this.sendBB = function(email, blob){
        if(core.player.role != "owner"){
            return;
        }
        msg = {
            type: "updateBB",
            image: blob,
            receiver: email
        }
        that.sendMessage(JSON.stringify(msg));
        console.log("sending BB:",msg);
    }

    this.onMessageReceived = function (str_msg) {
        var mesageRecived = JSON.parse(str_msg.data);
        console.log("Message Received:", mesageRecived.type);
        if (mesageRecived.type == "updateTargetPosition") {
            console.log(mesageRecived);
            for (var i = 0; i < core.characters.length; i++) {
                var ch = core.characters[i];
                if (ch.email == mesageRecived.email) {
                    core.characters[i].position = mesageRecived.content.current_position;
                    core.characters[i].target_pos = mesageRecived.content.target_position;
                    core.characters[i].vec = mesageRecived.content.vector;
                    core.characters[i].sit = mesageRecived.content.sit;
                    console.log(core.characters[i].target_pos);
                    return;
                }
            }
        }
        if (mesageRecived.type == "initialInfo") {
            var characterInfo = mesageRecived.content;
            console.log(mesageRecived);
            Character(characterInfo.id, characterInfo.name, core.meshes[characterInfo.mesh],
                core.textures[characterInfo.texture], "texture", characterInfo.position, characterInfo.scale, false, characterInfo.email, characterInfo.texture);
            
            //sendCanvasBB(characterInfo.email);    
            var isOwner = false;
            if (core.player.role === "owner") isOwner = true;
            interfaceCreator.createUsersList(characterInfo.name, "data/chat_avatars/" + avArray[characterInfo.texture], isOwner, characterInfo.email);
        }
        if (mesageRecived.type == "userConnectedPositions") {
            if (core.player.role === "owner") isOwner = true;
            for (var i = 0; i < mesageRecived.content.length; i++) {
                var characterInfo = mesageRecived.content[i];
                Character(characterInfo.id, characterInfo.name, core.meshes[characterInfo.mesh],
                    core.textures[characterInfo.texture], "texture", characterInfo.position, characterInfo.scale, false, characterInfo.email, characterInfo.texture, characterInfo.sit);
            }
        }
        if (mesageRecived.type == "text") {
            chat.putMessage(mesageRecived.content, mesageRecived.username, mesageRecived.avatar, true);
        }
        if (mesageRecived.type == "userDesconnected") {
            console.log(mesageRecived);
            interfaceCreator.deleteUserFromList(mesageRecived.email);
            for (var i = 0; i < core.characters.length; i++) {
                var ch = core.characters[i];
                if (ch.email == mesageRecived.email) {
                    if(ch.role == "owner"){
                        //reset(); //reset blackboard 
                        that.open_painting = false;
                    }
                    scene.root.removeChild(ch);
                    core.characters.splice(i, 1);
                }
            }
        }
        if (mesageRecived.type == "checkUser") {
            console.log(mesageRecived);
            if (mesageRecived.status) {
                var name = mesageRecived.content.name;
                var texID = mesageRecived.content.texture;
                var mail = log_mngr.mail = mesageRecived.content.email;
                core.player = Character(1, name, core.meshes[0], core.textures[texID], "texture", [-4, 0, 3], 1 / 25, true, mail, texID);
                console.log("Player created:", core.player.name, core.characters);

                log_container.style.display = "none";
                document.querySelector(".roomSelectorContainer").style.display = "flex";
                core.storeItem("token", mesageRecived.content.token);
                core.storeItem("mail", mail);
            } else {
                log_mngr.error("password");
            }
        }
        if (mesageRecived.type == "userCreated") {
            core.storeItem("token", mesageRecived.content.token);
            core.storeItem("mail", log_mngr.mail);
            log_mngr.show_config();
        }
        if (mesageRecived.type == "mailExists") {
            log_mngr.user_exists = true;
            log_mngr.error("userExists");
        }
        if (mesageRecived.type == "checkAllowedUser" && mesageRecived.status == true) {
            document.querySelector(".roomSelectorContainer").style.display = "none";
            createRoom(core.room_name);
            console.log("is owner?", mesageRecived.isOwner);
            if (mesageRecived.isOwner) {
                core.player.role = "owner";
            } else {
                core.player.role = "guest";
                document.querySelector("#buttonConfig").style.display = "none";
                document.querySelector("#buttonChat").style.width = "calc(100%/2)";
                document.querySelector("#buttonPeople").style.width = "calc(100%/2)";
            }
            for (var i = 0; i < core.characters.length; i++) { 
                if(core.characters[i].email == log_mngr.mail) interfaceCreator.createUsersList(core.characters[i].name + " (You)", "data/chat_avatars/" + avArray[core.characters[i].texID], false, core.characters[i].email);
                else interfaceCreator.createUsersList(core.characters[i].name, "data/chat_avatars/" + avArray[core.characters[i].texID], mesageRecived.isOwner, core.characters[i].email);
            }
        }
        if (mesageRecived.type == "checkAllowedUser" && mesageRecived.status == false) {
            document.querySelector(".userNotAllowedToRoom").innerHTML = mesageRecived.msg;
            document.querySelector(".userNotAllowedToRoom").style.opacity = 1;
            setTimeout(function () {
                document.querySelector(".userNotAllowedToRoom").style.opacity = 0;
            }, 4000);
        }
        if (mesageRecived.type == "ownerAllowUser") {
            interfaceCreator.createEnterPetition(mesageRecived.email);
        }
        if (mesageRecived.type == "userRooms") {
            for (var i = 0; i < mesageRecived.content.length; i++) {
                interfaceCreator.addRoomToMyRooms(mesageRecived.content[i].name);
            }
        }
        if (mesageRecived.type == "loadRoom") {
            roomCreator.loadRoom(mesageRecived.content);
        }
        if (mesageRecived.type == "paint") {
            draw_line(mesageRecived.x, mesageRecived.y, mesageRecived.color, mesageRecived.size, "guest");
            console.log("size:", mesageRecived.size);
        }
        if (mesageRecived.type == "fill") {
            fill(mesageRecived.color, "guest");
        }
        if (mesageRecived.type == "paint_end") {
            ctx.beginPath();
        }
        if (mesageRecived.type == "stand_up") {
            for (var i = 0; i < core.characters.length; i++) {
                var ch = core.characters[i];
                if (ch.email == mesageRecived.email) {
                    core.characters[i].standUp();
                    return;
                }
            }
        }
        if (mesageRecived.type == "disconnectUser") {
            document.querySelector(".userNotAllowedToRoom").innerHTML = "You have been expelled from the room.";
            document.querySelector(".userNotAllowedToRoom").style.opacity = 1;
            setTimeout(function () {
                document.querySelector(".userNotAllowedToRoom").style.opacity = 0;
            }, 4000);
            core.disconnectFromRoom();
        }
        if (mesageRecived.type == "roomCreated") {
            antiRoomCopy();
            document.querySelector(".roomOptions").style.display = "none";
            createRoom(core.room_name);
            document.querySelector("#application").style.display = "grid";

            core.player.role = "owner";
            for (var i = 0; i < core.characters.length; i++) {
                if(core.characters[i].email == log_mngr.mail) interfaceCreator.createUsersList(core.characters[i].name + " (You)", "data/chat_avatars/" + avArray[core.characters[i].texID], false, core.characters[i].email);
                else interfaceCreator.createUsersList(core.characters[i].name, "data/chat_avatars/" + avArray[core.characters[i].texID], mesageRecived.isOwner, core.characters[i].email);
            }
        }
        if (mesageRecived.type == "roomNameExists") {
            document.querySelector(".roomCreatorError").innerText = "This room name already exists, please put another name";
            document.querySelector(".roomCreatorError").style.opacity = 1;
            setTimeout(function(){
                document.querySelector(".roomCreatorError").style.opacity = 0;
            }, 4000);

        }
        if (mesageRecived.type == "roomInUse") {
            document.querySelector(".roomCreatorError").innerText = "Room cannot be modified, there's still people inside.";
            document.querySelector(".roomCreatorError").style.opacity = 1;
            setTimeout(function(){
                document.querySelector(".roomCreatorError").style.opacity = 0;
            }, 4000);
        }
        if(mesageRecived.type == "allowBB"){
            core.open_painting = mesageRecived.status;
            if(core.open_painting == false){
                core.painting = false;
                blackboard_paint.style.display = "none";
            }
            console.log("BlackboardState:", mesageRecived.status);
        }
    }
}

var serverHandler = new ServerHandler();

server.onmessage = serverHandler.onMessageReceived;
server.onopen = core.sendToken;
