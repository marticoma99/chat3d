var t = document.querySelector("#sendButton");
var inputText = document.querySelector("#textMessage");
var avatarName = "data/chat_avatars/av1.PNG"; //init
var avArray = ["av1.PNG", "av2.PNG", "av3.PNG", "av4.PNG", "av5.PNG", "av6.PNG", "av7.PNG", "av8.PNG"];
function CHAT() {

    this.characterName = ""
    var that = this;

    this.keyPresedEvent = function (event) {
        if (event.keyCode == 13) {
            that.sendAndShowOwnMessage(this);
        }
    };

    this.sendOwnMessage = function () {
        var textInput = document.querySelector("#textMessage");
        that.sendAndShowOwnMessage(textInput);
    };
}

CHAT.prototype.sendAndShowOwnMessage = function (messageToShow) {
    avatarName = "data/chat_avatars/" + avArray[core.player.texID];
    this.putMessage(messageToShow.value, core.player.name, avatarName, false);
    var message2send = this.formatMessage("text", messageToShow.value);
    serverHandler.sendMessage(message2send);
    messageToShow.value = "";
};

CHAT.prototype.putMessage = function (messageToShow, senderToShow, avatarPicture, isReciver) {
    var elem = document.createElement("div");
    var message = document.createElement("div");
    var chat = document.querySelector("#allMsg");

    elem.innerText = messageToShow;

    if (isReciver) {
        elem.className = "pChatResponse";
        var avatarPhoto = document.createElement("img");
        avatarPhoto.className = "chatAvatarResponse";
        avatarPhoto.src = avatarPicture;

        var messageName = document.createElement("div");
        messageName.className = "messageContact"
        messageName.innerText = senderToShow;

        var mesageAndContact = document.createElement("div");
        mesageAndContact.className = "messageAndContact"

        message.className = "chatMessasgeResponse";
        mesageAndContact.appendChild(messageName);
        mesageAndContact.appendChild(elem);
        message.appendChild(mesageAndContact);
        message.appendChild(avatarPhoto);
    }
    else {
        elem.className = "pChat"

        var avatarPhoto = document.createElement("img");
        avatarPhoto.className = "chatAvatar";
        avatarPhoto.src = avatarPicture;

        message.className = "chatMessasge"
        message.appendChild(avatarPhoto);
        message.appendChild(elem);
    }

    chat.appendChild(message);
    document.querySelector(".chat").scrollTop = 10000000;
};

CHAT.prototype.formatMessage = function (typeToSend, textToSend) {
    var msg = {
        type: typeToSend,
        content: textToSend,
        username: core.player.name,
        avatar: "data/chat_avatars/" + avArray[core.player.texID]
    };
    return JSON.stringify(msg);
};

var chat = new CHAT();

t.addEventListener("click", chat.sendOwnMessage);
inputText.addEventListener("keydown", chat.keyPresedEvent);