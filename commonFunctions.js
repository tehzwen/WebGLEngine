setup()

function setup() {
    // Create a HTML tag to display to the user
    var navTag = document.createElement('nav');
    navTag.classList = "navbar navbar-expand-lg navbar-dark bg-dark";
    navTag.innerHTML = `
    <div>
    <a class="navbar-brand" href="#">Assignment 5</a>
    </div
    `;

    // Insert the tag into the HMTL document
    document.getElementById('myNavBar').appendChild(navTag);
}

/**
 * A custom error function. The tag with id `webglError` must be present
 * @param  {string} tag Main description
 * @param  {string} errorStr Detailed description
 */
function printError(tag, errorStr) {
    // Create a HTML tag to display to the user
    var errorTag = document.createElement('div');
    errorTag.classList = 'alert alert-danger';
    errorTag.innerHTML = '<strong>' + tag + '</strong><p>' + errorStr + '</p>';

    // Insert the tag into the HMTL document
    document.getElementById('webglError').appendChild(errorTag);

    // Print to the console as well
    console.error(tag + ": " + errorStr);
}

/**
 * @param  {} gl WebGL2 Context
 * @param  {string} vsSource Vertex shader GLSL source code
 * @param  {string} fsSource Fragment shader GLSL source code
 * @returns {} A shader program object. This is `null` on failure
 */
function initShaderProgram(gl, vsSource, fsSource) {
    // Use our custom function to load and compile the shader objects
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program by attaching and linking the shader objects
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to link the shader program' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

/**
 * Loads a shader from source into a shader object. This should later be linked into a program.
 * @param  {} gl WebGL2 context
 * @param  {} type Type of shader. Typically either VERTEX_SHADER or FRAGMENT_SHADER
 * @param  {string} source GLSL source code
 */
function loadShader(gl, type, source) {
    // Create a new shader object
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // Fail with an error message
        var typeStr = '';
        if (type === gl.VERTEX_SHADER) {
            typeStr = 'VERTEX';
        } else if (type === gl.FRAGMENT_SHADER) {
            typeStr = 'FRAGMENT';
        }
        printError('An error occurred compiling the shader: ' + typeStr, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * 
 * @param {hex value of color} hex 
 */
function hexToRGB(hex) {
    let r = hex.substring(1, 3);
    let g = hex.substring(3, 5);
    let b = hex.substring(5, 7);

    r = parseInt(r, 16);
    g = parseInt(g, 16);
    b = parseInt(b, 16);
    return [r/255, g/255, b/255];
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