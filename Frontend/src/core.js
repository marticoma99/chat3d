
//document.querySelector(".applicationFullScreen").style.display = "none";
var canvas = document.querySelector("#main_canvas");
var parent = canvas.parentNode;
var rect = parent.getBoundingClientRect();
canvas.width = rect.width;
canvas.height = rect.height;

var gl = GL.create({ canvas: canvas });
var renderer = new RD.Renderer(gl);
var scene = new RD.Scene();

var camera = new RD.Camera();
camera.perspective(50, gl.canvas.width / gl.canvas.height, 1, 1000);
camera.lookAt([0, 4, 4], [0, 0, 0], [0, 1, 0]);
camera.near = 0.1;

var freecam = false;
//walkarea
var walk_area = new WalkArea();
var size = 4.3; 
walk_area.addRect([-size,0,-size],size*2,size*2);

var fpc = false; //activate first person camera

function CORE(){
    var that = this;
    this.player = null;
    this.characters = [];
    this._3Droom = false;
    this.room=null;
    this.rooms_name=[];
    this.meshes = ["person.wbin", "blackBoard.obj"];
    this.textures = ["male1.png", "male2.png", "male3.png", "male4.png","female1.png", "female2.png", "female3.png", "female4.png"];
    this.animations_names = ["walk.skanim","idle.skanim","sitting_idle.skanim"];
    this.animations = {};

    this.room_name = "";

    this.canvas_bb =  null;
    this.my_room = true;
    this.painting = false;
    this.seats_pos = [];
    this.open_painting = false;

    this.init = function(){
        for (var i = 0; i < that.meshes.length; i++) {
            var mesh = GL.Mesh.fromURL("data/meshes/" + that.meshes[i]);
            renderer.meshes[that.meshes[i]] = mesh;
        }
        for (var i = 0; i < that.textures.length; i++) {
            var texture = GL.Texture.fromURL("data/textures/" + that.textures[i], { minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR });
            renderer.textures[that.textures[i]] = texture;
        }
        for (var i = 0; i < that.animations_names.length; i++) {
            that.loadAnimation(that.animations_names[i],"data/animations/" + that.animations_names[i]);
        }
        document.querySelector("#scene").style.setProperty('height','initial');
    };
    
    this.loadAnimation = function( name, url )
    {
        var anim = new RD.SkeletalAnimation();
        anim.load(url);
        that.animations[ name ] = anim;
    };

    this.attachCamera=function(position){
        var eye = center = [0,0,0];

        if(fpc){
            eye = player.localToGlobal([0,12,0.5]);
            var front = [0,0,1];
            vec3.rotateX(front,front,player.pitch*RD.DEG2RAD);
            front = player.getLocalVector(front);
            var center = vec3.add(vec3.create(),eye,front);
            
        }else{
            eye = [position[0]+5, position[1] + 8, position[2] + 5];
            center = position;
        }

        
        camera.lookAt(eye, center, [0, 1, 0]);
    };

    this.moveFOV = function(character){
        if(fpc){
            camera.fov = 70;
            return;
        }
        var value = 0;
        if (character.letsMove) {
            value = 50;
        } else {
            value = 20;
        }
        camera.fov = that.lerp(camera.fov, value, 0.04);
        if (that.distance1(camera.fov, value) < 0.02) { camera.fov = value; }
    };

    this.distance1 = function(x, tx) {
        return Math.sqrt((tx - x) ** 2);
    };
    this.distance2 = function(x, tx, y, ty) {
        return Math.sqrt((tx - x) ** 2 + (ty - y) ** 2);
    };
    this.distance3 = function(x, tx, y, ty, z, tz) {
        return Math.sqrt((tx - x) ** 2 + (ty - y) ** 2 + (tz - z) ** 2);
    };
    this.lerp=function(a, b, f) {
        return a * (1 - f) + b * f;
    };

    this.movePeople = function(t, dt, speed){
        for(var i = 0; i < that.characters.length; i++){
            that.characters[i].moveMe(dt,speed);
            that.characters[i].animateCh(t,i);
        }
    };

    this.updateTarget = function(ch, x, y){
        if(core.painting)
            return;
        ch.sit = false;
        var ray = camera.getRay(x, y);
        var coll = ray.testPlane([0, 0, 0], [0, 1, 0]);
        if (coll) {
            var pos =  walk_area.adjustPosition(ray.collision_point);
            var sit = that.near_chair(pos);

            if(sit.status){
                ch.target_pos = sit.position;
                ch.sit = true;
            }else{
                ch.target_pos = pos;
            }
            var vecx = ch.target_pos[0] - ch.position[0];
            var vecy = ch.target_pos[1] - ch.position[1];
            var vecz = ch.target_pos[2] - ch.position[2];
            ch.vec = [vecx, vecy, vecz];
            serverHandler.updateTarget(ch);//send data to server
        }
    };
    this.near_chair = function(pos){
        var result = {status: false, position:[0,0,0]};
        for(var i = 0; i < that.seats_pos.length; i++){
            if(that.distance2(that.seats_pos[i][0],pos[0],that.seats_pos[i][2], pos[2]) <= 0.3){
                result.status = true;
                result.position = that.seats_pos[i];
                break;
            }
        }
        return result;
    };

    this.near_BB = function(ch_pos){
        //to use the blackboard you have to be near it
        var p1 = [-1.7877821922302246, 0, -4.300000190734863];
        var p2 = [-0.11813712120056152, 0, -4.300000190734863];
        var p3 = [1.7871739864349365, 0, -4.295997142791748];
        if(that.player.role == "owner" || that.open_painting){
            var distp1 = that.distance2(p1[0], ch_pos[0], p1[2], ch_pos[2]);
            var distp2 = that.distance2(p2[0], ch_pos[0], p2[2], ch_pos[2]);
            var distp3 = that.distance2(p3[0], ch_pos[0], p3[2], ch_pos[2]);
            if(distp1 <= 1 || distp2 <= 1 || distp3 <= 1){
                if(!that.painting){
                    beginPaintButton.style.display = "block";
                    return;
                }     
            }
        }
        beginPaintButton.style.display = "none";
    };

    this.cleanCharactersArray = function(){
        for(var i = 0; i < that.characters.length; i++){
            if(that.characters[i] == that.player)
                continue;

            scene.root.removeChild(that.characters[i]);
            that.characters.splice(i, 1);
        }
        console.log("Characters array cleaned:", that.characters);
    };

    this.disconnectFromRoom = function(){
        core.cleanCharactersArray(); 
        reset(); //reset blackboard 
        that.open_painting = false;
        document.querySelector("#application").style.display = "none";
        document.querySelector(".roomSelectorContainer").style.display = "flex";

        document.querySelector("#peopleZone").innerHTML = '<h1 class="peopleTitle">People connected</h1>';
        document.querySelector(".petitionsContainer").innerHTML = '<h1 class="enterPetitions">Enter petitions</h1>';
        document.querySelector("#allMsg").innerHTML = '';
        core.player.position = core.player.target_pos = [-4, 0, 3];
        core.player.sit = false;
        fpc = false;
        //eliminar mensajes chat y lista de contactos
    };

    this.storeItem = function(itemname, value){ 
        localStorage.setItem(itemname,value);
    };

    this.sendToken = function(){
        var token = localStorage.getItem("token");
        var mail = localStorage.getItem("mail");
        if(token != null && mail != null){
            serverHandler.sendLoginToken(token, mail);
        }
    }

    this._ = function(selector){
        return document.querySelector(selector);
    };
}

var core = new CORE();
core.init();