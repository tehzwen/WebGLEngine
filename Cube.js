class Cube {
    constructor(glContext, name, parent = null, ambient, diffuse, specular, n, alpha) {
        this.state = {};
        this.gl = glContext;
        this.name = name;
        this.parent = parent;

        this.material = { ambient, diffuse, specular, n, alpha };
        this.model = {
            vertices: [
                [0.0, 0.0, 0.0],
                [0.0, 0.5, 0.0],
                [0.5, 0.5, 0.0],
                [0.5, 0.0, 0.0],

                [0.0, 0.0, 0.5],
                [0.0, 0.5, 0.5],
                [0.5, 0.5, 0.5],
                [0.5, 0.0, 0.5],

                [0.0, 0.5, 0.5],
                [0.0, 0.5, 0.0],
                [0.5, 0.5, 0.0],
                [0.5, 0.5, 0.5],

                [0.0, 0.0, 0.5],
                [0.5, 0.0, 0.5],
                [0.5, 0.0, 0.0],
                [0.0, 0.0, 0.0],

                [0.5, 0.0, 0.5],
                [0.5, 0.0, 0.0],
                [0.5, 0.5, 0.5],
                [0.5, 0.5, 0.0],

                [0.0, 0.0, 0.5],
                [0.0, 0.0, 0.0],
                [0.0, 0.5, 0.5],
                [0.0, 0.5, 0.0]
            ],
            triangles: [
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15,
                16, 17, 18, 17, 18, 19,
                20, 21, 22, 21, 22, 23
            ],
            uvs: [
                [0, 0],
                [0.5, 1],
                [1, 0],
                [0, 0],
                [0.5, 1],
                [1, 0],
                [0, 0],
                [0.5, 1]
            ],
            normals: [
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,

                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,

                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,

                0.0, -1.0, 0.0,
                0.0, -1.0, 0.0,
                0.0, -1.0, 0.0,
                0.0, -1.0, 0.0,

                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,

                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0
            ],
            buffers: null,
            modelMatrix: mat4.create(),
            position: vec3.fromValues(0.0, 0.0, 0.0),
            rotation: mat4.create(),
            scale: vec3.fromValues(1.0, 1.0, 1.0),
            programInfo: null,
            fragShader: "",
            vertShader: ""
        };
    }

    scale(scaleVec) {
        vec3.add(this.model.scale, this.model.scale, scaleVec)
    }

    lightingShader() {
        const shaderProgram = initShaderProgram(this.gl, this.vertShader, this.fragShader);
        // Collect all the info needed to use the shader program.
        const programInfo = {
            // The actual shader program
            program: shaderProgram,
            // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
            // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
            attribLocations: {
                position: this.gl.getAttribLocation(shaderProgram, 'aPosition'),
            },
            uniformLocations: {
            },
        };

        console.log(programInfo);

        if (programInfo.attribLocations.position === -1) {
            printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
        }

        this.programInfo = programInfo;

    }

    initBuffers() {
        //create vertices, normal and indicies arrays
        const positions = new Float32Array(this.model.vertices.flat());
        const normals = new Float32Array(this.model.normals.flat());
        const indices = new Uint16Array(this.model.triangles);

        var vertexArrayObject = this.gl.createVertexArray();

        this.gl.bindVertexArray(vertexArrayObject);
        console.log(positions);

        this.buffers = {
            vao: vertexArrayObject,
            attributes: {
                position: initPositionAttribute(this.gl, this.programInfo, positions),
                //normals
            },
            indicies: initIndexBuffer(this.gl, indices),
            numVertices: indices.length
        }
    }

    setup() {
        this.lightingShader();
        this.model.centroid = calculateCentroid(this.model.vertices);
        this.initBuffers();
        console.log(this);
    }
}