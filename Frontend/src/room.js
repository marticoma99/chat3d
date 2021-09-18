

function createRoom(name) {
    if(core._3Droom){
        //if 3D room representation already created
        document.querySelector("#application").style.display = "grid";
        return;
    }
    var room = new RD.SceneNode({scale: 1.6});
    room.name = name;
    room.loadGLTF("data/prefabs/fullClassroom.glb");
    scene.root.addChild(room);

    var bb = new RD.SceneNode({mesh: core.meshes[1], texture: "bb_texture", shader: "texture", scale: 1.6 }); //pizarra
    scene.root.addChild(bb);
    core.bb = bb;

    for(var i = -2; i < 3; i+=1){
        for(var j = -2; j < 3; j+=1){
            var pos = [i,0,j];
            core.seats_pos.push(pos);
            var desk = new RD.SceneNode({position: pos, scale: 0.20});
            desk.rotate(90*RD.DEG2RAD, [0,1,0]);
            desk.loadGLTF("data/prefabs/desk.glb");
            scene.root.addChild(desk);
            
        }
    }
    document.querySelector("#application").style.display = "grid";
    core._3Droom = true;
}



