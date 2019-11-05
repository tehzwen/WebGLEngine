
function setup() {
    // Create a HTML tag to display to the user
    var navTag = document.createElement('nav');
    navTag.classList = "navbar navbar-expand-lg navbar-dark bg-dark";
    navTag.innerHTML = `
    <div>
    <a class="navbar-brand" href="#">WebGL Engine</a>
    </div
    `;

    // Insert the tag into the HMTL document
    document.getElementById('myNavBar').appendChild(navTag);
}

function createSceneGui(state) {
    //get objects first
    let sideNav = document.getElementById("objectsNav");

    state.objects.map((object) => {
        let objectElement = document.createElement("div");
        let objectName = document.createElement("h5");
        objectName.classList = "object-link";
        objectName.innerHTML = object.name;
        objectName.addEventListener('click', () => {
            displayObjectValues(object);
        });

        objectElement.appendChild(objectName);
        sideNav.appendChild(objectElement);
    });

    //get lights
    state.lights.map((object) => {
        let objectElement = document.createElement("div");
        let objectName = document.createElement("h5");
        objectName.classList = "object-link";
        objectName.innerHTML = object.name;
        objectName.addEventListener('click', () => {
            let objectModel = {
                model: { ...object },
                name: object.name
            }

            displayObjectValues(objectModel);
        });

        objectElement.appendChild(objectName);
        sideNav.appendChild(objectElement);
    })

    let camera = state.camera;
    let objectElement = document.createElement("div");
    let objectName = document.createElement("h5");
    objectName.classList = "object-link";
    objectName.innerHTML = camera.name;

    objectName.addEventListener('click', () => {
        let objectModel = {
            model: { ...camera },
            name: camera.name
        }

        displayObjectValues(objectModel);
    });

    objectElement.appendChild(objectName);
    sideNav.appendChild(objectElement);

}

function displayObjectValues(object) {
    let selectedObjectDiv = document.getElementById("selectedObject");
    selectedObjectDiv.innerHTML = "";

    let positionalInputDiv = document.createElement("div");
    positionalInputDiv.classList = "input-group";

    let prependDivX = document.createElement("div");
    prependDivX.classList = "input-group-prepend";

    objectPositionX = document.createElement("input");
    objectPositionX.addEventListener('input', (event) => {
        handlePositionChange('x', event.target.value, object.model);
    })
    objectPositionX.id = object.name + "-positionX";
    objectPositionX.classList = "form-control";
    objectPositionX.value = object.model.position[0];

    objectPositionY = document.createElement("input");
    objectPositionY.addEventListener('input', (event) => {
        handlePositionChange('y', event.target.value, object.model);
    })
    objectPositionY.id = object.name + "-positionY";
    objectPositionY.classList = "form-control";
    objectPositionY.value = object.model.position[1];

    objectPositionZ = document.createElement("input");
    objectPositionZ.addEventListener('input', (event) => {
        handlePositionChange('z', event.target.value, object.model);
    })
    objectPositionZ.id = object.name + "-positionZ";
    objectPositionZ.classList = "form-control";
    objectPositionZ.value = object.model.position[2];

    prependDivX.innerHTML = `
        <span class="input-group-text">X</span>
        `;
    let prependDivY = prependDivX.cloneNode(true);
    prependDivY.innerHTML = `
        <span class="input-group-text">Y</span>
        `;

    let prependDivZ = prependDivX.cloneNode(true);
    prependDivZ.innerHTML = `
        <span class="input-group-text">Z</span>
        `;



    positionalInputDiv.appendChild(prependDivX);
    positionalInputDiv.appendChild(objectPositionX);
    positionalInputDiv.appendChild(prependDivY);
    positionalInputDiv.appendChild(objectPositionY);
    positionalInputDiv.appendChild(prependDivZ);
    positionalInputDiv.appendChild(objectPositionZ);

    let objectTitle = document.createElement("h3");
    objectTitle.innerHTML = `<i>${object.name}</i>`;

    let positionTitle = document.createElement("h4");
    positionTitle.innerHTML = "<u>Position</u>";

    selectedObjectDiv.appendChild(objectTitle);
    selectedObjectDiv.appendChild(positionTitle);
    selectedObjectDiv.appendChild(positionalInputDiv);

}

function shaderValuesErrorCheck(programInfo) {
    let missing = [];
    //do attrib check
    Object.keys(programInfo.attribLocations).map((attrib) => {
        if (programInfo.attribLocations[attrib] === -1) {
            missing.push(attrib);
        }
    });
    //do uniform check
    Object.keys(programInfo.uniformLocations).map((attrib) => {
        if (!programInfo.uniformLocations[attrib]) {
            missing.push(attrib);
        }
    });

    if (missing.length > 0) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located or is not being used : ' + missing);
    }
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

function handlePositionChange(axis, value, model) {
    let newVal = parseFloat(value);

    if (!Number.isNaN(newVal)) {
        switch (axis) {
            case 'x':
                vec3.set(model.position, newVal, model.position[1], model.position[2]);
                break;
            case 'y':
                vec3.set(model.position, model.position[0], newVal, model.position[2]);
                break;

            case 'z':
                vec3.set(model.position, model.position[0], model.position[1], newVal);
                break;
        }
    }
}
