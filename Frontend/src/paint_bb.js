
var blackboard_paint = document.querySelector(".paint_app");
blackboard_paint.style.display = "none";

var canvas_paint = document.querySelector("#paint_canvas");
var ctx = canvas_paint.getContext("2d");

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas_paint.width, canvas_paint.height);

var painting = false;

function start_paint(x,y, color, size, mode){
    painting = true;
    draw_line(x,y, color, size, mode);
}

function end_paint(){
    painting = false;
    ctx.beginPath();
    serverHandler.sendPaintingEnd();
}

function draw_line(x, y, color, size, mode){

    if(mode == "owner"){
        if(!painting) return;
    }

    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineTo(x,y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x,y);

    if(mode == "owner"){
        serverHandler.sendPaintingInfo(color, "paint", size, x, y);
    }
}   

function fill(color, mode){ 
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas_paint.width, canvas_paint.height);
    if(mode == "owner"){
        serverHandler.sendPaintingInfo(color, "fill");
    }
}

function reset(){
    fill("white","guest");
}

function sendCanvasBB(email){
    canvas_paint.toBlob(function(blob){
        serverHandler.sendBB(email, blob);
    });
}


function showInCanvas(blob){
    var img = new Image();
    url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = function(){
        ctx.moveTo(0,0);
        ctx.drawImage(img, 0, 0);
        ctx.beginPath();
    }
}


function onMouse(event){
    var rect = canvas_paint.getBoundingClientRect();
    var canvasx = event.clientX - rect.left;
    var canvasy = event.clientY - rect.top;
    var type = document.querySelector("#tool-pencil").checked?"pen":"fill";
    var color = document.querySelector("#pen_color").value;
    var size = parseInt(document.querySelector("#pen_size").value);
    if(event.type == "mousedown"){
        if(type == "pen")start_paint(canvasx, canvasy, color, size, "owner");
        else fill(color, "owner");
    }else if(event.type =="mouseup"){
        end_paint();
    }else if(event.type =="mousemove"){
        draw_line(canvasx, canvasy, color, size, "owner");
    }
}

var tex_blackboard = GL.Texture.fromImage(canvas_paint);
gl.textures["bb_texture"] = tex_blackboard;

canvas_paint.addEventListener("mousedown", onMouse );
canvas_paint.addEventListener("mouseup", onMouse );
canvas_paint.addEventListener("mousemove", onMouse);

var reset_button = document.querySelector("#reset");
reset_button.addEventListener("click", reset);
var close_button = document.querySelector("#closePaint");
close_button.addEventListener("click", function(){
    core.painting = false;
    blackboard_paint.style.display = "none";
});
beginPaintButton.addEventListener("click", function(){
    core.painting = true;
    closeMenu();
    blackboard_paint.style.display = "block";
    beginPaintButton.style.display = "none";
});


