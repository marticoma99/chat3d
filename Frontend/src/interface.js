var menuOptions = document.querySelector(".optionsContainer");
var openMenuButton = document.querySelector(".openMenu");
var closeMenuButton = document.querySelector(".closeMenu");
var applicationContainer = document.querySelector("#application");

var chatZone = document.querySelector("#chatZone");
var configurationZone = document.querySelector("#confugurationZone");
var peopleZone = document.querySelector("#peopleZone");

var buttonChat = document.querySelector("#buttonChat");
var buttonConfig = document.querySelector("#buttonConfig");
var buttonPeople = document.querySelector("#buttonPeople");

buttonChat.addEventListener("click", changeChat);
buttonConfig.addEventListener("click", changeConfig);
buttonPeople.addEventListener("click", changePeople);

function changeChat() {
    chatZone.style.display = "block";
    configurationZone.style.display = "none";
    peopleZone.style.display = "none";
}

function changeConfig() {
    configurationZone.style.display = "block";
    chatZone.style.display = "none";
    peopleZone.style.display = "none";
}

function changePeople() {
    peopleZone.style.display = "block";
    configurationZone.style.display = "none";
    chatZone.style.display = "none";
}

openMenuButton.addEventListener("click", openMenu);
closeMenuButton.addEventListener("click", closeMenu);

function openMenu() {
    if(core.painting) return;
    menuOptions.classList.add("animationEnter");
    menuOptions.classList.remove("animationClose");
    menuOptions.style.width = "100%";

    closeMenuButton.classList.remove("animationClose");
    setTimeout(function () { closeMenuButton.classList.add("animationEnter"); closeMenuButton.style.display = "block"; }, 115)
    setTimeout(function () { openMenuButton.style.display = "none"; }, 200);

    applicationContainer.classList.add("animationOpenAplication");
    applicationContainer.classList.remove("animationCloseAplication");
    applicationContainer.classList.add("applicationOptions");
    applicationContainer.classList.remove("applicationFullScreen");
}

function closeMenu() {
    menuOptions.classList.remove("animationEnter");
    menuOptions.classList.add("animationClose");
    setTimeout(function () { menuOptions.style.width = "0%" }, 1000);

    closeMenuButton.classList.remove("animationEnter");
    closeMenuButton.classList.add("animationClose");
    setTimeout(function () { closeMenuButton.style.display = "none"; }, 500);
    setTimeout(function () { openMenuButton.style.display = "block"; }, 500);

    applicationContainer.classList.add("animationCloseAplication");
    applicationContainer.classList.remove("animationOpenAplication");
    applicationContainer.classList.add("applicationFullScreen");
    applicationContainer.classList.remove("applicationOptions");
}

var homeButton = document.querySelector(".homeButton");
homeButton.addEventListener("click",function(){
    if(core.painting) return;
    core.disconnectFromRoom();
    serverHandler.disconnectFromRoom();
});

var allowBB = document.querySelector("#allowBB");
allowBB.addEventListener("click", function(){
    core.open_painting = allowBB.checked;
    console.log("BlackBoard:",allowBB.checked);
    var msg ={
        type: "allowBB",
        status: allowBB.checked
    };
    serverHandler.sendMessage(JSON.stringify(msg));
});