gl.captureMouse();
gl.captureKeys();
gl.onmouse = onMouse;
gl.onkeydown = onKey;

core.player = null;
//provisional
//core.player = Character(1, "Player" + Math.random(), core.meshes[0], core.textures[0], "texture", [-4, 0, 3], 1 / 25, true);
//var player = core.player;
//player.pitch = 40;
//s'ha de posar el nom correcte de la sala a la que entra el user
//chat.characterName = player.name;

function draw() {
    if(core.player == null)
        return;  
    document.getElementById('scene').setAttribute("style","width:100%");
    document.getElementById('scene').setAttribute("style","height:100%");
    var parent = canvas.parentNode;
    var rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    camera.aspect = canvas.width / canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //render scene
    renderer.render(scene, camera);
}

function update(dt) {
    if(core.player == null)
        return;

    player = core.player;
    chat.characterName = player.name;
    
    core.canvas_bb = canvas_paint;

    tex_blackboard.uploadImage(core.canvas_bb);

    core.near_BB(core.player.position);

    if(dt > 0.01)
        dt = 0.01;

    var t = getTime() * 0.001;

    if(!freecam){
        core.movePeople(t,dt,0.5);
        core.attachCamera(player.position);
        core.moveFOV(player);
    }else{
        //free camera
		var delta = [0,0,0];
		if( gl.keys["W"] )
			delta[2] = -1;
		else if( gl.keys["S"] )
			delta[2] = 1;
		if( gl.keys["A"] )
			delta[0] = -1;
		else if( gl.keys["D"] )
			delta[0] = 1;
		camera.moveLocal(delta,dt * 10);
    }
    scene.update(dt);
}

function inside(e) {
    if (e.canvasx <= canvas.width && e.canvasy <= canvas.height) {
        return true;
    }
    return false;
}

function onMouse(e) {
    
    if(core.painting)
        return;

    if (e.type == "mousedown" && inside(e)) {
        if(fpc) return;
        if (!core.player.letsMove) {
            core.player.letsMove = true;
        } else if (player.letsMove) {
           core.updateTarget(core.player, e.canvasx, e.canvasy);
        }
    }

    if(e.dragging)
	{
        if(freecam){
            //rotating camera
            if(e.leftButton){
                camera.rotate(e.deltax * -0.001, [0,1,0] );
                var right = camera.getLocalVector([1,0,0]);
                camera.rotate(e.deltay * -0.001,right );
            }else if(e.rightButton){
                camera.orbit(e.deltax * 0.001, [0,1,0] );
                var right = camera.getLocalVector([1,0,0]);
                camera.orbit(e.deltay * 0.001,right );
            }
        }else if(fpc){
            player.rotate(e.deltax * -0.001, [0,1,0] );
            player.pitch += e.deltay*0.1;
            if(player.pitch < -45)
                player.pitch = -45;
            else if(player.pitch > 45)
                player.pitch = 45;
        }
	}
}

function onKey(e)
{   
    //debug
	if(e.key == "Tab")
	{
		freecam = !freecam;
		e.preventDefault();
		e.stopPropagation();
		return true;
	}

    /*
    if(e.key == "1"){
        if(player.sit){
            fpc = false;
            player.standUp();
            serverHandler.standUp(player);
        }
    }
    if(e.key == "2"){
        log_mngr.show_config();
    }
    if(e.key == "3"){
        core.sendToken(); 
    }
    //"truco" en caso de q el server no este funcionando
    if(e.key == "4"){
        core.player = Character(1, "Player", core.meshes[0], core.textures[0], "texture", [-4, 0, 3], 1 / 25, true);
        core.player.role = "owner";
        log_container.style.display = "none";
        createRoom(core.room_name);
        document.querySelector("#application").style.display = "grid";
    }
    if(e.key == "7"){
        blackboard_paint.style.display = "block";
    }*/
    
}

var last = now = 0;
//main render loop
last = now = getTime();
requestAnimationFrame(animate);
function animate() {
    requestAnimationFrame(animate);

    last = now;
    now = getTime();
    var dt = (now - last) * 0.001;

    draw();
    update(dt);
}

