var total = 0;
var state = {};
var stats = new Stats();

window.onload = () => {
    parseSceneFile("./statefiles/alienScene.json", state, main);
}

/**
 * 
 * @param {object - contains vertex, normal, uv information for the mesh to be made} mesh 
 * @param {object - the game object that will use the mesh information} object 
 * @purpose - Helper function called as a callback function when the mesh is done loading for the object
 */
function createMesh(mesh, object) {
    let testModel = new Model(state.gl, object.name, mesh, object.parent, object.material.ambient, object.material.diffuse, object.material.specular, object.material.n, object.material.alpha, object.texture);
    testModel.vertShader = state.vertShaderSample;
    testModel.fragShader = state.fragShaderSample;
    testModel.setup();
    testModel.model.position = object.position;
    addObjectToScene(state, testModel);
}

/**
 * 
 * @param {string - type of object to be added to the scene} type 
 * @param {string - url of the model being added to the game} url 
 * @purpose **WIP** Adds a new object to the scene from using the gui to add said object 
 */
function addObject(type, url = null) {
    if (type === "Cube") {
        let testCube = new Cube(state.gl, "Cube", null, [0.1, 0.1, 0.1], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 10, 1.0);
        testCube.vertShader = state.vertShaderSample;
        testCube.fragShader = state.fragShaderSample;
        testCube.setup();

        addObjectToScene(state, testCube);
        createSceneGui(state);
    }
}

function main() {
    stats.showPanel(0);
    document.getElementById("fps").appendChild(stats.dom);
    //document.body.appendChild( stats.dom );
    const canvas = document.querySelector("#glCanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    const vertShaderSample =
        `#version 300 es
        in vec3 aPosition;
        in vec3 aNormal;
        in vec2 aUV;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform mat4 normalMatrix;
        
        out vec3 oFragPosition;
        out vec3 oCameraPosition;
        out vec3 oNormal;
        out vec3 normalInterp;
        out vec2 oUV;

        void main() {
            // Postion of the fragment in world space
            //gl_Position = vec4(aPosition, 1.0);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);

            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
            oCameraPosition = uCameraPosition;
            oNormal = normalize((uModelMatrix * vec4(aNormal, 1.0)).xyz);
            normalInterp = vec3(normalMatrix * vec4(aNormal, 0.0));
            oUV = aUV;
        }
        `;

    const fragShaderSample =
        `#version 300 es
        #define MAX_LIGHTS 128
        precision highp float;

        in vec3 oFragPosition;
        in vec3 oCameraPosition;
        in vec3 oNormal;
        in vec3 normalInterp;
        in vec2 oUV;
        
        uniform int numLights;
        uniform vec3 diffuseVal;
        uniform vec3 ambientVal;
        uniform vec3 specularVal;
        uniform float nVal;
        uniform float alphaVal;
        uniform sampler2D uTexture;
        uniform int samplerExists;
        uniform vec3 uLightPositions[MAX_LIGHTS];
        uniform vec3 uLightColours[MAX_LIGHTS];
        uniform float uLightStrengths[MAX_LIGHTS];
     
        out vec4 fragColor;

        void main() {
            vec3 normal = normalize(normalInterp);
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
            float lightDistance;

            for (int i = 0; i < numLights + 1; i++) {
                vec3 lightDirection = normalize(uLightPositions[i] - oFragPosition);
                lightDistance = distance(uLightPositions[i], oFragPosition);

                //ambient
                ambient += (ambientVal * uLightColours[i]) * uLightStrengths[i];

                //diffuse
                float NdotL = max(dot(normal, lightDirection), 1.0);
                diffuse += ((diffuseVal * uLightColours[i]) * NdotL * uLightStrengths[i]) / lightDistance;

                //specular
                vec3 nCameraPosition = normalize(oCameraPosition); // Normalize the camera position
                vec3 V = nCameraPosition - oFragPosition;
                vec3 H = normalize(V + lightDirection); // H = V + L normalized

                if (NdotL > 0.0f)
                {
                    float NDotH = max(dot(normal, H), 0.0);
                    float NHPow = pow(NDotH, nVal); // (N dot H)^n
                    specular += ((specularVal * uLightColours[i]) * NHPow) / lightDistance;
                }
            }

            vec4 textureColor = texture(uTexture, oUV);

            if (samplerExists == 1) {
                fragColor = vec4((ambient + diffuse + specular) * textureColor.rgb, 1.0);
            } else {
                fragColor = vec4(ambient + diffuse + specular, 1.0);
            }
            
        }
        `;

    state = {
        ...state,
        gl,
        vertShaderSample,
        fragShaderSample,
        canvas: canvas,
        objectCount: 0,
        camera: {
            name: 'camera',
            position: vec3.fromValues(0.5, 0.5, -2.5),
            center: vec3.fromValues(0.5, 0.5, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        samplerExists: 0
    };

    state.numLights = state.lights.length;

    //iterate through the level's objects and add them
    state.level.objects.map((object) => {
        if (object.type === "mesh") {
            parseOBJFileToJSON(object.model, createMesh, object);
        } else if (object.type === "cube") {
            let tempCube = new Cube(gl, object.name, object.parent, object.material.ambient, object.material.diffuse, object.material.specular, object.material.n, object.material.alpha, object.texture, object.position);
            tempCube.vertShader = vertShaderSample;
            tempCube.fragShader = fragShaderSample;
            tempCube.setup();
            tempCube.model.position = vec3.fromValues(object.position[0], object.position[1], object.position[2]);
            addObjectToScene(state, tempCube);
        }
    })

    //setup mouse click listener
    canvas.addEventListener('click', (event) => {
        getMousePick(event, state);
    })

    console.log(state);
    startRendering(gl, state);
}

/**
 * 
 * @param {object - object containing scene values} state 
 * @param {object - the object to be added to the scene} object 
 * @purpose - Helper function for adding a new object to the scene and refreshing the GUI
 */
function addObjectToScene(state, object) {
    object.name = object.name + state.objectCount;
    state.objects.push(object);
    state.objectCount++;
    createSceneGui(state);
}

/**
 * 
 * @param {gl context} gl 
 * @param {object - object containing scene values} state 
 * @purpose - Calls the drawscene per frame
 */
function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        stats.begin();
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        state.objects.map((object) => {
            //mat4.rotateX(object.model.rotation, object.model.rotation, 0.3 * deltaTime);
            mat4.rotateY(object.model.rotation, object.model.rotation, 0.3 * deltaTime);
            //mat4.rotateZ(object.model.rotation, object.model.rotation, 0.3 * deltaTime);
        })

        // Draw our scene
        drawScene(gl, deltaTime, state);

        stats.end();
        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * 
 * @param {gl context} gl 
 * @param {float - time from now-last} deltaTime 
 * @param {object - contains the state for the scene} state 
 * @purpose Iterate through game objects and render the objects aswell as update uniforms
 */
function drawScene(gl, deltaTime, state) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.map((object) => {
        if (object.loaded) {

            gl.useProgram(object.programInfo.program);
            {

                var projectionMatrix = mat4.create();
                var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
                var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
                var near = 0.1; // Near clipping plane
                var far = 100.0; // Far clipping plane

                mat4.perspective(projectionMatrix, fovy, aspect, near, far);


                gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);

                state.projectionMatrix = projectionMatrix;

                var viewMatrix = mat4.create();
                mat4.lookAt(
                    viewMatrix,
                    state.camera.position,
                    state.camera.center,
                    state.camera.up,
                );
                gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);

                state.viewMatrix = viewMatrix;

                var modelMatrix = mat4.create();
                var negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
                vec3.negate(negCentroid, object.centroid);

                mat4.translate(modelMatrix, modelMatrix, object.model.position);
                mat4.translate(modelMatrix, modelMatrix, object.centroid);
                mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
                mat4.translate(modelMatrix, modelMatrix, negCentroid);
                mat4.scale(modelMatrix, modelMatrix, object.model.scale);

                object.modelMatrix = modelMatrix;

                var normalMatrix = mat4.create();
                mat4.invert(normalMatrix, modelMatrix);
                mat4.transpose(normalMatrix, normalMatrix);

                gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
                gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

                gl.uniform3fv(object.programInfo.uniformLocations.diffuseVal, object.material.diffuse);
                gl.uniform3fv(object.programInfo.uniformLocations.ambientVal, object.material.ambient);
                gl.uniform3fv(object.programInfo.uniformLocations.specularVal, object.material.specular);
                gl.uniform1f(object.programInfo.uniformLocations.nVal, object.material.n);

                gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);

                gl.uniform1i(object.programInfo.uniformLocations.numLights, state.numLights);

                let lightPositionArray = [], lightColourArray = [], lightStrengthArray = [];
                state.lights.map((light) => {
                    //iterate through position and colors (since both vec3s)
                    for (let i = 0; i < 3; i++) {
                        lightPositionArray.push(light.position[i]);
                        lightColourArray.push(light.colour[i]);
                    }
                    lightStrengthArray.push(light.strength);
                })

                gl.uniform3fv(object.programInfo.uniformLocations.lightPositions, lightPositionArray);
                gl.uniform3fv(object.programInfo.uniformLocations.lightColours, lightColourArray);
                gl.uniform1fv(object.programInfo.uniformLocations.lightStrengths, lightStrengthArray);

                {
                    // Bind the buffer we want to draw
                    gl.bindVertexArray(object.buffers.vao);

                    //check for textures and apply them if they exist
                    if (object.model.texture != null) {
                        state.samplerExists = 1;
                        gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                        gl.uniform1i(object.programInfo.uniformLocations.sampler, object.model.texture);
                        gl.bindTexture(gl.TEXTURE_2D, object.model.texture);
                        gl.activeTexture(gl.TEXTURE0);
                    } else {
                        state.samplerExists = 0;
                        gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                        gl.activeTexture(gl.TEXTURE0);
                    }

                    // Draw the object
                    const offset = 0; // Number of elements to skip before starting

                    //if its a mesh then we don't use an index buffer and use drawArrays instead of drawElements
                    if (object.type === "mesh") {
                        gl.drawArrays(gl.TRIANGLES, offset, object.buffers.numVertices / 3);
                    } else {
                        gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
                    }
                }
            }
        }
    })
}