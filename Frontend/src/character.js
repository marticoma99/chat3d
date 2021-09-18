function Character(id, name, mesh, texture, shader, start_pos, scale, play_er, email, texID, sit) {
    var that = this;

    var node = new RD.SceneNode({ position: start_pos, color: [1, 1, 1, 1], mesh: mesh, texture: texture, shader: shader, scale: scale });
    node.id = id;
    node.name = name;
    node.target_pos = start_pos;
    node.vec = new Float32Array([0, 0, 0]);
    node.letsMove = false;
    node.cam = 0;
    node.current_anim = "idle.skanim";
    node.scale = scale;

    if(typeof sit === "undefined"){
        node.sit = false;
    }else{
        node.sit = sit;
    }

    node.addOffsetPos = function(offset){
        var x = node.position[0]+offset[0];
        var y = node.position[1]+offset[1];
        var z = node.position[2]+offset[2];
        node.position = [x,y,z];
    };

    if(node.sit==true){
        var offset = [0,0.05,0.1];
        node.addOffsetPos(offset);
    } 

    node.previous_pos = [0,0,0];
    node.role = "guest";
    node.email = email;
    node.texID = texID;
    node.pitch = 40;

    var rnd = Math.random() *(180-45) + 45;
    node.rotate(rnd*RD.DEG2RAD,[0,1,0]);

    node.moveMe=function(dt, speed) {

        if (node.vec[0] == 0 && node.vec[1] == 0 && node.vec[2] == 0 && !node.sit) {
            node.current_anim = "idle.skanim";
            return;
        }else if (node.vec[0] == 0 && node.vec[1] == 0 && node.vec[2] == 0 && node.sit){
            node.current_anim = "sitting_idle.skanim";
            if(!play_er)
                node.orientTo([node.target_pos[0],node.target_pos[1],node.target_pos[2]-1], true, [0,1,0]);
            else
                fpc = true;

            return;
        }
        
        node.orientTo(node.target_pos, true, [0,1,0]);
        node.current_anim = "walk.skanim";

        var x = node.position[0];
        var y = node.position[1];
        var z = node.position[2];
        x += node.vec[0] * dt * speed;
        y += node.vec[1] * dt * speed;
        z += node.vec[2] * dt * speed;
        node.position = [x,y,z];
    
        var dist = core.distance3(node.position[0], node.target_pos[0], node.position[1], node.target_pos[1], node.position[2], node.target_pos[2]);
        if (dist < 0.05) {
            node.position = node.target_pos;
            node.vec = new Float32Array([0, 0, 0]);
            node.letsMove = false;
            if(node.sit){
                node.previous_pos = node.position;
                var offset = [0,0.05,0.1];
                node.addOffsetPos(offset);
                node.orientTo([node.target_pos[0],node.target_pos[1],node.target_pos[2]-1], true, [0,1,0]);
                if(play_er){
                    standUpButton.style.display = "";
                }
            }
        }
        
    };

    node.standUp = function(){
        node.sit = false;
        var offset = [-0.5,-0.05,-0.1];
        node.addOffsetPos(offset);
        node.target_pos = node.position;
        node.vec = [0,0,0];
        if(play_er){
            standUpButton.style.display = "none";
        }
    };

    node.animateCh = function(t, offset){
        var anim = core.animations[node.current_anim ];
        if(anim && anim.duration){
            anim.assignTime( t + offset, true );
 
            node.assignAnimation(anim);
            node.shader = "texture_skinning";
        }
    };

    scene.root.addChild(node);
    core.characters.push(node);
    core.rooms_name.push(node.name);

    if(play_er)
        return node;
        
}


standUpButton.addEventListener("click",function(){
    fpc = false;
    core.player.standUp();
    serverHandler.standUp(core.player);
});