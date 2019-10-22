main();

/************************************
 * MAIN
 ************************************/

function main() {

    console.log("Setting up the canvas");

    // Find the canavas tag in the HTML document
    const canvas = document.querySelector("#assignmentCanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    let testCube = new Cube(gl, "test", null, [0.2, 0.2, 0.2], [0.6, 0.6, 0.6], [0.3, 0.3, 0.3], 11, 1.0);
    testCube.scale(vec3.fromValues(2.0, 2.0, 2.0));
    testCube.vertShader = 
    `#version 300 es
    //in vec3 aPosition;

    void main() {
        // Postion of the fragment in world space
        //gl_Position = vec4(aPosition, 1.0);
    }
    `;
    testCube.fragShader = 
    `#version 300 es
    precision highp float;

    out vec4 fragColor;

    void main() {
        fragColor = vec4(0.5, 0.25, 0.25, 1.0);
    }
    `;

    testCube.lightingShader();

    const fileUploadButton = document.querySelector("#fileUploadButton");
    fileUploadButton.addEventListener("click", () => {
        console.log("Submitting file...");
        let fileInput = document.getElementById('inputFile');
        let files = fileInput.files;
        let url = URL.createObjectURL(files[0]);

        fetch(url, {
            mode: 'no-cors' // 'cors' by default
        }).then(res => {
            return res.text();
        }).then(data => {
            var inputTriangles = JSON.parse(data);

            doDrawing(gl, canvas, inputTriangles);

        }).catch((e) => {
            console.error(e);
        });

    });
}

function doDrawing(gl, canvas, inputTriangles) {
    // Create a state for our scene

    let newColour = hexToRGB(document.getElementById('lightColor').value);
    var state = {
        camera: {
            position: vec3.fromValues(0.5, 0.5, -0.5),
            center: vec3.fromValues(0.5, 0.5, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        lights: [
            {
                position: vec3.fromValues(0.4, 0.0, -2.0),
                colour: vec3.fromValues(newColour[0], newColour[1], newColour[2]),
                strength: document.getElementById('lightStrength').value,
            }
        ],
        moving: false, //dont spin off the start
        rotation: {
            x: true, //x spin is set to true by default
            y: false,
            z: false
        },
        objects: [],
        canvas: canvas,
        selectedObject: "arm",
        spinSpeed: document.getElementById('rotationSpeed').value, //get the slider value and set the spin speed to it
        nConstant: document.getElementById('nValue').value, //shininess constant from slider
    };

    setupUI(state);

    for (var i = 0; i < inputTriangles.length; i++) {
        state.objects.push({
            name: inputTriangles[i].name,
            model: {
                position: vec3.fromValues(0.0, 0.0, 0.0),
                rotation: mat4.create(), // Identity matrix
                scale: vec3.fromValues(1.0, 1.0, 1.0),
            },
            programInfo: lightingShader(gl),
            buffers: undefined,
            // TODO: Add more object specific state
            materialList: inputTriangles[i].material,
            verticesList: inputTriangles[i].vertices,
            centroid: calculateCentroid(inputTriangles[i].vertices),
            parent: inputTriangles[i].parent,
            modelMatrix: mat4.create(),
        });

        initBuffers(gl, state.objects[i], inputTriangles[i].vertices.flat(), inputTriangles[i].normals.flat(), inputTriangles[i].triangles.flat());
    }

    //initial transforms of fingers 
    finger0 = getObjectByName(state, "finger0");
    finger1 = getObjectByName(state, "finger1");
    finger0.model.position = vec3.fromValues(-0.4, -0.2, 0.0);
    finger1.model.position = vec3.fromValues(-0.4, 0.2, 0.0);
    mat4.rotateZ(finger0.model.rotation, finger0.model.rotation, 0.35);
    mat4.rotateZ(finger1.model.rotation, finger1.model.rotation, -0.35);

    // translate arm with 0.5
    arm = getObjectByName(state, "arm");
    arm.model.position = vec3.fromValues(0.0, 0.0, 0.5);

    console.log("Starting rendering loop");
    startRendering(gl, state);
}


/************************************
 * RENDERING CALLS
 ************************************/

function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        // Draw our scene
        drawScene(gl, deltaTime, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * Draws the scene. Should be called every frame
 * 
 * @param  {} gl WebGL2 context
 * @param {number} deltaTime Time between each rendering call
 */
function drawScene(gl, deltaTime, state) {
    // Set clear colour
    // This is a Red-Green-Blue-Alpha colour
    // See https://en.wikipedia.org/wiki/RGB_color_model
    // Here we use floating point values. In other places you may see byte representation (0-255).
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Depth testing allows WebGL to figure out what order to draw our objects such that the look natural.
    // We want to draw far objects first, and then draw nearer objects on top of those to obscure them.
    // To determine the order to draw, WebGL can test the Z value of the objects.
    // The z-axis goes out of the screen
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clearDepth(1.0); // Clear everything

    // Clear the color and depth buffer with specified clear colour.
    // This will replace everything that was in the previous frame with the clear colour.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.forEach((object) => {
        // Choose to use our shader
        gl.useProgram(object.programInfo.program);

        // Update uniforms
        {
            var projectionMatrix = mat4.create();
            var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
            var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            var near = 0.1; // Near clipping plane
            var far = 100.0; // Far clipping plane
            // Generate the projection matrix using perspective
            mat4.perspective(projectionMatrix, fovy, aspect, near, far);

            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);

            var viewMatrix = mat4.create();
            mat4.lookAt(
                viewMatrix,
                state.camera.position,
                state.camera.center,
                state.camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);


            // Update model transform (curent object)
            var modelMatrix = mat4.create();
            var negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);

            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

            //update modelview with parent model view
            if (object.parent) {
                let parentObject = getObjectByName(state, object.parent);
                mat4.mul(modelMatrix, parentObject.modelMatrix, modelMatrix);
            }
            object.modelMatrix = modelMatrix;

            var normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);

            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

            // Update camera position
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);

            //Update lights
            gl.uniform3fv(object.programInfo.uniformLocations.light0Position, state.lights[0].position);
            gl.uniform3fv(object.programInfo.uniformLocations.light0Colour, state.lights[0].colour);
            gl.uniform1f(object.programInfo.uniformLocations.light0Strength, state.lights[0].strength);

            // Update colors
            gl.uniform3fv(object.programInfo.uniformLocations.ambientValue, object.materialList.ambient);
            gl.uniform3fv(object.programInfo.uniformLocations.diffuseValue, object.materialList.diffuse);
            gl.uniform3fv(object.programInfo.uniformLocations.specularValue, object.materialList.specular);
            gl.uniform1f(object.programInfo.uniformLocations.nValue, object.materialList.n);

            gl.uniform1f(object.programInfo.uniformLocations.nValueConstant, state.nConstant);

            if (state.moving) {
                let arm = getObjectByName(state, "arm");
                if (state.rotation.x) {
                    mat4.rotateX(arm.model.rotation, arm.model.rotation, state.spinSpeed * 0.01 * deltaTime);
                }
                if (state.rotation.y) {
                    mat4.rotateY(arm.model.rotation, arm.model.rotation, state.spinSpeed * 0.01 * deltaTime);
                }
                if (state.rotation.z) {
                    mat4.rotateZ(arm.model.rotation, arm.model.rotation, state.spinSpeed * 0.01 * deltaTime);
                }
            }
        }
        // Draw 
        {
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);

            // Draw the object
            const offset = 0; // Number of elements to skip before starting
            gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
        }
    });
}

/************************************
 * SHADER SETUP
 ************************************/
function lightingShader(gl) {
    // Vertex shader source code
    const vsSource =
        `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;
    uniform mat4 normalMat;
    uniform vec3 uCameraPosition;

    out vec3 normalInterp;

    out vec3 oNormal;
    out vec3 oFragPosition;
    out vec3 oCameraPosition;

    void main() {
        // Position needs to be a vec4 with w as 1.0
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        
        // Postion of the fragment in world space
        oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

        oNormal = normalize((uModelMatrix * vec4(aNormal, 1.0)).xyz);
        oCameraPosition = uCameraPosition;
        normalInterp = vec3(normalMat * vec4(aNormal, 0.0));
    }
    `;

    // Fragment shader source code
    const fsSource =
        `#version 300 es
    precision highp float;

    out vec4 fragColor;
    
    in vec3 oNormal;
    in vec3 oFragPosition;
    in vec3 oCameraPosition;
    in vec3 normalInterp;

    uniform vec3 uLight0Position;
    uniform vec3 uLight0Colour;
    uniform float uLight0Strength;
    uniform vec3 ambientVal;
    uniform vec3 diffuseVal;
    uniform vec3 specularVal;
    uniform float nVal;
    uniform float nValueConstant;

    void main() {
        vec3 normal = normalize(normalInterp);

        // Get the dirction of the light relative to the object
        vec3 lightDirection = normalize(uLight0Position - oFragPosition);
        
        // TODO: Add lighting to the scene
        // Make use of the uniform light variables
        // To get colours from the materials of the objects, you will need to create your own uniforms

        // Ambient
        vec3 ambient = (ambientVal * uLight0Colour) * uLight0Strength;

        // Diffuse lighting: Kd * Ld * (N dot L)
        float NdotL = max(dot(normal, lightDirection), 1.0);
        vec3 diffuse = (diffuseVal * uLight0Colour) * NdotL;

        // Specular lighting
        vec3 nCameraPosition = normalize(oCameraPosition); // Normalize the camera position
        vec3 V = nCameraPosition - oFragPosition;
        vec3 H = normalize(V + lightDirection); // H = V + L normalized

        vec3 specular = vec3(0.0,0.0,0.0);
        if (NdotL > 0.0f)
        {
            float NDotH = max(dot(normal, H), 0.0);
            float totalNVal = nVal * nValueConstant;
            float NHPow = pow(NDotH, totalNVal); // (N dot H)^n
            specular = (specularVal * uLight0Colour) * NHPow;
        }

        fragColor = vec4((ambient + diffuse + specular), 1.0);
    }
    `;

    // Create our shader program with our custom function
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            projection: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            view: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            model: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            cameraPosition: gl.getUniformLocation(shaderProgram, 'uCameraPosition'),
            // TODO: Add additional uniforms here
            ambientValue: gl.getUniformLocation(shaderProgram, "ambientVal"),
            diffuseValue: gl.getUniformLocation(shaderProgram, "diffuseVal"),
            specularValue: gl.getUniformLocation(shaderProgram, "specularVal"),
            nValue: gl.getUniformLocation(shaderProgram, "nVal"),
            light0Position: gl.getUniformLocation(shaderProgram, 'uLight0Position'),
            light0Colour: gl.getUniformLocation(shaderProgram, 'uLight0Colour'),
            light0Strength: gl.getUniformLocation(shaderProgram, 'uLight0Strength'),
            nValueConstant: gl.getUniformLocation(shaderProgram, "nValueConstant"),
            normalMatrix: gl.getUniformLocation(shaderProgram, "normalMat")
        },
    };

    // Check to see if we found the locations of our uniforms and attributes
    // Typos are a common source of failure
    if (programInfo.attribLocations.vertexPosition === -1 ||
        programInfo.attribLocations.vertexNormal === -1 ||
        programInfo.uniformLocations.projection === -1 ||
        programInfo.uniformLocations.view === -1 ||
        programInfo.uniformLocations.model === -1 ||
        programInfo.uniformLocations.light0Position === -1 ||
        programInfo.uniformLocations.light0Colour === -1 ||
        programInfo.uniformLocations.light0Strength === -1 ||
        programInfo.uniformLocations.cameraPosition === -1 ||
        programInfo.uniformLocations.nValueConstant === -1 ||
        programInfo.uniformLocations.ambientValue === -1 ||
        programInfo.uniformLocations.diffuseValue === -1 ||
        programInfo.uniformLocations.normalMatrix === -1 ||
        programInfo.uniformLocations.specularValue === -1) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
    }

    return programInfo;
}

/************************************
 * BUFFER SETUP
 ************************************/

function initBuffers(gl, object, positionArray, normalArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

    const normals = new Float32Array(normalArray);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indices = new Uint16Array(indicesArray);

    // Allocate and assign a Vertex Array Object to our handle
    var vertexArrayObject = gl.createVertexArray();

    // Bind our Vertex Array Object as the current used object
    gl.bindVertexArray(vertexArrayObject);

    object.buffers = {
        vao: vertexArrayObject,
        attributes: {
            position: initPositionAttribute(gl, object.programInfo, positions),
            normal: initNormalAttribute(gl, object.programInfo, normals),
        },
        indices: initIndexBuffer(gl, indices),
        numVertices: indices.length,
    };
}

function initPositionAttribute(gl, programInfo, positionArray) {

    // Create a buffer for the positions.
    const positionBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ARRAY_BUFFER, // The kind of buffer this is
        positionArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3; // pull out 3 values per iteration, ie vec3
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize between 0 and 1
        const stride = 0; // how many bytes to get from one set of values to the next
        // Set stride to 0 to use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from


        // Set the information WebGL needs to read the buffer properly
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        // Tell WebGL to use this attribute
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    return positionBuffer;
}

function initNormalAttribute(gl, programInfo, normalArray) {

    // Create a buffer for the positions.
    const normalBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ARRAY_BUFFER, // The kind of buffer this is
        normalArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3; // pull out 4 values per iteration, ie vec3
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize between 0 and 1
        const stride = 0; // how many bytes to get from one set of values to the next
        // Set stride to 0 to use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from

        // Set the information WebGL needs to read the buffer properly
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        // Tell WebGL to use this attribute
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }

    return normalBuffer;
}

function initIndexBuffer(gl, elementArray) {

    // Create a buffer for the positions.
    const indexBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER, // The kind of buffer this is
        elementArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    return indexBuffer;
}
/**
 * 
 * @param {array of x,y,z vertices} vertices 
 */
function calculateCentroid(vertices) {

    var center = vec3.fromValues(0.0, 0.0, 0.0);
    for (let t = 0; t < vertices.length; t++) {
        vec3.add(center, center, vertices[t]);
    }
    vec3.scale(center, center, 1 / vertices.length);
    return center;
}

/**
 * 
 * @param {state object} state 
 * @param {string with object name} objectName 
 */
function getObjectByName(state, objectName) {
    for (let i = 0; i < state.objects.length; i++) {
        if (objectName === state.objects[i].name) {
            return state.objects[i];
        }
    }
    console.log("ERROR: object name not found")
    return null;
}

function setupUI(state) {
    document.getElementById('rotationSpeed').addEventListener('input', (event) => {
        state.spinSpeed = event.target.value;
    })

    document.getElementById('rotationToggle').addEventListener('click', () => {
        if (state.moving) {
            state.moving = false;
        } else {
            state.moving = true;
        }
    })

    document.getElementById('nValue').addEventListener('input', (event) => {
        state.nConstant = event.target.value;
    })

    document.getElementById('lightX').addEventListener('input', (event) => {
        vec3.set(state.lights[0].position, 0.1 * event.target.value, state.lights[0].position[1], state.lights[0].position[2]);
    })

    document.getElementById('lightY').addEventListener('input', (event) => {
        vec3.set(state.lights[0].position, state.lights[0].position[0], 0.1 * event.target.value, state.lights[0].position[2]);
    })

    document.getElementById('lightZ').addEventListener('input', (event) => {
        vec3.set(state.lights[0].position, state.lights[0].position[0], state.lights[0].position[1], 0.1 * event.target.value);
    })

    document.getElementById('lightStrength').addEventListener('input', (event) => {
        state.lights[0].strength = event.target.value;
    })

    document.getElementById('lightColor').addEventListener('change', (event) => {
        let newColour = hexToRGB(event.target.value);
        state.lights[0].colour = vec3.fromValues(newColour[0], newColour[1], newColour[2]);
    })

    document.getElementById('rotateX').addEventListener('change', () => {
        if (state.rotation.x) {
            state.rotation.x = false;
        } else {
            state.rotation.x = true;
        }
    })

    document.getElementById('rotateY').addEventListener('change', () => {
        if (state.rotation.y) {
            state.rotation.y = false;
        } else {
            state.rotation.y = true;
        }
    })

    document.getElementById('rotateZ').addEventListener('change', () => {
        if (state.rotation.z) {
            state.rotation.z = false;
        } else {
            state.rotation.z = true;
        }
    })
}