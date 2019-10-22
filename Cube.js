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
            centroid: calculateCentroid(this.vertices),
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
        initShaderProgram(this.gl, this.fragShader, this.vertShader);
    }

    initBuffers() {
        //create vertices, normal and indicies arrays
        const positions = new Float32Array(this.vertices.flat());
        const normals = new Float32Array(this.normals.flat());
        const indices = new Uint16Array(this.triangles);
        
        var vertexArrayObject = gl.createVertexArray();

        //gl.bindVertexArray(vertexArrayObject);

        this.buffers = {
            vao: vertexArrayObject,
            attributes: {
                //position: initPositionAttribute
                //normal
            },
            //indicies: initIndexBuffer(gl, indices)
            numVertices: indices.length
        }
    }
}