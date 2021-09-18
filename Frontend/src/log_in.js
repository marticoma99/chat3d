
function LOGIN(){
    var that = this;
    this.bool_in = false;
    this.mail = "";
    this.username = "";
    this.user_exists = false;
    this.sendLogInfo = function(){
        var msg = {};
        if(that.bool_in){
            msg.type = "sign_in";
        }else{
            that.username = msg.username = name_input.value;
            msg.type = "sign_up";
        }
        that.mail = msg.mail = mail_input.value;
        msg.pass = pass_input.value;
        server.send(JSON.stringify(msg));
        mail_input.value = "";
        pass_input.value="";
        name_input.value="";
    };
};

LOGIN.prototype.show_log = function (sign_in){
    log_select.style.display ="none";
    log.style.display = "block";
    if(sign_in == true){
        name_input.style.display="none";
        document.querySelector(".titleWelcome").innerHTML = "LogIn";
    }else{
        document.querySelector(".titleWelcome").innerHTML = "Sign Up";
        document.querySelector(".titleWelcome").style.marginTop = "15vh";
    }
}

LOGIN.prototype.show_config = function (){
    log.style.display = "none";
    config.style.display = "block";
    document.querySelector(".titleWelcome").style.display = "none";
    //document.querySelector(".titleWelcome").innerHTML = "Choose";
}

LOGIN.prototype.error = function(type){
    var err_msg = document.querySelector("#userError");
    
    if(type == "password"){
        console.log("Wrong password");
        err_msg.innerText = "Wrong password or account.";
    }else if(type == "userExists"){
        console.log("Error: User already registered with this email.");
        err_msg.innerText = "Error: User already registered with this email.";
    }
    err_msg.style.opacity = 1;
    setTimeout(function () {
        err_msg.style.opacity = 0;
    }, 6000);
}

var log_mngr = new LOGIN();

sign_in.addEventListener("click",function(){
    log_mngr.show_log(true);
    log_mngr.bool_in = true;
});

sign_up.addEventListener("click",function(){
    log_mngr.show_log(false);
    log_mngr.bool_in = false;
});

continue_but.addEventListener("click",log_mngr.sendLogInfo);

var selected_texture = 0;

continue_but_conf.addEventListener("click",function(){
    console.log("selected texture:", selected_texture);
    var msg = {
        type: "change_tex",
        texture:selected_texture,
        mail: log_mngr.mail
    };
    server.send(JSON.stringify(msg));

    core.player = Character(1, log_mngr.username, core.meshes[0], core.textures[selected_texture], "texture", [-4, 0, 3], 1 / 25, true, log_mngr.mail, selected_texture);
    console.log("player name:", core.player.name);
    log_container.style.display = "none";
    document.querySelector(".roomSelectorContainer").style.display = "flex";
});


//configurator
var canvas_conf = document.getElementById('character_select');
var context = canvas_conf.getContext("2d");

function paint_option(source){
    var image = new Image();
    image.src = 'data/configurator_images/'+source;
    var scaleFactor = screen.height / 920;
    image.onload = function(){
        canvas_conf.width = image.width * scaleFactor;
        canvas_conf.height = image.height * scaleFactor;
        context.drawImage(image, 0, 0, image.width * scaleFactor, image.height * scaleFactor);
    }
}

var texture_options = ['texture_0.PNG','texture_1.PNG','texture_2.PNG','texture_3.PNG','texture_4.PNG','texture_5.PNG','texture_6.PNG','texture_7.PNG'];
paint_option(texture_options[0]);

var nextButton = document.getElementById('nextButton');
var prevButton = document.getElementById('prevButton');

nextButton.addEventListener("click", function(){
    if(selected_texture+1 < texture_options.length){
        selected_texture++;
    }
    paint_option(texture_options[selected_texture]);
});
prevButton.addEventListener("click", function(){
    if(selected_texture-1 >= 0){
        selected_texture--;
    }
    paint_option(texture_options[selected_texture]);
});


//logout
var logoutButton = document.getElementById('closeSessionButton');
logoutButton.addEventListener("click",function(){
    core.storeItem("token", null);
    core.storeItem("mail", null);

    scene.root.removeChild(core.player);
    core.characters.splice(0, 1);
    core.player = null;
    log.style.display = "none";
    config.style.display = "none";
    document.querySelector(".roomSelectorContainer").style.display = "none";
    document.querySelector(".titleWelcome").innerText = "Welcome!";
    document.querySelector(".titleWelcome").style.display = "block";
    log_select.style.display ="block";
    log_container.style.display ="block"; 
});