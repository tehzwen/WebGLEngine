main();

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


    let testCube = new Cube(gl, "test", null, [0.2, 0.2, 0.2], [0.6, 0.6, 0.6], [0.3, 0.3, 0.3], 11, 1.0);
    testCube.scale(vec3.fromValues(2.0, 2.0, 2.0));
    testCube.vertShader = 
    `#version 300 es
    in vec3 aPosition;

    void main() {
        // Postion of the fragment in world space
        gl_Position = vec4(aPosition, 1.0);
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

    testCube.setup();

    let testCube2 = new Cube(gl, "test", null, [0.2, 0.2, 0.2], [0.6, 0.6, 0.6], [0.3, 0.3, 0.3], 11, 1.0);
    testCube2.scale(vec3.fromValues(5.0, 2.0, 2.0));
    testCube2.vertShader = 
    `#version 300 es
    in vec3 aPosition;

    void main() {
        // Postion of the fragment in world space
        gl_Position = vec4(aPosition, 1.0);
    }
    `;
    testCube2.fragShader = 
    `#version 300 es
    precision highp float;

    out vec4 fragColor;

    void main() {
        fragColor = vec4(0.5, 0.8, 0.25, 1.0);
    }
    `;

    testCube2.setup();

    var state = {};
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

        // Draw our scene
        drawScene(gl, deltaTime, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

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

    state.objects.map((object) => {
        gl.useProgram(object.programInfo.program);

        {
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);
    
            // Draw the object
            const offset = 0; // Number of elements to skip before starting
            gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
        }
    })

}