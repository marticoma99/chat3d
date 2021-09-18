//This file contains two animation methods, one for single track animations (used in GLTF)
//and one for a full skeletal animation (which is more efficient when working with skeletal characters)

(function(global){

var RD = global.RD = global.RD || {};

RD.Animations = {};

//Animation contains tracks that contain keyframes
function Animation()
{
	this.name = "";
	this.tracks = [];
	this.duration = 10;
}

Animation.prototype.addTrack = function(track, group)
{
	//search similar
	if(group)
	for(var i = 0; i < this.tracks.length; ++i)
	{
		var t = this.tracks[i];
		if( t.target_node == track.target_node )
		{
			this.tracks.splice(i+1,0,track);
			return;
		}
	}
	this.tracks.push(track);
}

Animation.prototype.applyAnimation = function( root_node, time, interpolation )
{
	for(var i = 0; i < this.tracks.length; ++i)
	{
		var track = this.tracks[i];
		track.applyTrack( root_node, time, interpolation );
	}
}

Animation.prototype.serialize = function()
{
	var o = {
		name: this.name,
		duration: this.duration,
		tracks: []
	};

	for(var i = 0; i < this.tracks.length; ++i)
	{
		var track = this.tracks[i];
		o.tracks.push( track.serialize() );
	}	

	return o;
}

Animation.prototype.configure = function(o)
{
	this.name = o.name;
	this.duration = o.duration;
	this.tracks.length = 0;

	for(var i = 0; i < o.tracks.length; ++i)
	{
		var track = new RD.Animation.Track();
		track.configure( o.tracks[i] );
		this.tracks.push( track );
	}	

	return o;
}

Animation.prototype.findNearestLeft = function( time )
{
	var nearest_time = 0;
	for(var i = 0; i < this.tracks.length; ++i)
	{
		var track = this.tracks[i];
		var index = track.findTimeIndex( time );
		if(index == -1)
			continue;
		var keyframe_time = track.data[index];
		if( keyframe_time > nearest_time )
			nearest_time = keyframe_time;
	}
	return nearest_time;
}

Animation.prototype.findNearestRight = function( time )
{
	var nearest_time = this.duration;
	for(var i = 0; i < this.tracks.length; ++i)
	{
		var track = this.tracks[i];
		var index = track.findTimeIndex( time );
		if(index == -1)
			continue;
		var keyframe_time = track.data[index + 1];
		if( keyframe_time != null && keyframe_time < nearest_time )
			nearest_time = keyframe_time;
	}
	return nearest_time;
}

RD.Animation = Animation;

function Track()
{
	this.enabled = true;
	this.target_node = ""; //id of target name
	this.target_property = ""; //name of property
	this.type = RD.SCALAR; //value_size per keyframe is derived from this type using RD.TYPES_SIZE[ type ]. 0 means an object/string/boolean
	this.data = [];
	this.packed_data = false;//tells if data is in Array format (easy to manipulate) or Typed Array format (faster)

	this._target = null; //the object that will receive the samples
}

Animation.Track = Track;

Object.defineProperty( Track.prototype, "value_size", {
	set: function(v)
	{
		throw("cannot be set, use type instead");
	},
	get: function()
	{
		return RD.TYPES_SIZE[ this.type ];
	}
});


/**
* Adds a new keyframe to this track given a value
* @method addKeyframe
* @param {Number} time time stamp in seconds
* @param {*} value anything you want to store, if omited then the current value is used
* @param {Boolean} skip_replace if you want to replace existing keyframes at same time stamp or add it next to that
* @return {Number} index of keyframe
*/
Track.prototype.addKeyframe = function( time, value, skip_replace )
{
	var value_size = this.value_size;
	if( value_size > 1 )
		value = new Float32Array( value ); //clone

	//if(this.packed_data)
	//	this.unpackData();

	for(var i = 0; i < this.data.length; ++i)
	{
		if(this.data[i][0] < time )
			continue;
		if(this.data[i][0] == time && !skip_replace )
			this.data[i][1] = value;
		else
			this.data.splice(i,0, [time,value]);
		return i;
	}

	this.data.push( [time,value] );
	return this.data.length - 1;
}

/**
* returns a keyframe given an index
* @method getKeyframe
* @param {Number} index
* @return {Array} the keyframe in [time,data] format
*/
Track.prototype.getKeyframe = function( index )
{
	if(index < 0 || index >= this.data.length)
	{
		console.warn("keyframe index out of bounds");
		return null;
	}

	var value_size = RD.TYPES_SIZE[ this.type ];

	if(this.packed_data)
	{
		var pos = index * (1 + value_size );
		if(pos > (this.data.length - value_size) )
			return null;
		return [ this.data[pos], this.data.subarray(pos+1, pos+value_size+1) ];
		//return this.data.subarray(pos, pos+this.value_size+1) ];
	}

	return this.data[ index ];
}

/**
* Returns nearest index of keyframe with time equal or less to specified time (Dichotimic search)
* @method findTimeIndex
* @param {number} time
* @return {number} the nearest index (lower-bound)
*/
Track.prototype.findTimeIndex = function(time)
{
	var data = this.data;
	if(!data || data.length == 0)
		return -1;

	var value_size = RD.TYPES_SIZE[ this.type ];

	if(this.packed_data)
	{
		var offset = value_size + 1; //data size plus timestamp
		var l = data.length;
		var n = l / offset; //num samples
		var imin = 0;
		var imid = 0;
		var imax = n;

		if(n == 0)
			return -1;
		if(n == 1)
			return 0;

		//time out of duration
		if( data[ (imax - 1) * offset ] < time )
			return (imax - 1);

		//dichotimic search
		// continue searching while [imin,imax] are continuous
		while (imax >= imin)
		{
			// calculate the midpoint for roughly equal partition
			imid = ((imax + imin)*0.5)|0;
			var t = data[ imid * offset ]; //get time
			if( t == time )
				return imid; 
			//when there are no more elements to search
			if( imin == (imax - 1) )
				return imin;
			// determine which subarray to search
			if (t < time)
				// change min index to search upper subarray
				imin = imid;
			else         
				// change max index to search lower subarray
				imax = imid;
		}
		return imid;
	}

	//unpacked data
	var n = data.length; //num samples
	var imin = 0;
	var imid = 0;
	var imax = n;

	if(n == 0)
		return -1;
	if(n == 1)
		return 0;

	//time out of duration
	if( data[ (imax - 1) ][0] < time )
		return (imax - 1);

	while (imax >= imin)
	{
		// calculate the midpoint for roughly equal partition
		imid = ((imax + imin)*0.5)|0;
		var t = data[ imid ][0]; //get time
		if( t == time )
			return imid; 
		//when there are no more elements to search
		if( imin == (imax - 1) )
			return imin;
		// determine which subarray to search
		if (t < time)
			// change min index to search upper subarray
			imin = imid;
		else         
			// change max index to search lower subarray
			imax = imid;
	}

	return imid;
}

//returns value given a time and a interpolation method
Track.prototype.getSample = function( time, interpolate, result )
{
	if(!this.data || this.data.length === 0)
		return undefined;

	if(this.packed_data)
		return this.getSamplePacked( time, interpolate, result );
	return this.getSampleUnpacked( time, interpolate, result );
}

//used when sampling from a unpacked track (where data is an array of arrays)
Track.prototype.getSampleUnpacked = function( time, interpolation, result )
{
	var value_size = RD.TYPES_SIZE[ this.type ];
	var duration = this.data[ this.data.length - 1 ][0];
	time = Math.clamp( time, 0, duration );

	var index = this.findTimeIndex( time );
	if(index === -1)
		index = 0;

	var index_a = index;
	var index_b = index + 1;
	var data = this.data;
	var value_size = RD.TYPES_SIZE[ this.type ];

	if(!interpolation || value_size == 0 || (data.length == 1) || index_b == data.length || (index_a == 0 && this.data[0][0] > time)) //(index_b == this.data.length && !this.looped)
		return this.data[ index ][1];

	var a = data[ index_a ];
	var b = data[ index_b ];

	var t = (b[0] - time) / (b[0] - a[0]);

	//multiple data
	if( value_size > 1 )
	{
		result = result || this._result;
		if( !result || result.length != value_size )
			result = this._result = new Float32Array( value_size );
	}

	if(interpolation === RD.LINEAR)
	{
		if( value_size == 1 )
			return a[1] * t + b[1] * (1-t);

		return RD.interpolateLinear( a[1], b[1], t, result, this.type, value_size, this );
	}
	else if(interpolation === RD.CUBIC)
	{
		var pre_a = index > 0 ? data[ index - 1 ] : a;
		var post_b = index < data.length - 2 ? data[ index + 2 ] : b;

		if(value_size === 1)
			return RD.EvaluateHermiteSpline(a[1],b[1],pre_a[1],post_b[1], 1 - t );

		result = RD.EvaluateHermiteSplineVector( a[1], b[1], pre_a[1], post_b[1], 1 - t, result );

		if(this.type == RD.QUAT)
		{
			quat.slerp( result, b[1], a[1], t ); //force quats without CUBIC interpolation
			quat.normalize( result, result );
		}
		else if(this.type == RD.TRANS10)
		{
			var rotR = result.subarray(3,7);
			var rotA = a[1].subarray(3,7);
			var rotB = b[1].subarray(3,7);
			quat.slerp( rotR, rotB, rotA, t );
			quat.normalize( rotR, rotR );
		}

		return result;
	}

	return null;
}

//used when sampling from a packed track (where data is a typed-array)
Track.prototype.getSamplePacked = function( time, interpolation, result )
{
	if(!this.data.length)
		return null;

	var value_size = RD.TYPES_SIZE[ this.type ];
	var duration = this.data[ this.data.length - value_size - 1 ];
	time = Math.clamp( time, 0, duration );

	var index = this.findTimeIndex( time );
	if(index == -1)
		index = 0;

	var offset = (value_size+1);
	var index_a = index;
	var index_b = index + 1;
	var data = this.data;
	var num_keyframes = data.length / offset;

	if( !interpolation || num_keyframes == 1 || index_b == num_keyframes || (index_a == 0 && this.data[0] > time)) //(index_b == this.data.length && !this.looped)
		return this.getKeyframe( index )[1];

	//multiple data
	if( value_size > 1 )
	{
		result = result || this._result;
		if( !result || result.length != value_size )
			result = this._result = new Float32Array( value_size );
	}

	var a = data.subarray( index_a * offset, (index_a + 1) * offset );
	var b = data.subarray( index_b * offset, (index_b + 1) * offset );

	var t = (b[0] - time) / (b[0] - a[0]);

	if(interpolation === RD.LINEAR)
	{
		if( value_size == 1 ) //simple case
			return a[1] * t + b[1] * (1-t);

		var a_data = a.subarray(1, value_size + 1 );
		var b_data = b.subarray(1, value_size + 1 );
		return RD.interpolateLinear( a_data, b_data, t, result, this.type, value_size, this );
	}
	
	if(interpolation === RD.CUBIC)
	{
		if( value_size === 0 ) //CUBIC not supported in interpolators
			return a[1];

		var pre_a = index > 0 ? data.subarray( (index-1) * offset, (index) * offset ) : a;
		var post_b = index_b < (num_keyframes - 1) ? data.subarray( (index_b+1) * offset, (index_b+2) * offset ) : b;

		if( value_size === 1 )
			return RD.EvaluateHermiteSpline( a[1], b[1], pre_a[1], post_b[1], 1 - t );

		var a_value = a.subarray(1,offset);
		var b_value = b.subarray(1,offset);

		result = RD.EvaluateHermiteSplineVector( a_value, b_value, pre_a.subarray(1,offset), post_b.subarray(1,offset), 1 - t, result );

		if(this.type == RD.QUAT )
		{
			quat.slerp( result, b_value, a_value, t );
			quat.normalize( result, result ); //is necesary?
		}
		else if(this.type == RD.TRANS10 )
		{
			var rotR = result.subarray(3,7);
			var rotA = a_value.subarray(3,7);
			var rotB = b_value.subarray(3,7);
			quat.slerp( rotR, rotB, rotA, t );
			quat.normalize( rotR, rotR ); //is necesary?
		}

		return result;
	}

	return null;
}

//it samples and applies the result to the given node
//root can be a RD.SceneNode or a RD.Skeleton (if skeleton only mat4 work)
Track.prototype.applyTrack = function( root, time, interpolation )
{
	if(!root)
		return;

	var sample = this.getSample( time, interpolation );

	if( root.constructor === RD.SceneNode ) //apply to scene ierarchy
	{
		var node = null;
		if( root.name == this.target_node)
			node = root;
		else
			node = root.findNodeByName( this.target_node );
		if(node)
			node[ this.target_property ] = sample;
	}
	else if( root.constructor === RD.Skeleton )
	{
		var bone = root.getBone( this.target_node );
		if( bone && this.type == RD.MAT4 )
			bone.model.set( sample );
	}

	return sample;
}

Track.prototype.serialize = function()
{
	var o = {
		enabled: this.enabled,
		target_node: this.target_node, 
		target_property: this.target_property, 
		type: this.type,
		data: this.data.concat(), //clone!
		packed_data: this.packed_data
	};
	return o;
}

Track.prototype.configure = function(o)
{
	this.enabled = o.enabled;
	this.target_node = o.target_node;
	this.target_property = o.target_property;
	if(o.property) //in case it comes as "nodename/propname"
	{
		var index = o.property.indexOf("/");
		this.target_node = o.property.substr(0,index);
		this.target_property = o.property.substr(index+1);
	}
	if(o.type != null)
	{
		if(o.type.constructor === String)
			this.type = RD.TYPES[ o.type.toUpperCase() ] || 0;
		else
			this.type = o.type;
	}
	if(o.data.concat)
		this.data = o.data.concat(); //clone!
	else
		this.data = new o.data.constructor( o.data );

	if(o.packed_data)
		this.packed_data = o.packed_data;
	else
		this.packed_data = this.data.constructor !== Array;
}

RD.interpolateLinear = function( a, b, t, result, type, value_size, track )
{
	if(value_size == 1)
		return a * t + b * (1-t);

	result = result || track._result;

	if(!result || result.length != value_size)
		result = track._result = new Float32Array( value_size );

	switch( type )
	{
		case RD.QUAT:
			quat.slerp( result, b, a, t );
			quat.normalize( result, result );
			break;
		case RD.TRANS10: 
			for(var i = 0; i < 3; i++) //this.value_size should be 10
				result[i] = a[i] * t + b[i] * (1-t);
			for(var i = 7; i < 10; i++) //this.value_size should be 10
				result[i] = a[i] * t + b[i] * (1-t);
			var rotA = a.subarray(3,7);
			var rotB = b.subarray(3,7);
			var rotR = result.subarray(3,7);
			quat.slerp( rotR, rotB, rotA, t );
			quat.normalize( rotR, rotR );
			break;
		default:
			for(var i = 0; i < value_size; i++)
				result[i] = a[i] * t + b[i] * (1-t);
	}
	return result;
}

RD.EvaluateHermiteSpline = function( p0, p1, pre_p0, post_p1, s )
{
	var s2 = s * s;
	var s3 = s2 * s;
	var h1 =  2*s3 - 3*s2 + 1;          // calculate basis function 1
	var h2 = -2*s3 + 3*s2;              // calculate basis function 2
	var h3 =   s3 - 2*s2 + s;         // calculate basis function 3
	var h4 =   s3 -  s2;              // calculate basis function 4
	var t0 = p1 - pre_p0;
	var t1 = post_p1 - p0;

	return h1 * p0 + h2 * p1 + h3 * t0 + h4 * t1;
}

RD.EvaluateHermiteSplineVector = function( p0, p1, pre_p0, post_p1, s, result )
{
	result = result || new Float32Array( result.length );

	var s2 = s * s;
	var s3 = s2 * s;
	var h1 =  2*s3 - 3*s2 + 1;          // calculate basis function 1
	var h2 = -2*s3 + 3*s2;              // calculate basis function 2
	var h3 =   s3 - 2*s2 + s;         // calculate basis function 3
	var h4 =   s3 -  s2;              // calculate basis function 4

	for(var i = 0, l = result.length; i < l; ++i)
	{
		var t0 = p1[i] - pre_p0[i];
		var t1 = post_p1[i] - p0[i];
		result[i] = h1 * p0[i] + h2 * p1[i] + h3 * t0 + h4 * t1;
	}

	return result;
}


//FOR SKELETAL ANIMATION, from LiteScene engine

// By Javi Agenjo (@tamat)
// ***************************************
// It uses a filetype called SKANIM, the format is similar to BVH but much more easy to parser
// ASCII Format description:
// HEADER: {duration}, {samples_per_second}, {num_keyframes}, {num_bones}
// FOR EVERY BONE (ordered by hierarchy): B{bone index}, {bone_name}, {bind matrix of bone in mat44}
// KEYFRAMES HEADER: @{num_animated_bones},{index to bone referenced by the first matrix}, {index to bone referenced by the second matrix}, ...
// KEYFRAME: K{time},{mat4},{mat4},{mat4},....

function lerp(a,b,f) { return a*(1.0-f)+b*f; }

if(!Math.lerp)
	Math.lerp = lerp;

function Skeleton()
{
	this.bones = []; //array of bones
	this.global_bone_matrices = []; //internal array of mat4
	this.bones_by_name = new Map(); //map of nodenames => index in the bones array
}

RD.Skeleton = Skeleton;

//more functions after BONE...

//Skeleton.EXTENSION = "skanim";

function Bone()
{
	this.name = "";
	this.model = mat4.create();
	this.parent = -1;
	this.layer = 0;
	this.num_children = 0;
	this.index = -1; //index in the skeleton bones array
	this.children = new Int8Array(16); //max 16 children
}

Skeleton.Bone = Bone;

Bone.prototype.serialize = function()
{
	return {
		name: this.name,
		model: typedArrayToArray( this.model ),
		parent: this.parent,
		layer: this.layer,
		children: this.num_children ? typedArrayToArray( this.children.subarray(0,this.num_children) ) : null
	};
}

Bone.prototype.configure = function(o)
{
	this.name = o.name;
	this.model.set( o.model );
	this.parent = o.parent;
	this.layer = o.layer;
	this.num_children = 0;
	this.index = o.index != null ? o.index : -1;
	if(o.children)
	{
		this.children.set(o.children);
		if(o.children.constructor === Array)
			this.num_children = o.children.length;
		else
			this.num_children = o.num_children;
	}
}

Bone.prototype.copyFrom = Bone.prototype.configure;

//given a bone name and matrix, it multiplies the matrix to the bone
Skeleton.prototype.applyTransformToBones = function(root, transform)
{
	var bone = this.getBone(root);
	if (!bone)
		return;
	mat4.multiply( bone.model, bone.model, transform );
};

Skeleton.prototype.getBone = function(name)
{
	return this.bones[ this.bones_by_name.get(name) ];
}

Skeleton.identity = mat4.create();

Skeleton.prototype.getBoneMatrix = function( name, global )
{
	var index = this.bones_by_name.get(name);
	if( index === undefined )
		return Skeleton.identity;
	if(global)
		return this.global_bone_matrices[ index ];
	return this.bones[ index ].model;
}

//imports skeleton from structure following Rendeer
Skeleton.prototype.importSkeleton = function(root_node)
{
	var bones = this.bones = [];
	var that = this;
	inner_getChilds(root_node);
	this.updateGlobalMatrices();

	function inner_getChilds( node )
	{
		var bone = new Bone();
		bone.name = node.name || node.id;
		bone.model.set( node.model );
		bone.index = bones.length;
		bones.push( bone );
		that.bones_by_name.set( bone.name, bone.index );
		that.global_bone_matrices.push( mat4.create() );

		if(node.children && node.children.length)
		{
			bone.num_children = node.children.length;
			for(var i = 0; i < node.children.length; ++i)
			{
				var b = inner_getChilds( node.children[i] );
				bone.children[i] = b.index;
				b.parent = bone.index;
			}
		}

		return bone;
	}
}

Skeleton.temp_mat4 = mat4.create();
Skeleton.temp_mat43 = Skeleton.temp_mat4.subarray(0,12);

//fills the array with the bones ready for the shader
//simplify allows to store as mat4x3 instead of mat4x4 (because the last column is always 0,0,0,1)
Skeleton.prototype.computeFinalBoneMatrices = function( bone_matrices, mesh, simplify )
{
	if(!this.bones.length || !mesh || !mesh.bones)
		return bone_matrices || [];

	this.updateGlobalMatrices();

	var size = simplify ? mesh.bones.length * 12 : mesh.bones.length * 16;

	if(!bone_matrices || bone_matrices.length != size )
		bone_matrices = new Float32Array( size );

	if(simplify) //convert to mat4x3
	{
		var m = Skeleton.temp_mat4;
		var m43 = Skeleton.temp_mat43;
		for (var i = 0; i < mesh.bones.length; ++i)
		{
			var bone_info = mesh.bones[i];
			mat4.multiply( temp_mat4, this.getBoneMatrix( bone_info[0], true ), bone_info[1] ); //use globals
			mat4.transpose( temp_mat4, temp_mat4 );
			bone_matrices.set(m43,i*12);
		}
	}
	else
		for (var i = 0; i < mesh.bones.length; ++i)
		{
			var bone_info = mesh.bones[i];
			var m = bone_matrices.subarray(i*16,i*16+16);
			mat4.multiply( m, this.getBoneMatrix( bone_info[0], true ), bone_info[1] ); //use globals
		}

	return bone_matrices;
}

//returns an array with the final global bone matrix in the order specified by the mesh, global_model is optional
Skeleton.prototype.computeFinalBoneMatricesAsArray = function( bone_matrices, mesh, global_model )
{
	if(!this.bones.length || !mesh || !mesh.bones)
		return bone_matrices || [];

	this.updateGlobalMatrices();

	bone_matrices = bone_matrices || [];
	bone_matrices.length = mesh.bones.length;

	for (var i = 0; i < mesh.bones.length; ++i)
	{
		var bone_info = mesh.bones[i];
		if(!bone_matrices[i])
			bone_matrices[i] = mat4.create();
		var m = bone_matrices[i];
		mat4.multiply( m, this.getBoneMatrix( bone_info[0], true ), bone_info[1] ); //use globals
		if(mesh.bind_matrix)
			mat4.multiply( m, m, mesh.bind_matrix );
		if(global_model)
			mat4.multiply( m, global_model, m );
	}

	return bone_matrices;
}

//updates the list of global matrices according to the local matrices
Skeleton.prototype.updateGlobalMatrices = function()
{
	var bones = this.bones;
	if(!bones.length)
		return;

	var num_bones = this.bones.length;

	//compute global matrices
	this.global_bone_matrices[0].set( bones[0].model );
	//order dependant
	for (var i = 1; i < num_bones; ++i)
	{
		var bone = bones[i];
		mat4.multiply( this.global_bone_matrices[i], this.global_bone_matrices[ bone.parent ], bone.model );
	}
}

//assigns a layer to a node and all its children
Skeleton.prototype.assignLayer = function(bone, layer)
{
	//TODO
}

//applies any transform found in the animation tracks to this skeleton
Skeleton.prototype.applyTracksAnimation = function( animation, time )
{
	for(var i = 0; i < animation.tracks.length; ++i )
	{
		var track = animation.tracks[i];
		var bone_index = this.bones_by_name.get( track.target_node );
		if(bone_index == null)
			continue;
		var bone = this.bones[ bone_index ];
		if( track.target_property == "model" || track.target_property == "matrix" )
			track.getSample( time, RD.LINEAR, bone.model );
	}
}

//for rendering the skeleton, it returns an array of pairs vertices to define lines
//if matrix then lines have the matrix applied
Skeleton.prototype.getVertices = function( matrix, skip_update_global )
{
	if(!this.bones.length)
		return null;

	if(!skip_update_global)
		this.updateGlobalMatrices();

	var size = (this.bones.length - 1) * 3 * 2;
	if(!this._vertices || this._vertices.length != size)
		this._vertices = new Float32Array( size );
	var vertices = this._vertices;
	var iv = 0;
	for (var i = 1; i < this.bones.length; ++i)
	{
		var bone = this.bones[i];
		var parent_global_matrix = this.global_bone_matrices[ bone.parent ];
		var global_matrix = this.global_bone_matrices[i];
		var v1 = vertices.subarray(iv,iv+3);
		var v2 = vertices.subarray(iv+3,iv+6);
		mat4.getTranslation( v1, global_matrix );
		mat4.getTranslation( v2, parent_global_matrix );
		if(matrix)
		{
			vec3.transformMat4(v1,v1,matrix);
			vec3.transformMat4(v2,v2,matrix);
		}
		iv += 6;
	}
	return vertices;
}

Skeleton.prototype.resizeBones = function(num)
{
	if(this.bones.length == num)
		return;
	if(this.bones.length > num)
	{
		this.bones.length = num;
		this.global_bone_matrices.length = num;
		return;
	}

	var old_num = this.bones.length;
	this.bones.length = num;
	for(var i = old_num; i < num; ++i)
	{
		this.bones[i] = new Bone();
		this.global_bone_matrices[i] = mat4.create();
	}
}

//clones one skeleton into another
Skeleton.prototype.copyFrom = function( skeleton )
{
	this.resizeBones( skeleton.bones.length );
	for(var i = 0; i < skeleton.bones.length; ++i)
	{
		this.bones[i].copyFrom( skeleton.bones[i] );
		this.global_bone_matrices[i].set( skeleton.global_bone_matrices[i] );
	}
	this.bones_by_name = new Map( skeleton.bones_by_name );
}

Skeleton.prototype.serialize = function()
{
	var o = {
		bones: [],
		bone_names: {}
	};

	for(var i = 0; i < this.bones.length; ++i)
		o.bones.push(this.bones[i].serialize());
	return o;
}

Skeleton.prototype.configure = function(o)
{
	this.resizeBones( o.bones.length );
	if(o.bones_by_name)
		this.bones_by_name = new Map( o.bones_by_name );
	else
		this.bones_by_name.clear();
	for(var i = 0; i < o.bones.length; ++i)
	{
		var bone = this.bones[i];
		bone.copyFrom( o.bones[i] );
		bone.index = i;
		if(o.global_bone_matrices) //is an skeleton
			this.global_bone_matrices[i].set( o.global_bone_matrices[i] );
		else //is an object
			this.bones_by_name.set( this.bones[i].name, i );
	}
}

var temp_axis = vec3.create();

//blends between two skeletons
Skeleton.blend = function(a, b, w, result, layer, skip_normalize )
{
	if(a.bones.length != b.bones.length)
	{
		console.error("skeleton must contain the same number of bones");
		return;
	}

	w = Math.clamp(w, 0.0, 1.0);//safety

	if (layer == 0xFF)
	{
		if (w == 0.0)
		{
			if(result == a) //nothing to do
				return;
			result.copyFrom(a); //copy A in Result
			return;
		}
		if (w == 1.0) //copy B in result
		{
			result.copyFrom(b);
			return;
		}
	}

	if (result != a) //copy bone names
	{
		result.resizeBones( a.bones.length );
		for (var i = 0; i < result.bones.length; ++i)
		{
			var bo = result.bones[i];
			if(!bo)
				bo = result.bones[i] = new Skeleton.Bone();
			bo.copyFrom(a.bones[i]);
		}
		result.bones_by_name = new Map(a.bones_by_name); //TODO: IMPROVE!
	}

	//blend bones locally
	for (var i = 0; i < result.bones.length; ++i)
	{
		var bone = result.bones[i];
		var boneA = a.bones[i];
		var boneB = b.bones[i];
		//if ( layer != 0xFF && !(bone.layer & layer) ) //not in the same layer
		//	continue;
		for (var j = 0; j < 16; ++j)
			bone.model[j] = Math.lerp( boneA.model[j], boneB.model[j], w);

		if(!skip_normalize)
		{
			var m = bone.model;
			//not sure which one is the right one, row major or column major
			//vec3.normalize(m.subarray(0,3),	m.subarray(0,3) );
			//vec3.normalize(m.subarray(4,7),	m.subarray(4,7) );
			//vec3.normalize(m.subarray(8,11), m.subarray(8,11) );
			//*
			for(var j = 0; j < 3; ++j)
			{
				temp_axis[0] = m[0+j]; temp_axis[1] = m[4+j]; temp_axis[2] = m[8+j];
				vec3.normalize(temp_axis,temp_axis);
				m[0+j] = temp_axis[0]; m[4+j] = temp_axis[1]; m[8+j] = temp_axis[2];
			}
			//*/
		}
	}
}

//shader block to include
Skeleton.shader_code = '\n\
	attribute vec4 a_bone_indices;\n\
	attribute vec4 a_weights;\n\
	uniform mat4 u_bones[64];\n\
	void computeSkinning(inout vec3 vertex, inout vec3 normal)\n\
	{\n\
		vec4 v = vec4(vertex,1.0);\n\
		vertex = (u_bones[int(a_bone_indices.x)] * a_weights.x * v + \n\
				u_bones[int(a_bone_indices.y)] * a_weights.y * v + \n\
				u_bones[int(a_bone_indices.z)] * a_weights.z * v + \n\
				u_bones[int(a_bone_indices.w)] * a_weights.w * v).xyz;\n\
		vec4 N = vec4(normal,0.0);\n\
		normal =	(u_bones[int(a_bone_indices.x)] * a_weights.x * N + \n\
				u_bones[int(a_bone_indices.y)] * a_weights.y * N + \n\
				u_bones[int(a_bone_indices.z)] * a_weights.z * N + \n\
				u_bones[int(a_bone_indices.w)] * a_weights.w * N).xyz;\n\
		normal = normalize(normal);\n\
	}\n\
';

//example of full vertex shader that supports skinning
Skeleton.vertex_shader_code = "\n\
	precision highp float;\n\
	attribute vec3 a_vertex;\n\
	attribute vec3 a_normal;\n\
	attribute vec2 a_coord;\n\
	\n\
	varying vec3 v_wPosition;\n\
	varying vec3 v_wNormal;\n\
	varying vec2 v_coord;\n\
	\n\
	uniform mat4 u_viewprojection;\n\
	uniform mat4 u_model;\n\
	uniform mat4 u_normal_matrix;\n\
	\n\
	"+Skeleton.shader_code+"\n\
	\n\
	void main() {\n\
		v_wPosition = a_vertex;\n\
		v_wNormal = (u_normal_matrix * vec4(a_normal,0.0)).xyz;\n\
		v_coord = a_coord;\n\
		\n\
		computeSkinning( v_wPosition, v_wNormal);\n\
		\n\
		v_wPosition = (u_model * vec4(v_wPosition,1.0)).xyz;\n\
		\n\
		gl_Position = u_viewprojection * vec4( v_wPosition, 1.0 );\n\
	}\n\
";

//*******************************************************

//This stores a series of skeleton poses, in constant intervals, this is less memory efficient but has better performance
function SkeletalAnimation()
{
	this.skeleton = new Skeleton();

	this.duration = 0;
	this.samples_per_second = 30;
	this.num_animated_bones = 0;
	this.num_keyframes = 0;

	//maps from keyframe data bone index to skeleton bone index because it may be that not all skeleton bones are animated
	this.bones_map = new Uint8Array(64);  //this.bones_map[ i ] => skeleton.bones[ bone_index ]

	this.keyframes = null; //bidimensional array of mat4, it contains a num.bones X num. keyframes, bones in local space
}

RD.SkeletalAnimation = SkeletalAnimation;

SkeletalAnimation.prototype.load = function(url, callback)
{
	var that =  this;
	return HttpRequest(url, null, function(data) {
		that.fromData(data);
		if(callback)
			callback(that);
	});
}

//change the skeleton to the given pose according to time
SkeletalAnimation.prototype.assignTime = function(time, loop, interpolate, layers )
{
	if(!this.duration || !this.samples_per_second)
		return;

	if (loop || loop === undefined)
	{
		time = time % this.duration;
		if (time < 0)
			time = this.duration + time;
	}
	else
		time = Math.clamp( time, 0.0, this.duration - (1.0/this.samples_per_second) );

	if(interpolate === undefined)
		interpolate = true;

	var v = this.samples_per_second * time;
	var index = Math.floor(v);
	var index2 = (index + 1) % this.num_keyframes;
	index = index % this.num_keyframes;
	var f = v - Math.floor(v);
	var num_animated_bones = this.num_animated_bones;

	var offset = 16 * num_animated_bones;
	var k = index * offset;
	var k2 = index2 * offset;
	var skeleton = this.skeleton;
	var keyframes = this.keyframes;
	var bones_map = this.bones_map;

	//compute local bones
	for (var i = 0; i < num_animated_bones; ++i)
	{
		var bone_index = bones_map[i];
		var bone = skeleton.bones[bone_index];
		if(!bone)
			throw("bone not found in skeleton");
		var offset = i*16;
		//if (layers != 0xFF && !(bone.layer & layers))
		//	continue;
		if(!interpolate)
			bone.model.set( keyframes.subarray( k + offset, k + offset + 16) );
		else
			for (var j = 0; j < 16; ++j)
			{
				//lerp matrix
				bone.model[j] = lerp( keyframes[ k + offset + j ], keyframes[ k2 + offset + j ], f );
			}
	}
}

SkeletalAnimation.prototype.resize = function( num_keyframes, num_animated_bones )
{
	this.num_keyframes = Math.floor(num_keyframes);
	this.num_animated_bones = num_animated_bones;
	this.keyframes = new Float32Array( num_keyframes * num_animated_bones * 16);
}

SkeletalAnimation.prototype.assignPoseToKeyframe = function( skeleton, index )
{
	if( index >= this.num_keyframes )
		throw( "index is out of range, this skeletal animation doesnt have so many samples, resize first" );
	var start_index = index * this.num_animated_bones * 16;

	for(var i = 0; i < this.num_animated_bones; ++i)
	{
		var bone_index = this.bones_map[i];
		var bone = skeleton.bones[bone_index];
		if(bone == null)
			continue;
		this.keyframes.set( bone.model, start_index + i * 16 );
	}
}

SkeletalAnimation.prototype.fromData = function(txt)
{
	var lines = txt.split("\n");
	var header = lines[0].split(",");
	this.duration = Number(header[0]);
	this.samples_per_second = Number(header[1]);
	this.num_keyframes = Number(header[2]);
	
	this.skeleton.resizeBones( Number(header[3]) );
	var current_keyframe = 0;
	for(var i = 1; i < lines.length; ++i)
	{
		var line = lines[i];
		var type = line[0];
		var t = line.substr(1).split(",");
		if( type == 'B')
		{
			var index = Number(t[0]);
			var bone = this.skeleton.bones[index];
			if(!bone)
				throw("bone not found in skeleton"); 
			bone.name = t[1];
			bone.parent = Number(t[2]);
			for(var j = 0; j < 16; ++j)
				bone.model[j] = Number(t[3+j]);
			if (bone.parent != -1)
			{
				var parent_bone = this.skeleton.bones[ bone.parent ];
				if(parent_bone.num_children >= 16)
					console.warn("too many child bones, max is 16");
				else
					parent_bone.children[ parent_bone.num_children++ ] = index;
			}
			this.skeleton.bones_by_name.set(bone.name,index);
		}
		else if( type == '@')
		{
			this.num_animated_bones = Number(t[0]);
			for(var j = 0; j < this.num_animated_bones; ++j)
				this.bones_map[j] = Number(t[j+1]);
			this.resize( this.num_keyframes, this.num_animated_bones );
		}
		else if( type == 'K')
		{
			var pos = current_keyframe * this.num_animated_bones * 16;
			for(var j = 0, l = this.num_animated_bones * 16; j < l; ++j)
				this.keyframes[ pos + j ] = Number( t[j+1] );
			current_keyframe++;
		}
		else 
			break;
	}

	this.assignTime(0,false,false);
}

SkeletalAnimation.prototype.toData = function()
{
	var lines = [];
	lines.push( [ this.duration.toFixed(3), this.samples_per_second, this.num_keyframes, this.skeleton.bones.length ].join(",") );

	var bones = this.skeleton.bones;
	for(var i = 0; i < bones.length; ++i)
	{
		var bone = bones[i];
		lines.push( "B" + i + "," + bone.name + "," + bone.parent + "," + typedArrayToArray(bone.model) );
	}

	//write bones
	var bones_indices = [];
	for(var i = 0; i < this.num_animated_bones; ++i)
		bones_indices.push( this.bones_map[i] );
	lines.push( "@" + bones_indices.length + "," + bones_indices.join(",") );

	var offset = 1/this.samples_per_second;

	//write keyframes for every sample
	for(var i = 0; i < this.num_keyframes; ++i)
	{
		var pos = i * 16 * this.num_animated_bones;

		//get keyframe
		var data = this.keyframes.subarray(pos, pos + 16 * this.num_animated_bones);
		var flat_data = data;

		//avoid ugly strings
		for(var j = 0; j < flat_data.length; ++j)
			if( Math.abs( flat_data[j] ) < 0.000001 )
				flat_data[j] = 0;
			
		lines.push( "K" + (i * offset).toFixed(3) + "," + flat_data.join(",") );
	}

	return lines.join("\n");
}

//resamples the tracks to get poses over time
SkeletalAnimation.prototype.fromTracksAnimation = function( skeleton, animation, frames_per_second )
{
	this.duration = animation.duration;
	this.samples_per_second = frames_per_second;
	this.skeleton.copyFrom( skeleton );

	//count animated bones and update bones map
	var num_animated_bones = 0;
	for(var i = 0; i < animation.tracks.length; ++i )
	{
		var track = animation.tracks[i];
		var bone_index = skeleton.bones_by_name.get( track.target_node );
		if(bone_index == null) //track is not for a bone
			continue;
		//var bone = skeleton.bones[ bone_index ];
		this.bones_map[ num_animated_bones ] = bone_index; //store to which bone is the N matrix in the keyframes
		num_animated_bones++;
	}

	//return;

	//make room for the keyframes
	var num_frames = Math.floor(animation.duration * frames_per_second);
	this.resize( num_frames, num_animated_bones );

	//for every keyframe, sample the skeleton
	for(var i = 0; i < this.num_keyframes; ++i) 
	{
		var t = i * (1/frames_per_second);
		this.skeleton.applyTracksAnimation( animation, t );
		this.assignPoseToKeyframe( this.skeleton, i );
	}
}

if(RD.SceneNode)
{
	RD.SceneNode.prototype.assignSkeleton = function( skeleton )
	{
		var mesh = gl.meshes[ this.mesh ];
		if(!mesh)
			return;
		this.bones = skeleton.computeFinalBoneMatrices( this.bones, mesh );
		this.uniforms.u_bones = this.bones;
	}

	RD.SceneNode.prototype.assignAnimation = function( skeletal_animation )
	{
		this.assignSkeleton( skeletal_animation.skeleton );
	}
}

//footer
})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );
