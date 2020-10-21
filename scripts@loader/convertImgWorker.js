// credit: https://github.com/JordanDelcros/OBJImg
const RGBA = 4;
const XYZ = 3;
const ABC = 3;
const RGB = 3;
const UV = 2;
const dictionary = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-0123456789/"
const constants = {
		shading: {
			flat: 0,
			smooth: 1
		},
		wrapping: {
			clamp: 0
		},
		channel: {
			rgb: 0,
			r: 1,
			g: 2,
			b: 3
		},
		side: {
			front: 0,
			back: 1,
			double: 2
		}
	}
function getPixelColor(index, pixels) {
  return {
    r: pixels[index * RGBA],
    g: pixels[index * RGBA + 1],
    b: pixels[index * RGBA + 2],
    a: pixels[index * RGBA + 3]
  };

}
function getPixelValue(index, pixels) {
  return pixels[index * RGBA] * pixels[index * RGBA + 1] + pixels[index * RGBA + 2];
}
function convertIMG ( pixels ){

  var pixelIndex = 0;

  var vertexSplitting = getPixelValue(pixelIndex++, pixels);
  var textureSplitting = getPixelValue(pixelIndex++, pixels);
  var normalSplitting = getPixelValue(pixelIndex++, pixels);
  var faceSplitting = getPixelValue(pixelIndex++, pixels);

  var vertexCount = 0;

  for( var pass = 0; pass < vertexSplitting; pass++ ){

    vertexCount += getPixelValue(pixelIndex++, pixels);

  };

  var vertices = new Array(vertexCount)

  var textureCount = 0;

  for( var pass = 0; pass < textureSplitting; pass++ ){

    textureCount += getPixelValue(pixelIndex++, pixels);

  };

  var textures = new Array(textureCount)

  var normalCount = 0;

  for( var pass = 0; pass < normalSplitting; pass++ ){

    normalCount += getPixelValue(pixelIndex++, pixels);

  };

  var normals = new Array(normalCount)

  var faceCount = 0;

  for( var pass = 0; pass < faceSplitting; pass++ ){

    faceCount += getPixelValue(pixelIndex++, pixels);

  };

  var faces = new Array(faceCount)

  var materials = new Array(getPixelValue(pixelIndex++, pixels));

  for( var material = 0, length = materials.length; material < length; material++ ){

    var illumination = getPixelValue(pixelIndex++, pixels);
    var smooth = getPixelValue(pixelIndex++, pixels);

    var ambientColor = getPixelColor(pixelIndex++, pixels);
    var ambientMapCharacters = getPixelValue(pixelIndex++, pixels);
    var ambientClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var ambientChannel = getPixelValue(pixelIndex++, pixels);

    var ambientMap = null;

    if( ambientMapCharacters > 0 ){

      ambientMap = "";

      for( var character = 0; character < ambientMapCharacters; character++ ){

        ambientMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var diffuseColor = getPixelColor(pixelIndex++, pixels);
    var diffuseMapCharacters = getPixelValue(pixelIndex++, pixels);
    var diffuseClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var diffuseChannel = getPixelValue(pixelIndex++, pixels);

    var diffuseMap = null;

    if( diffuseMapCharacters > 0 ){

      diffuseMap = "";

      for( var character = 0; character < diffuseMapCharacters; character++ ){

        diffuseMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var specularColor = getPixelColor(pixelIndex++, pixels);
    var specularMapCharacters = getPixelValue(pixelIndex++, pixels);
    var specularClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var specularChannel = getPixelValue(pixelIndex++, pixels);

    var specularMap = null;

    if( specularMapCharacters > 0 ){

      specularMap = "";

      for( var character = 0; character < specularMapCharacters; character++ ){

        specularMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var specularForceMapCharacters = getPixelValue(pixelIndex++, pixels);
    var specularForceClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var specularForceChannel = getPixelValue(pixelIndex++, pixels);

    var specularForceMap = null;

    if( specularForceMapCharacters > 0 ){

      specularForceMap = "";

      for( var character = 0; character < specularForceMapCharacters; character++ ){

        specularForceMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var specularForce = getPixelValue(pixelIndex++, pixels) / (MAX / 1000);

    var normalMapCharacters = getPixelValue(pixelIndex++, pixels);
    var normalClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var normalChannel = getPixelValue(pixelIndex++, pixels);

    var normalMap = null;

    if( normalMapCharacters > 0 ){

      normalMap = "";

      for( var character = 0; character < normalMapCharacters; character++ ){

        normalMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var bumpMapCharacters = getPixelValue(pixelIndex++, pixels);
    var bumpClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var bumpChannel = getPixelValue(pixelIndex++, pixels);
    var bumpMultiplierMultiplicator = getPixelValue(pixelIndex++, pixels);
    var bumpMultiplier = (getPixelValue(pixelIndex++, pixels) / bumpMultiplierMultiplicator) - 1;

    var bumpMap = null;

    if( bumpMapCharacters > 0 ){

      bumpMap = "";

      for( var character = 0; character < bumpMapCharacters; character++ ){

        bumpMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var environementMapCharacters = getPixelValue(pixelIndex++, pixels);
    var environementClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var environementChannel = getPixelValue(pixelIndex++, pixels);

    var environementMap = null;

    if( environementMapCharacters > 0 ){

      environementMap = "";

      for( var character = 0; character < environementMapCharacters; character++ ){

        environementMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var reflectivity = getPixelValue(pixelIndex++, pixels) / MAX;

    var opacity = getPixelValue(pixelIndex++, pixels) / 255;
    var opacityMapCharacters = getPixelValue(pixelIndex++, pixels);
    var opacityClamp = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var opacityChannel = getPixelValue(pixelIndex++, pixels);
    var opacityTest = getPixelValue(pixelIndex++, pixels) / 255;

    var opacityMap = null;

    if( opacityMapCharacters > 0 ){

      opacityMap = "";

      for( var character = 0; character < opacityMapCharacters; character++ ){

        opacityMap += dictionary[getPixelValue(pixelIndex++, pixels)];

      };

    };

    var shaderSide = getPixelValue(pixelIndex++, pixels);

    var depthTest = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);
    var depthWrite = (getPixelValue(pixelIndex++, pixels) == 1 ? true : false);

    var vertexShaderCharacters = getPixelValue(pixelIndex++, pixels);
    var vertexShader = "";

    for( var character = 0; character < vertexShaderCharacters; character++ ){

      vertexShader += dictionary[getPixelValue(pixelIndex++, pixels)];

    };

    var fragmentShaderCharacters = getPixelValue(pixelIndex++, pixels);
    var fragmentShader = "";

    for( var character = 0; character < fragmentShaderCharacters; character++ ){

      fragmentShader += dictionary[getPixelValue(pixelIndex++, pixels)];

    };

    materials[material] = {
      illumination: illumination,
      smooth: smooth,
      ambient: {
        map: ambientMap,
        clamp: ambientClamp,
        channel: ambientChannel || constants.channel.rgb,
        r: ambientColor.r / 255,
        g: ambientColor.g / 255,
        b: ambientColor.b / 255
      },
      diffuse: {
        map: diffuseMap,
        clamp: diffuseClamp,
        channel: diffuseChannel || constants.channel.rgb,
        r: diffuseColor.r / 255,
        g: diffuseColor.g / 255,
        b: diffuseColor.b / 255
      },
      specular: {
        map: specularMap,
        clamp: specularClamp,
        channel: specularChannel || constants.channel.rgb,
        forceMap: specularForceMap,
        forceClamp: specularForceClamp,
        forceChannel: specularForceChannel || constants.channel.rgb,
        force: specularForce,
        r: specularColor.r / 255,
        g: specularColor.g / 255,
        b: specularColor.b / 255
      },
      normal: {
        map: normalMap,
        clamp: normalClamp,
        channel: normalChannel || constants.channel.rgb
      },
      bump: {
        map: bumpMap,
        clamp: bumpClamp,
        channel: bumpChannel || constants.channel.rgb,
        multiplier: bumpMultiplier || 0
      },
      environement: {
        map: environementMap,
        clamp: environementClamp,
        channel: environementChannel || OBJImg.constants.channel.rgb,
        reflectivity: reflectivity
      },
      opacity: {
        map: opacityMap,
        clamp: opacityClamp,
        channel: opacityChannel || constants.channel.rgb,
        value: opacity,
        test: opacityTest
      },
      shader: {
        side: shaderSide || constants.side.front,
        depthTest: depthTest,
        depthWrite: depthWrite,
        vertex: vertexShader || null,
        fragment: fragmentShader || null
      }
    };

  };

  var vertexMultiplicator = getPixelValue(pixelIndex++, pixels);

  var normalMultiplicator = getPixelValue(pixelIndex++, pixels);

  if( textures.length > 0 ){

    var textureMultiplicator = getPixelValue(pixelIndex++, pixels);

    var textureOffset = getPixelValue(pixelIndex++, pixels) / textureMultiplicator;

  };

  var objects = new Array(getPixelValue(pixelIndex++, pixels));

  for( var object = 0, length = objects.length; object < length; object++ ){

    var objectIndex = 0;

    for( var pass = 0; pass < faceSplitting; pass++ ){

      objectIndex += getPixelValue(pixelIndex++, pixels);

    };

    var objectNameCharacters = getPixelValue(pixelIndex++, pixels);

    var objectName = "";

    for( var character = 0; character < objectNameCharacters; character++ ){

      objectName += dictionary[getPixelValue(pixelIndex++, pixels)];

    };

    var useMaterial = (getPixelColor(pixelIndex, pixels).a == 0 ? false : true);
    var materialID = getPixelValue(pixelIndex++, pixels);

    objects[object] = {
      name: objectName,
      index: objectIndex,
      faces: new Array(),
      material: (useMaterial == true ? materialID : null)
    };

  };

  var pivot = {
    x: getPixelValue(pixelIndex++, pixels) / vertexMultiplicator,
    y: getPixelValue(pixelIndex++, pixels) / vertexMultiplicator,
    z: getPixelValue(pixelIndex++, pixels) / vertexMultiplicator
  };

  for( var vertex = 0, length = vertices.length; vertex < length; vertex++, pixelIndex += XYZ ){

    var x = (getPixelValue(pixelIndex, pixels) / vertexMultiplicator) - pivot.x;
    var y = (getPixelValue(pixelIndex + 1, pixels) / vertexMultiplicator) - pivot.y;
    var z = (getPixelValue(pixelIndex + 2, pixels) / vertexMultiplicator) - pivot.z;

    vertices[vertex] = {
      x: x,
      y: y,
      z: z
    };

  };

  for( var texture = 0, length = textures.length; texture < length; texture++, pixelIndex += UV ){

    var u = (getPixelValue(pixelIndex, pixels) / textureMultiplicator) - textureOffset;
    var v = (getPixelValue(pixelIndex + 1, pixels) / textureMultiplicator) - textureOffset;

    textures[texture] = {
      u: u,
      v: v
    };

  };

  for( var normal = 0, length = normals.length; normal < length; normal++, pixelIndex += XYZ ){

    var x = (getPixelValue(pixelIndex, pixels) / normalMultiplicator) - 1;
    var y = (getPixelValue(pixelIndex + 1, pixels) / normalMultiplicator) - 1;
    var z = (getPixelValue(pixelIndex + 2, pixels) / normalMultiplicator) - 1;

    normals[normal] = {
      x: x,
      y: y,
      z: z
    };

  };

  for( var face = 0, length = faces.length; face < length; face++, pixelIndex += ((3 * vertexSplitting) + (3 * textureSplitting) + (3 * normalSplitting)) ){

    var va = 0;
    var vb = 0;
    var vc = 0;

    for( var pass = 0; pass < vertexSplitting; pass++ ){

      va += getPixelValue(pixelIndex + pass, pixels);
      vb += getPixelValue(pixelIndex + vertexSplitting + pass, pixels);
      vc += getPixelValue(pixelIndex + (2 * vertexSplitting) + pass, pixels);

    };

    var ta = 0;
    var tb = 0;
    var tc = 0;

    for( var pass = 0; pass < textureSplitting; pass++ ){

      ta += getPixelValue(pixelIndex + (3 * vertexSplitting) + pass, pixels);
      tb += getPixelValue(pixelIndex + (3 * vertexSplitting) + textureSplitting + pass, pixels);
      tc += getPixelValue(pixelIndex + (3 * vertexSplitting) + (2 * textureSplitting) + pass, pixels);

    };

    var na = 0;
    var nb = 0;
    var nc = 0;

    for( var pass = 0; pass < normalSplitting; pass++ ){

      na += getPixelValue(pixelIndex + (3 * vertexSplitting) + (3 * textureSplitting) + pass, pixels);
      nb += getPixelValue(pixelIndex + (3 * vertexSplitting) + (3 * textureSplitting) + normalSplitting + pass, pixels);
      nc += getPixelValue(pixelIndex + (3 * vertexSplitting) + (3 * textureSplitting) + (2 * normalSplitting) + pass, pixels);

    };

    faces[face] = {
      vertices: {
        a: va,
        b: vb,
        c: vc
      },
      textures: {
        a: ta,
        b: tb,
        c: tc
      },
      normals: {
        a: na,
        b: nb,
        c: nc
      }
    };

    for( var object = (objects.length - 1); object >= 0; object-- ){

      if( face >= objects[object].index ){

        objects[object].faces.push(faces[face]);

        break;

      };

    };

  };

  return {
    vertices: vertices,
    textures: textures,
    normals: normals,
    faces: faces,
    materials: materials,
    objects: objects
  };
}

this.addEventListener("message", ({data: {action, content}}) => {
  postMessage({
    action: action,
    content: convertIMG(content)
  });
});