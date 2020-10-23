// credit: https://github.com/JordanDelcros/OBJImg, modified by cloudres
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';

function createdWorker () {
	return new Worker('convertImgWorker.js')
}

const MAX = (255 * 255) + 255;
const RGBA = 4;

class OBJImg {
	constructor(options) {
		Object.defineProperty(this, "canvas", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: document.createElement("canvas")
		});

		Object.defineProperty(this, "context", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: this.canvas.getContext("2d")
		});

		Object.defineProperty(this, "events", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: new Array()
		});

		Object.defineProperty(this, "ready", {
			configurable: false,
			writable: true,
			enumerable: false,
			value: false
		});

		/* THREE.js */
		Object.defineProperty(this, "gl", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: (options.renderer || new THREE.WebGLRenderer())
		});

		Object.defineProperty(this, "object3D", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: new THREE.Object3D()
		});

		Object.defineProperty(this, "object3DNeedsUpdate", {
			configurable: false,
			writable: true,
			enumerable: false,
			value: false
		});

		Object.defineProperty(this, "object3DComplete", {
			configurable: false,
			writable: true,
			enumerable: false,
			value: null
		});

		Object.defineProperty(this, "simpleObject3D", {
			configurable: false,
			writable: false,
			enumerable: false,
			value: new THREE.Object3D()
		});

		Object.defineProperty(this, "simpleObject3DNeedsUpdate", {
			configurable: false,
			writable: true,
			enumerable: false,
			value: false
		});

		Object.defineProperty(this, "simpleObject3DComplete", {
			configurable: false,
			writable: true,
			enumerable: false,
			value: null
		});
		/* THREE.js */
		this.init(options);
	}
	init(options) {
		this.datas = null;

		this.addEventListener("parse", function (event) {

			this.datas = event.detail;

			var toLoad = 0;
			var loaded = 0;

			for (var materialIndex = 0, length = this.datas.materials.length; materialIndex < length; materialIndex++) {

				var material = this.datas.materials[materialIndex];

				if (material.shader.vertex != null) {

					toLoad++;

					new FileLoader(this.basePath + "/" + material.shader.vertex, function (materialIndex, data) {

						loaded++;

						this.datas.materials[materialIndex].shader.vertex = data;

						if (loaded == toLoad) {

							var readyEvent = document.createEvent("CustomEvent");
							readyEvent.initCustomEvent("ready", true, true, this.datas);

							this.dispatchEvent(readyEvent);

						};

					}.bind(this, materialIndex), function (error) {

						var errorEvent = document.createEvent("CustomEvent");
						errorEvent.initCustomEvent("error", true, true, "Cant load vertex shader (error " + error + ")");

						this.dispatchEvent(errorEvent);

					}.bind(this));

				};

				if (material.shader.fragment != null) {

					toLoad++;

					new FileLoader(this.basePath + "/" + material.shader.fragment, function (materialIndex, data) {

						loaded++;

						this.datas.materials[materialIndex].shader.fragment = data;

						if (loaded == toLoad) {

							var readyEvent = document.createEvent("CustomEvent");
							readyEvent.initCustomEvent("ready", true, true, this.datas);

							this.dispatchEvent(readyEvent);

						};

					}.bind(this, materialIndex), function (error) {

						var errorEvent = document.createEvent("CustomEvent");
						errorEvent.initCustomEvent("error", true, true, "Cant load fragment shader (error " + error + ")");

						this.dispatchEvent(errorEvent);

					}.bind(this));

				};

				for (var materialType in material) {

					var type = material[materialType];

					for (var materialParameter in type) {

						if (typeof type[materialParameter] == "string" && /\.(png|jpg|gif)$/.test(type[materialParameter])) {

							var map = type[materialParameter];

							toLoad++;

							new ImageParser(this.basePath + "/" + map, type.channel, function (materialIndex, materialType, materialParameter, image) {

								loaded++;

								this.datas.materials[materialIndex][materialType][materialParameter] = image;

								if (loaded == toLoad) {

									var readyEvent = document.createEvent("CustomEvent");
									readyEvent.initCustomEvent("ready", true, true, this.datas);

									this.dispatchEvent(readyEvent);

								};

							}.bind(this, materialIndex, materialType, materialParameter));

						};

					};

				};

			};

			if (toLoad == 0) {

				var readyEvent = document.createEvent("CustomEvent");
				readyEvent.initCustomEvent("ready", true, true, this.datas);

				this.dispatchEvent(readyEvent);

			};

		}.bind(this));

		this.addEventListener("ready", function (event) {

			this.ready = true;

			if (this.object3DNeedsUpdate == true) {

				this.setObject3D(this.object3DComplete);

			};

			if (this.simpleObject3DNeedsUpdate == true) {

				this.setSimpleObject3D(this.simpleObject3DComplete);

			};

			var completeEvent = document.createEvent("CustomEvent");
			completeEvent.initCustomEvent("complete", true, true, this.datas);

			this.dispatchEvent(completeEvent);

		}.bind(this));

		if (options.onComplete instanceof Function) {

			this.addEventListener("complete", options.onComplete.bind(this));

		};

		if (options.onError instanceof Function) {

			this.addEventListener("error", options.onError.bind(this));

		};
		
		if (options.useWorker == true) {

			var worker = createdWorker();

			worker.addEventListener("message", function (event) {

				var action = event.data.action;

				if (action == "convertIMG") {

					var parsedEvent = document.createEvent("CustomEvent");
					parsedEvent.initCustomEvent("parse", true, true, event.data.content);

					this.dispatchEvent(parsedEvent);

				};

			}.bind(this), false);

			worker.addEventListener("error", function (event) {

				var errorEvent = document.createEvent("CustomEvent");
				errorEvent.initCustomEvent("error", true, true, "worker error");

				this.dispatchEvent(errorEvent);

			}.bind(this), false);

		};

		if (options.image instanceof Image) {

			Object.defineProperty(this, "basePath", {
				configurable: false,
				enumerable: true,
				writable: false,
				value: options.image.getAttribute("src").split("/").slice(0, -1).join("/")
			});

			if (options.image.complete == true) {

				if (options.useWorker == true) {

					var pixelsBuffer = new Int16Array(this.getPixels(options.image));

					worker.postMessage({
						action: "convertIMG",
						content: pixelsBuffer
					}, [pixelsBuffer.buffer]);

				}
				else {

					var parsedEvent = document.createEvent("CustomEvent");
					parsedEvent.initCustomEvent("parse", true, true, OBJImg.convertIMG(this.getPixels(options.image)));

					this.dispatchEvent(parsedEvent);

				};

			}
			else {

				options.image.addEventListener("load", function (event) {

					if (options.useWorker == true) {

						var pixelsBuffer = new Int16Array(this.getPixels(image));

						worker.postMessage({
							action: "convertIMG",
							content: pixelsBuffer
						}, [pixelsBuffer.buffer]);

					}
					else {

						var parsedEvent = document.createEvent("CustomEvent");
						parsedEvent.initCustomEvent("parse", true, true, OBJImg.convertIMG(this.getPixels(options.image)));

						this.dispatchEvent(parsedEvent);

					};

				}.bind(this), false);

			};

		}
		else {

			Object.defineProperty(this, "basePath", {
				configurable: false,
				enumerable: true,
				writable: false,
				value: options.image.split("/").slice(0, -1).join("/")
			});

			var image = new Image();

			image.addEventListener("load", function (event) {

				if (options.useWorker == true) {

					var pixelsBuffer = new Int16Array(this.getPixels(image));

					worker.postMessage({
						action: "convertIMG",
						content: pixelsBuffer
					}, [pixelsBuffer.buffer]);

				}
				else {

					var parsedEvent = document.createEvent("CustomEvent");
					parsedEvent.initCustomEvent("parse", true, true, OBJImg.convertIMG(this.getPixels(image)));

					this.dispatchEvent(parsedEvent);

				};

			}.bind(this), false);

			image.src = options.image;

		};
		return this;
	}
	addEventListener(type, listener) {

		this.events.push({
			type: type,
			listener: listener
		});

	}
	removeEventListener(type, listener) {

		for (var eventIndex = 0, length = this.events.length; eventIndex < length; eventIndex++) {

			if (this.events[eventIndex].type == type && this.events[eventIndex].listener == listener) {

				this.events.splice(eventIndex, 1);

			};

		};

	}
	dispatchEvent(event) {

		for (var eventIndex = 0, length = this.events.length; eventIndex < length; eventIndex++) {

			if (this.events[eventIndex].type == event.type) {

				this.events[eventIndex].listener(event);

			};

		};

	}
	/* THREE.js */
	setObject3D(onComplete) {

		if (this.datas != null) {

			var anisotropy = this.gl.getMaxAnisotropy();

			for (var object = 0, length = this.datas.objects.length; object < length; object++) {

				var objectDatas = this.datas.objects[object];
				var verticesDatas = this.datas.vertices;
				var normalsDatas = this.datas.normals;
				var texturesDatas = this.datas.textures;

				var geometry = new THREE.Geometry();

				var sharedVertices = new Array();

				for (var face = 0, faceLength = objectDatas.faces.length; face < faceLength; face++) {

					var faceID = objectDatas.faces[face];
					var verticesID = faceID.vertices;
					var normalsID = faceID.normals;
					var texturesID = faceID.textures;

					var vertexAID = sharedVertices.indexOf(verticesID.a);

					if (vertexAID == -1) {

						vertexAID = sharedVertices.push(verticesID.a) - 1;

						var vertexA = verticesDatas[verticesID.a];

						geometry.vertices.push(new THREE.Vector3(vertexA.x, vertexA.y, vertexA.z));

					};

					var vertexBID = sharedVertices.indexOf(verticesID.b);

					if (vertexBID == -1) {

						vertexBID = sharedVertices.push(verticesID.b) - 1;

						var vertexB = verticesDatas[verticesID.b];

						geometry.vertices.push(new THREE.Vector3(vertexB.x, vertexB.y, vertexB.z));

					};

					var vertexCID = sharedVertices.indexOf(verticesID.c);

					if (vertexCID == -1) {

						vertexCID = sharedVertices.push(verticesID.c) - 1;

						var vertexC = verticesDatas[verticesID.c];

						geometry.vertices.push(new THREE.Vector3(vertexC.x, vertexC.y, vertexC.z));

					};

					var normals = null;

					if (normalsDatas.length > 0) {

						normals = [
							normalsDatas[normalsID.a],
							normalsDatas[normalsID.b],
							normalsDatas[normalsID.c]
						];

					};

					geometry.faces.push(new THREE.Face3(vertexAID, vertexBID, vertexCID, normals));

					if (texturesDatas.length > 0) {

						var uvA = texturesDatas[texturesID.a];
						var uvB = texturesDatas[texturesID.b];
						var uvC = texturesDatas[texturesID.c];

						geometry.faceVertexUvs[0].push([
							new THREE.Vector2(uvA.u, uvA.v),
							new THREE.Vector2(uvB.u, uvB.v),
							new THREE.Vector2(uvC.u, uvC.v)
						]);

					};

				};

				var materialDatas = this.datas.materials[objectDatas.material];

				var material = null;

				if (materialDatas != undefined) {

					var ambientMap = null;
					if (materialDatas.ambient.map != null) {

						var wrapMode = (materialDatas.ambient.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						ambientMap = new THREE.Texture(materialDatas.ambient.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						ambientMap.needsUpdate = true;

					};

					var diffuseMap = null;
					if (materialDatas.diffuse.map != null) {

						var wrapMode = (materialDatas.diffuse.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						diffuseMap = new THREE.Texture(materialDatas.diffuse.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						diffuseMap.needsUpdate = true;

					};

					var specularMap = null;
					if (materialDatas.specular.map != null) {

						var wrapMode = (materialDatas.specular.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						specularMap = new THREE.Texture(materialDatas.specular.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						specularMap.needsUpdate = true;

					};

					var normalMap = null;
					if (materialDatas.normal.map != null) {

						var wrapMode = (materialDatas.normal.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						normalMap = new THREE.Texture(materialDatas.normal.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						normalMap.needsUpdate = true;

					};

					var bumpMap = null;
					if (materialDatas.bump.map != null) {

						var wrapMode = (materialDatas.bump.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						bumpMap = new THREE.Texture(materialDatas.bump.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						bumpMap.needsUpdate = true;

					};

					var opacityMap = null;
					if (materialDatas.opacity.map != null) {

						var wrapMode = (materialDatas.opacity.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						opacityMap = new THREE.Texture(materialDatas.opacity.map, THREE.UVMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						opacityMap.needsUpdate = true;

					};

					var environementMap = null;
					if (materialDatas.environement.map != null) {

						var wrapMode = (materialDatas.environement.clamp == true ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping);

						environementMap = new THREE.Texture(materialDatas.environement.map, THREE.SphericalReflectionMapping, wrapMode, wrapMode, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, anisotropy);
						environementMap.needsUpdate = true;

					};

					var diffuseColor = new THREE.Color(materialDatas.diffuse.r, materialDatas.diffuse.g, materialDatas.diffuse.b);
					var specularColor = new THREE.Color(materialDatas.specular.r, materialDatas.specular.g, materialDatas.specular.b);
					var normalScale = new THREE.Vector2(0.5, 0.5);
					var bumpScale = materialDatas.bump.multiplier;
					var transparent = ((materialDatas.opacity.value < 1.0 || opacityMap != null) ? true : false);
					var depthTest = materialDatas.shader.depthTest;
					var depthWrite = materialDatas.shader.depthWrite;
					var shading = (materialDatas.smooth == OBJImg.constants.shading.smooth ? THREE.SmoothShading : THREE.FlatShading);
					var side = (materialDatas.shader.side == OBJImg.constants.side.front ? THREE.FrontSide : (materialDatas.shader.side == OBJImg.constants.side.back ? THREE.BackSide : THREE.DoubleSide));
					var fog = true;

					if (materialDatas.shader.vertex != null || materialDatas.shader.fragment != null) {

						material = new THREE.ShaderMaterial({
							uniforms: {
								aoMap: {
									type: "t",
									value: ambientMap
								},
								aoMapIntensity: {
									type: "f",
									value: 1
								},
								diffuse: {
									type: "c",
									value: diffuseColor
								},
								map: {
									type: "t",
									value: diffuseMap
								},
								normalMap: {
									type: "t",
									value: normalMap
								},
								normalScale: {
									type: "v2",
									value: normalScale
								},
								specular: {
									type: "c",
									value: specularColor
								},
								specularMap: {
									type: "t",
									value: specularMap
								},
								bumpMap: {
									type: "t",
									value: bumpMap
								},
								bumpScale: {
									type: "f",
									value: bumpScale
								},
								alphaMap: {
									type: "t",
									value: opacityMap
								},
								opacity: {
									type: "f",
									value: materialDatas.opacity.value
								},
								shininess: {
									type: "f",
									value: materialDatas.specular.force
								},
								displacementBias: {
									type: "f",
									value: 0
								},
								displacementMap: {
									type: "t",
									value: null
								},
								displacementScale: {
									type: "f",
									value: 1
								},
								emmisive: {
									type: "c",
									value: new THREE.Color(0, 0, 0)
								},
								emissiveMap: {
									type: "t",
									value: null
								},
								envMap: {
									type: "t",
									value: environementMap
								},
								flipEnvMap: {
									type: "f",
									value: -1
								},
								fogColor: {
									type: "c",
									value: new THREE.Color(1, 1, 1)
								},
								fogDensity: {
									type: "f",
									value: 0.00025
								},
								fogFar: {
									type: "f",
									value: 2000
								},
								fogNear: {
									type: "f",
									value: 1
								},
								lightMap: {
									type: "t",
									value: null
								},
								offsetRepeat: {
									type: "v4",
									value: new THREE.Vector4(0, 0, 1, 1)
								},
								reflectivity: {
									type: "f",
									value: materialDatas.environement.reflectivity
								},
								reflectionRatio: {
									type: "f",
									value: 0.98
								},
								shadowBias: {
									type: "fv1",
									value: []
								},
								shadowDarkness: {
									type: "fv1",
									value: []
								},
								shadowMap: {
									type: "tv",
									value: []
								},
								shadowMapSize: {
									type: "v2v",
									value: []
								},
								shadowMatrix: {
									type: "m4v",
									value: []
								},
								ambientLightColor: {
									type: "fv",
									value: []
								},
								pointLightColor: {
									type: "fv",
									value: []
								},
								pointLightDecay: {
									type: "fv1",
									value: []
								},
								pointLightDistance: {
									type: "fv1",
									value: []
								},
								pointLightPosition: {
									type: "fv",
									value: []
								},
								spotLightAngleCos: {
									type: "fv1",
									value: []
								},
								spotLightColor: {
									type: "fv",
									value: []
								},
								spotLightDecay: {
									type: "fv1",
									value: []
								},
								spotLightDirection: {
									type: "fv",
									value: []
								},
								spotLightDistance: {
									type: "fv1",
									value: []
								},
								spotLightExponent: {
									type: "fv1",
									value: []
								},
								spotLightPosition: {
									type: "fv",
									value: []
								},
								directionalLightColor: {
									type: "fv",
									value: []
								},
								directionalLightDirection: {
									type: "fv",
									value: []
								},
								hemisphereLightDirection: {
									type: "fv",
									value: []
								},
								hemisphereLightGroundColor: {
									type: "fv",
									value: []
								},
								hemisphereLightSkyColor: {
									type: "fv",
									value: []
								}
							},
							vertexShader: materialDatas.shader.vertex,
							fragmentShader: materialDatas.shader.fragment,
							alphaTest: materialDatas.opacity.test,
							transparent: transparent,
							side: side,
							shading: shading,
							depthTest: depthTest,
							depthWrite: depthWrite,
							lights: true,
							fog: true
						});

						material.aoMap = (ambientMap != null ? true : false);
						material.map = (diffuseMap != null ? true : false);
						material.normalMap = (normalMap != null ? true : false);
						material.specularMap = (specularMap != null ? true : false);
						material.bumpMap = (bumpMap != null ? true : false);
						material.alphaMap = (opacityMap != null ? true : false);
						material.displacementMap = false;
						material.emissiveMap = false;
						material.envMap = (environementMap != null ? true : false);
						material.lightMap = false;

						material.needsUpdate = true;

					}
					else {

						material = new THREE.MeshPhongMaterial({
							aoMap: ambientMap,
							color: diffuseColor,
							map: diffuseMap,
							specularMap: specularMap,
							specular: specularColor,
							shininess: materialDatas.specular.force,
							normalMap: normalMap,
							normalScale: normalScale,
							bumpMap: bumpMap,
							bumpScale: bumpScale,
							envMap: environementMap,
							reflectivity: materialDatas.environement.reflectivity,
							opacity: materialDatas.opacity.value,
							alphaMap: opacityMap,
							alphaTest: materialDatas.opacity.test,
							transparent: transparent,
							depthTest: depthTest,
							depthWrite: depthWrite,
							combine: THREE.MultiplyOperation,
							shading: shading,
							side: side,
							fog: fog
						});

					};

				}
				else {

					material = new THREE.MeshPhongMaterial({
						color: new THREE.Color(0.4, 0.4, 0.4),
						specular: new THREE.Color(1, 1, 1),
						shininess: 10,
						fog: true
					});

				};

				var mesh = new THREE.Mesh(geometry, material);

				mesh.name = this.datas.objects[object].name;

				// mesh.castShadow = this.castShadow;
				// mesh.receiveShadow = this.receiveShadow;
				this.object3D.add(mesh);

			};

			if (onComplete instanceof Function) {

				onComplete.call(this, this.object3D);

			};

		};

		return this;

	}
	getObject3D(onComplete) {

		if (this.ready == true) {

			this.setObject3D(onComplete);

		}
		else {

			this.object3DNeedsUpdate = true;

			this.object3DComplete = onComplete;

		};

		return this.object3D;

	}
	/* THREE.js */
	setSimpleObject3D(onComplete) {

		if (this.datas != null) {

			var geometry = new THREE.Geometry();

			for (var vertex = 0, length = this.datas.vertices.length; vertex < length; vertex++) {

				geometry.vertices.push(new THREE.Vector3(this.datas.vertices[vertex].x, this.datas.vertices[vertex].y, this.datas.vertices[vertex].z));

			};

			for (var face = 0, length = this.datas.faces.length; face < length; face++) {

				var vertexA = this.datas.faces[face].vertices.a;
				var vertexB = this.datas.faces[face].vertices.b;
				var vertexC = this.datas.faces[face].vertices.c;

				var normals = null;

				if (this.datas.normals.length > 0) {

					normals = [
						this.datas.normals[this.datas.faces[face].normals.a],
						this.datas.normals[this.datas.faces[face].normals.b],
						this.datas.normals[this.datas.faces[face].normals.c],
					];

				};

				geometry.faces.push(new THREE.Face3(vertexA, vertexB, vertexC, normals));

				if (this.datas.textures.length > 0) {

					var uvA = this.datas.textures[this.datas.faces[face].textures.a];
					var uvB = this.datas.textures[this.datas.faces[face].textures.b];
					var uvC = this.datas.textures[this.datas.faces[face].textures.c];

					if (uvA && uvB && uvC) {

						geometry.faceVertexUvs[0].push([
							new THREE.Vector2(uvA.u, uvA.v),
							new THREE.Vector2(uvB.u, uvB.v),
							new THREE.Vector2(uvC.u, uvC.v)
						]);

					};

				};

			};

			geometry.computeBoundingBox();

			var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());

			// mesh.castShadow = this.castShadow;
			// mesh.receiveShadow = this.receiveShadow;
			this.simpleObject3D.add(mesh);

			if (onComplete instanceof Function) {

				onComplete.call(this, this.simpleObject3D);

			};

		};

		return this;

	}
	getSimpleObject3D(onComplete) {

		if (this.ready == true) {

			this.setSimpleObject3D(onComplete);

		}
		else {

			this.simpleObject3DNeedsUpdate = true;

			this.simpleObject3DComplete = onComplete;

		};

		return this.simpleObject3D;

	}
	getPixels(image) {

		this.canvas.width = image.naturalWidth;
		this.canvas.height = image.naturalHeight;

		this.context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

		return this.context.getImageData(0, 0, image.naturalWidth, image.naturalHeight).data;

	}
	getPixelColor(index, pixels) {

		pixels = (pixels || this.pixels);

		return {
			r: pixels[index * RGBA],
			g: pixels[index * RGBA + 1],
			b: pixels[index * RGBA + 2],
			a: pixels[index * RGBA + 3]
		};

	}
	getPixelValue(index, pixels) {

		pixels = (pixels || this.pixels);

		var color = this.getPixelColor(index, pixels);

		return color.r * color.g + color.b;

	}
	getColorFromValue(value) {
		value = Math.max(0, Math.min(MAX, value)) || 0;

		var g = Math.min(Math.floor(value / 255), 255);
		var r = (g > 0 ? 255 : 0);
		var b = Math.floor(value - (r * g));
		var a = (((r * g) + b) > 0 ? 255 : 0);

		return {
			r: r,
			g: g,
			b: b,
			a: a
		};
	}
}

//////////////////////////////////////


//////////////////////////////////////


//////////////////////////////////////

OBJImg.fn = OBJImg.prototype;

OBJImg.fn.init.prototype = OBJImg.fn;

Object.defineProperty(OBJImg, "dictionary", {
	configurable: false,
	writable: false,
	enumerable: true,
	value: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-0123456789/"
});

Object.defineProperty(OBJImg, "constants", {
	configurable: false,
	writable: false,
	enumerable: true,
	value: {
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
});

class ImageParser {
	constructor(url, channel, callback) {
		this.init(url, channel, callback);
	}
	init(url, channel, callback) {
		this.image = new Image();

		this.image.addEventListener("load", function (event) {

			if (channel == OBJImg.constants.channel.rgb) {

				callback(this.image);

			}
			else {

				var canvas = document.createElement("canvas");
				var context = canvas.getContext("2d");

				canvas.width = this.image.naturalWidth;
				canvas.height = this.image.naturalHeight;

				context.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight);

				this.imageData = context.getImageData(0, 0, this.image.naturalWidth, this.image.naturalHeight);

				if (channel == OBJImg.constants.channel.r) {

					this.isolateRed();

				}
				else if (channel == OBJImg.constants.channel.g) {

					this.isolateGreen();

				}
				else if (channel == OBJImg.constants.channel.b) {

					this.isolateBlue();

				};

				context.putImageData(this.imageData, 0, 0);

				this.image = new Image();
				this.image.src = canvas.toDataURL("image/png", 1.0);

				callback(this.image);

			};

		}.bind(this), false);

		this.image.src = url;
	}
	isolateRed() {

		for (var pixel = 0, length = this.imageData.data.length; pixel < length; pixel += 4) {

			this.imageData.data[pixel + 1] = this.imageData.data[pixel];
			this.imageData.data[pixel + 2] = this.imageData.data[pixel];

		};

		return this;

	}
	isolateGreen() {

		for (var pixel = 0, length = this.imageData.data.length; pixel < length; pixel += 4) {

			this.imageData.data[pixel] = this.imageData.data[pixel + 1];
			this.imageData.data[pixel + 2] = this.imageData.data[pixel + 1];

		};

		return this;

	}
	isolateBlue() {

		for (var pixel = 0, length = this.imageData.data.length; pixel < length; pixel += 4) {

			this.imageData.data[pixel] = this.imageData.data[pixel + 2];
			this.imageData.data[pixel + 1] = this.imageData.data[pixel + 2];

		};

		return this;

	}
}

class FileLoader {
	constructor(url, onComplete, onError) {		
    return new Promise((resolve, reject) => {
          fetch(
            new Request(url,
              {
                method: 'GET',
                headers: new Headers(),
                mode: 'cors',
                redirect: 'follow'
              })
          ).then(response => {
            if (response.ok)
              resolve(onComplete(response.text()));
            else
              reject(response.status);
          }).catch(err => {
						onError(err)
					});
			})
	}
}

export default OBJImg;
// new OBJImg({
// 	image: "/resource/obj/biplane7.png",
// 	useWorker: true,
// 	onComplete: function( datas ){
// 		console.log(datas);
// 	}
// }).getObject3D();