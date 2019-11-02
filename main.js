main();

var total = 0;

function main() {
    const canvas = document.querySelector("#assignmentCanvas");

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

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform mat4 normalMatrix;
        

        out vec3 oFragPosition;
        out vec3 oCameraPosition;
        out vec3 oNormal;
        out vec3 normalInterp;

        void main() {
            // Postion of the fragment in world space
            //gl_Position = vec4(aPosition, 1.0);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);

            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
            oCameraPosition = uCameraPosition;
            oNormal = normalize((uModelMatrix * vec4(aNormal, 1.0)).xyz);
            normalInterp = vec3(normalMatrix * vec4(aNormal, 0.0));
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
        
        uniform int numLights;
        uniform vec3 diffuseVal;
        uniform vec3 ambientVal;
        uniform vec3 specularVal;
        uniform float nVal;
        uniform float alphaVal;
        uniform vec3 uLightPositions[MAX_LIGHTS];
        uniform vec3 uLightColours[MAX_LIGHTS];
        uniform float uLightStrengths[MAX_LIGHTS];
     
        out vec4 fragColor;

        void main() {
            vec3 normal = normalize(normalInterp);
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;

            for (int i = 0; i < numLights + 1; i++) {
                vec3 lightDirection = normalize(uLightPositions[i] - oFragPosition);

                //ambient
                ambient += (ambientVal * uLightColours[i]) * uLightStrengths[i];

                //diffuse
                float NdotL = max(dot(normal, lightDirection), 1.0);
                diffuse += (diffuseVal * uLightColours[i]) * NdotL * uLightStrengths[i];

                //specular
                vec3 nCameraPosition = normalize(oCameraPosition); // Normalize the camera position
                vec3 V = nCameraPosition - oFragPosition;
                vec3 H = normalize(V + lightDirection); // H = V + L normalized

                if (NdotL > 0.0f)
                {
                    float NDotH = max(dot(normal, H), 0.0);
                    float NHPow = pow(NDotH, nVal); // (N dot H)^n
                    specular += (specularVal * uLightColours[i]) * NHPow;
                }
            }
            fragColor = vec4(ambient + diffuse + specular, 1.0);
        }
        `;

    let testCube = new Cube(gl, "test", null, [0.1, 0.1, 0.1], [0.2, 0.6, 0.6], [0.3, 0.3, 0.3], 10, 1.0);
    testCube.scale(1.5);
    testCube.model.position = vec3.fromValues(1.5, 0.0, 0.0);
    testCube.vertShader = vertShaderSample;
    testCube.fragShader = fragShaderSample;

    testCube.setup();

    let testCube2 = new Cube(gl, "test", null, [0.2, 0.2, 0.2], [0.6, 0.1, 0.6], [0.3, 0.3, 0.3], 25, 1.0);
    testCube2.model.position = vec3.fromValues(-0.5, 0.0, 0.0);
    testCube2.scale(2);
    testCube2.vertShader = vertShaderSample;
    testCube2.fragShader = fragShaderSample;

    testCube2.setup();

    var state = {
        canvas: canvas,
        camera: {
            position: vec3.fromValues(0.5, 0.5, -2.5),
            center: vec3.fromValues(0.5, 0.5, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        lights: [
            {
                position: vec3.fromValues(-0.6, 0.0, -1.0),
                colour: vec3.fromValues(1.0, 1.0, 1.0),
                strength: 0.25,
            },
            {
                position: vec3.fromValues(-0.6, 0.0, -1.0),
                colour: vec3.fromValues(1.0, 1.0, 1.0),
                strength: 0.25,
            }
        ],
    };
    state.numLights = state.lights.length;
    state.objects = [];
    state.objects.push(testCube);
    state.objects.push(testCube2);

    startRendering(gl, state);
}

function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        state.objects.map((object) => {
            mat4.rotateX(object.model.rotation, object.model.rotation, 0.08 * deltaTime);
            mat4.rotateY(object.model.rotation, object.model.rotation, 0.08 * deltaTime);
            mat4.rotateZ(object.model.rotation, object.model.rotation, 0.08 * deltaTime);
        })

        let movingLight = state.lights[0];
        let x, y, z;

        y = 0;
        let d = new Date();
        //console.log(deltaTime)

        x = Math.sin(total);
        z = Math.cos(total);

        movingLight.position = vec3.fromValues(x, y, z);
        total += 1 * deltaTime;

        if (total === 180) {
            total = 0;
        }

        // Draw our scene
        drawScene(gl, deltaTime, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

function drawScene(gl, deltaTime, state) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.map((object) => {
        gl.useProgram(object.programInfo.program);
        {

            var projectionMatrix = mat4.create();
            var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
            var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            var near = 0.1; // Near clipping plane
            var far = 100.0; // Far clipping plane

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

            var modelMatrix = mat4.create();
            var negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);

            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

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

                // Draw the object
                const offset = 0; // Number of elements to skip before starting
                gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
            }

        }
    })
}