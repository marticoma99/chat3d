function CreateInterfaceElements() {
    this.petitionsContainer = document.querySelector(".petitionsContainer");
    this.peopleZone = document.querySelector("#peopleZone");
    this.addedUsersContainer = document.querySelector(".addedUsersContainer");
    this.myRoomsContainer = document.querySelector(".myRoomsContainer");
}

CreateInterfaceElements.prototype.removeFromHtml = function (idToRemove) { 
    var userToDelete = document.querySelectorAll("#" + idToRemove);

    for (var i = 0; i < userToDelete.length; i++) {
        userToDelete[i].remove();
    }
};

CreateInterfaceElements.prototype.addListenerRemoveUser = function (button, id, email) {
    var that = this;
    console.log("deny button");
    button.addEventListener("click", function () {
        that.removeFromHtml(id);
        var messageToSend = {
            type: "userNotAllowed",
            email: email
        }
        serverHandler.sendMessage(JSON.stringify(messageToSend));
    });
};

CreateInterfaceElements.prototype.addListenerAccept = function (button, id, email) {
    var that = this;
    button.addEventListener("click", function () {
        that.removeFromHtml(id);
        var messageToSend = {
            type: "userAllowed",
            email: email
        };
        serverHandler.sendMessage(JSON.stringify(messageToSend));
    });
};

CreateInterfaceElements.prototype.createEnterPetition = function (userName) {

    var container = document.createElement("div");
    container.className = "petitionToEnter";
    var id = ("userPetition" + userName).replace("@", "").replace(".", "").replace(" ", "");;
    container.setAttribute("id", id);

    var userNameTitle = document.createElement("h2");
    userNameTitle.className = "userNamePetition";
    userNameTitle.innerText = userName;

    var buttons = document.createElement("div");
    buttons.className = "buttonsEnter";

    var acceptButton = document.createElement("button");
    acceptButton.className = "enterButton";
    var imgAccept = document.createElement("img");
    imgAccept.className = "enterPetitionImage";
    imgAccept.src = "icons/accept.png"
    acceptButton.appendChild(imgAccept);
    this.addListenerAccept(acceptButton, id, userName);

    var denyButton = document.createElement("button");
    denyButton.className = "enterButton";
    var imgDeny = document.createElement("img");
    imgDeny.className = "enterPetitionImage";
    imgDeny.src = "icons/deny.png"
    denyButton.appendChild(imgDeny);
    this.addListenerRemoveUser(denyButton, id, userName);

    buttons.appendChild(acceptButton);
    buttons.appendChild(denyButton);

    container.appendChild(userNameTitle);
    container.appendChild(buttons);

    this.petitionsContainer.appendChild(container);
};

CreateInterfaceElements.prototype.deleteUserFromList = function (email) {
    var id = ("#person" + email).replace("@", "").replace(".", "").replace(" ", "");
    if(document.querySelector(id) == null)
        return;
    document.querySelector(id).remove();
}

CreateInterfaceElements.prototype.addListenerDeleteUser = function (button, email) {
    button.addEventListener("click", function () {
        var id = ("#person" + email).replace("@", "").replace(".", "").replace(" ", "");
        document.querySelector(id).remove();
        var messageToSend = {
            type:"deleteUser",
            email: email
        }
        console.log("deleting:", messageToSend);
        serverHandler.sendMessage(JSON.stringify(messageToSend));
        for(i = 0; i < core.characters.length; i++){
            if(core.characters[i].email == email){
                scene.root.removeChild(core.characters[i]);
                core.characters.splice(i, 1);
            }
        }
    })
}

CreateInterfaceElements.prototype.createUsersList = function (userName, imgSrc, isOwner, email) {
    var container = document.createElement("div");
    container.className = "person";
    var id = ("person" + email).replace("@", "").replace(".", "").replace(" ", "");;
    container.setAttribute("id", id);

    var userAvatar = document.createElement("img");
    userAvatar.className = "avatarPerson";
    userAvatar.src = imgSrc;

    var userNameTitle = document.createElement("h2");
    userNameTitle.className = "userNamePeople";
    userNameTitle.innerText = userName;

    container.appendChild(userAvatar);
    container.appendChild(userNameTitle);

    if (isOwner) {
        var optionsIcon = document.createElement("button");
        optionsIcon.className = "kickButton";
        optionsIcon.innerText = "Remove";
        container.appendChild(optionsIcon);
        this.addListenerDeleteUser(optionsIcon, email);
    }

    this.peopleZone.appendChild(container);
};

CreateInterfaceElements.prototype.removeFromHtml = function (idToRemove) {
    var userToDelete = document.querySelectorAll("#" + idToRemove);

    for (var i = 0; i < userToDelete.length; i++) {
        userToDelete[i].remove();
    }
};

CreateInterfaceElements.prototype.addListenerRemove = function (button, id, email) {
    var that = this;
    button.addEventListener("click", function () {
        that.removeFromHtml(id);
        for (var i = 0; i < roomCreator.allowedUsers.length; i++) {
            if (roomCreator.allowedUsers[i] == email) {
                roomCreator.allowedUsers.splice(i, 1);
            }
        }
    });
};

CreateInterfaceElements.prototype.createUserIntereface = function (email) {
    var container = document.createElement("div");
    container.className = "addedUser";
    var id = ("addedUser" + email).replace("@", "").replace(".", "").replace(" ", "");;
    container.setAttribute("id", id);

    var userEmail = document.createElement("h3");
    userEmail.className = "addedUserEmail";
    userEmail.innerText = email;

    var removeButton = document.createElement("button");
    removeButton.className = "removeUserFromRoom";
    removeButton.innerText = "Remove";
    this.addListenerRemove(removeButton, id, email);

    container.appendChild(userEmail);
    container.appendChild(removeButton);

    this.addedUsersContainer.appendChild(container);
};

CreateInterfaceElements.prototype.addListenerRemoveRoom = function (button, id, roomName) {
    var that = this;
    button.addEventListener("click", function () {
        that.removeFromHtml(id);
        var messageToSend = {
            type: "deleteRoom",
            roomName: roomName
        }
        serverHandler.sendMessage(JSON.stringify(messageToSend));
    });
};

CreateInterfaceElements.prototype.addListenerEditRoom = function (button, roomName) {
    var that = this;
    button.addEventListener("click", function () {
        document.querySelector(".administrateRooms").style.display = "none";
        document.querySelector(".roomOptions").style.display = "block";
        roomCreator.loadRoomOptions(roomName);
    });
};

CreateInterfaceElements.prototype.addRoomToMyRooms = function (roomName) {
    var container = document.createElement("div");
    container.className = "myRoom";
    var id = ("myRoom" + roomName).replace("@", "").replace(".", "").replace(" ", "");;
    container.setAttribute("id", id);

    var roomTitle = document.createElement("h2");
    roomTitle.className = "myRoomTitle";
    roomTitle.innerText = roomName;

    var buttons = document.createElement("div");
    buttons.className = "buttonsMyRoom";

    var buttonEdit = document.createElement("button");
    buttonEdit.className = "buttonMyRoom";
    buttonEdit.innerText = "Edit";
    this.addListenerEditRoom(buttonEdit, roomName);

    var buttonRemove = document.createElement("button");
    buttonRemove.className = "buttonMyRoom";
    buttonRemove.innerText = "Remove";
    this.addListenerRemoveRoom(buttonRemove, id, roomName);

    buttons.appendChild(buttonEdit);
    buttons.appendChild(buttonRemove);

    container.appendChild(roomTitle);
    container.appendChild(buttons);

    this.myRoomsContainer.appendChild(container);
};

CreateInterfaceElements.prototype.deleteAllAllowedUsers = function () {
    var userToDelete = document.querySelectorAll(".addedUser");

    for (var i = 0; i < userToDelete.length; i++) {
        userToDelete[i].remove();
    }
}

var interfaceCreator = new CreateInterfaceElements();