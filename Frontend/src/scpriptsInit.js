var adminRoomButton = document.querySelector("#adminRoomButton");
var roomOptionsButton = document.querySelector("#roomOptionsButton");
var newUserButton = document.querySelector(".newUserButton");
var createRoomButton = document.querySelector("#createRoomButton");
var enterRoom = document.querySelector("#joinRoomButton");
var homeFromNewRoom = document.querySelector("#homeFromNewRoom");
var homeFromAdmin = document.querySelector("#homeFromAdmin");

function antiRoomCopy(){
    document.querySelector("#newRoomName").value = "";
    document.querySelector("#maxStudents").value = "";
    document.querySelector("#isPublicCheckbox").checked = false;

    roomCreator.emptyRoomProperties();
    interfaceCreator.deleteAllAllowedUsers();
}

homeFromNewRoom.addEventListener("click", function(){
    document.querySelector(".roomOptions").style.display = "none";
    document.querySelector(".roomSelectorContainer").style.display = "flex";
    antiRoomCopy();
});

homeFromAdmin.addEventListener("click", function(){
    document.querySelector(".administrateRooms").style.display = "none";
    document.querySelector(".roomSelectorContainer").style.display = "flex";
});

adminRoomButton.addEventListener("click", function () {
    document.querySelector(".roomSelectorContainer").style.display = "none";
    document.querySelector(".administrateRooms").style.display = "flex";
    document.querySelector(".myRoomsContainer").innerHTML = "";

    var messageToSend = {
        type: "getUserRooms",
        email: log_mngr.mail
    }
    serverHandler.sendMessage(JSON.stringify(messageToSend));
});

roomOptionsButton.addEventListener("click", function () {
    document.querySelector(".administrateRooms").style.display = "none";
    document.querySelector(".roomOptions").style.display = "block";

});

newUserButton.addEventListener("click", function () {
    var input = document.querySelector(".newUserInput");
    var inputText = input.value;
    input.value = "";
    if (inputText != log_mngr.mail) {
        interfaceCreator.createUserIntereface(inputText);
        roomCreator.addAllowedUser(inputText);
    }
});

createRoomButton.addEventListener("click", function () {
    roomCreator.addRoomName(document.querySelector("#newRoomName").value);
    roomCreator.setMaxStudents(document.querySelector("#maxStudents").value);
    roomCreator.setIsPublic(document.querySelector("#isPublicCheckbox").checked);

    var messageTosend = "";
    if (roomCreator.roomModify) messageTosend = roomCreator.formatMessageModifyRoom();
    else messageTosend = roomCreator.formatMessage();

    serverHandler.sendMessage(JSON.stringify(messageTosend));
});


enterRoom.addEventListener("click", function () {
    var roomName = core.room_name = document.querySelector("#roomJoinName").value;

    if (roomName == "") {
        document.querySelector(".userNotAllowedToRoom").style.opacity = 1;
        setTimeout(function(){
            document.querySelector(".userNotAllowedToRoom").style.opacity = 0;
        }, 4000);
        return
    }

    var messageToSend = {
        type: "checkAllowedUser",
        content: {
            userName: log_mngr.mail,
            roomName: roomName,
            userInfo: {
                id: 1,
                name: log_mngr.mail,
                email: core.player.email,
                mesh: 0,
                texture: core.player.texID,
                position: [-4, 0, 3],
                scale: (1 / 25),
                room_name: roomName
            }
        }
    }

    serverHandler.sendMessage(JSON.stringify(messageToSend));
    document.querySelector("#roomJoinName").value = "";
})