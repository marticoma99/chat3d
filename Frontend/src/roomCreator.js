function RoomCreator(){
    this.allowedUsers = [];
    this.roomName = "";
    this.maxStudents = 20;
    this.isPublic = false;
    this.roomModify = false;
    this.roomId = -1;
}

RoomCreator.prototype.addAllowedUser = function(userName){
    this.allowedUsers.push(userName);
}

RoomCreator.prototype.emptyAllowedUsers = function(){
    this.allowedUsers = [];
}

RoomCreator.prototype.addRoomName = function(name){
    this.roomName = name;
}

RoomCreator.prototype.setMaxStudents = function(num){
    if(num && num > 0)
        this.maxStudents = num;
}

RoomCreator.prototype.setIsPublic = function(public){
    this.isPublic = public;
}

RoomCreator.prototype.emptyRoomProperties = function(){
    this.isPublic = false;
    this.maxStudents = 20;
    this.roomName = "";
    this.roomModify = false;
    this.emptyAllowedUsers();
}

RoomCreator.prototype.formatMessageNewRoom = function(type_){
    var allowedUsers = this.allowedUsers;
    allowedUsers.push(log_mngr.mail);
    var roomInfo = {
        type: type_,
        content:{
            allowedUsers: allowedUsers,
            name: this.roomName,
            students: this.maxStudents,
            isPublic: this.isPublic,
            ownerEmail: log_mngr.mail,
            id: this.id,
            userInfo:{
                id: 1,
                name: log_mngr.mail,
                email: core.player.email,
                mesh: 0,
                texture: core.player.texID,
                position: [-4, 0, 3],
                scale: (1 / 25),
                room_name: this.roomName
            }
        }
    }

    return roomInfo; 
} 

RoomCreator.prototype.formatMessage = function(){
    return this.formatMessageNewRoom("newRoom");
}

RoomCreator.prototype.formatMessageModifyRoom = function(){
    return this.formatMessageNewRoom("modifyRoom");
}

RoomCreator.prototype.loadRoomOptions = function(roomName){
    this.roomName = roomName;
    this.roomModify = true;
    var messageToSend = {
        type: "loadRoom",
        roomName: roomName
    }
    serverHandler.sendMessage(JSON.stringify(messageToSend));
}

RoomCreator.prototype.loadRoom = function(roomInfo){
    this.id = roomInfo.id;
    this.maxStudents = roomInfo.maxStudents;
    this.isPublic = roomInfo.isPublic;
    this.allowedUsers = roomInfo.allowedUsers;
    document.querySelector("#newRoomName").value = this.roomName;
    document.querySelector("#maxStudents").value = this.maxStudents;
    for(var i = 0; i < this.allowedUsers.length; i++){
        if(this.allowedUsers[i] != roomInfo.ownerMail) interfaceCreator.createUserIntereface(this.allowedUsers[i]);
    }
}

var roomCreator = new RoomCreator();