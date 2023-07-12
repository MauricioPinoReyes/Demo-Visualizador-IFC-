import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { IFCWALLSTANDARDCASE, IFCSLAB } from 'web-ifc';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
viewer.grid.setGrid();
viewer.axes.setAxes();

async function loadIfc(url) {
    await viewer.IFC.setWasmPath("wasm/");
    const model = await viewer.IFC.loadIfcUrl(url);
    await viewer.shadowDropper.renderShadow(model.modelID);
    viewer.context.renderer.postProduction.active = true;

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    createTreeMenu(ifcProject);

    const walls = await viewer.IFC.getAllItemsOfType(model.modelID, IFCWALLSTANDARDCASE, true);

    const slabs = await viewer.IFC.getAllItemsOfType(model.modelID, IFCSLAB, true);

    const wallsTable = document.getElementById('walls-table');
    const tBodyWalls = wallsTable.querySelector('tbody');
    for (const wall of walls) {
        createWallNameEntry(tBodyWalls, wall);

        for (let propertyName in wall) {
            const propertyValue = wall[propertyName];
            addPropertyEntry(tBodyWalls, propertyName, propertyValue);
        }
    }

    const exportWalls = document.getElementById('export-walls');
    exportWalls.onclick = () => {
        const book = XLSX.utils.table_to_book(wallsTable);
        XLSX.writeFile(book, "Walls.xlsx");
    }

    const slabTable = document.getElementById('slabs-table');
    const tBodyLabs = slabTable.querySelector('tbody');
    for (const slab of slabs) {
        createWallNameEntry(tBodyLabs, slab);

        for (let propertyName in slab) {
            const propertyValue = slab[propertyName];
            addPropertyEntry(tBodyLabs, propertyName, propertyValue);
        }
    }

    const exportSlabs = document.getElementById('export-slabs');
    exportSlabs.onclick = () => {
        const book = XLSX.utils.table_to_book(slabTable);
        XLSX.writeFile(book, "slabs.xlsx");
    }

}

loadIfc('./06.ifc');

// Tree view

const toggler = document.getElementsByClassName("caret");
for (let i = 0; i < toggler.length; i++) {
    toggler[i].onclick = () => {
        toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
        toggler[i].classList.toggle("caret-down");
    }
}

// Spatial tree menu

function createTreeMenu(ifcProject) {
    const root = document.getElementById("tree-root");
    removeAllChildrenTree(root);
    const ifcProjectNode = createNestedChild(root, ifcProject);
    ifcProject.children.forEach(child => {
        constructTreeMenuNode(ifcProjectNode, child);
    })
}

function nodeToString(node) {
    return `${node.type} - ${node.expressID}`
}

function constructTreeMenuNode(parent, node) {
    const children = node.children;
    if (children.length === 0) {
        createSimpleChild(parent, node);
        return;
    }
    const nodeElement = createNestedChild(parent, node);
    children.forEach(child => {
        constructTreeMenuNode(nodeElement, child);
    })
}

function createNestedChild(parent, node) {
    const content = nodeToString(node);
    const root = document.createElement('li');
    createTitle(root, content);
    const childrenContainer = document.createElement('ul');
    childrenContainer.classList.add("nested");
    root.appendChild(childrenContainer);
    parent.appendChild(root);
    return childrenContainer;
}

function createTitle(parent, content) {
    const title = document.createElement("span");
    title.classList.add("caret");
    title.onclick = () => {
        title.parentElement.querySelector(".nested").classList.toggle("active");
        title.classList.toggle("caret-down");
    }
    title.textContent = content;
    parent.appendChild(title);
}

function createSimpleChild(parent, node) {
    const content = nodeToString(node);
    const childNode = document.createElement('li');
    childNode.classList.add('leaf-node');
    childNode.textContent = content;
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
        viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
    }

    childNode.onclick = async () => {
        viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID]);
    }
}

function removeAllChildrenTree(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Properties menu

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
    const result = await viewer.IFC.selector.highlightIfcItem(true);
    if (!result) return;
    const { modelID, id } = result;
    const props = await viewer.IFC.getProperties(modelID, id, true, false);
    createPropertiesMenu(props);
};

const propsGUI = document.getElementById("ifc-property-menu-root");

function createPropertiesMenu(properties) {
    console.log(properties);

    removeAllChildrenProperties(propsGUI);

    const psets = properties.psets;
    const mats = properties.mats;
    const type = properties.type;

    delete properties.psets;
    delete properties.mats;
    delete properties.type;


    for (let key in properties) {
        createPropertyEntry(key, properties[key]);
    }

}

function createPropertyEntry(key, value) {
    const propContainer = document.createElement("div");
    propContainer.classList.add("ifc-property-item");

    if (value === null || value === undefined) value = "undefined";
    else if (value.value) value = value.value;

    const keyElement = document.createElement("div");
    keyElement.textContent = key;
    propContainer.appendChild(keyElement);

    const valueElement = document.createElement("div");
    valueElement.classList.add("ifc-property-value");
    valueElement.textContent = value;
    propContainer.appendChild(valueElement);

    propsGUI.appendChild(propContainer);
}

function removeAllChildrenProperties(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}


/*DROPDOWN MENU*/
const accordion = document.getElementsByClassName('contentBX');

for (i = 0; i < accordion.length; i++) {
    accordion[i].addEventListener('click', function () {
        this.classList.toggle('active-2')
    })
}

/*END DROPDOWN MENU*/

/*EXPORT TO EXCEL*/

function createWallNameEntry(table, element) {
    const row = document.createElement('tr');
    table.appendChild(row);

    const wallName = document.createElement('td');
    wallName.colSpan = 2;
    wallName.textContent = 'Element ' + element.GlobalId.value;
    row.appendChild(wallName);
}

function addPropertyEntry(table, name, value) {
    const row = document.createElement('tr');
    table.appendChild(row);

    const propertyName = document.createElement('td');
    name = decodeIFCString(name);
    propertyName.textContent = name;
    row.appendChild(propertyName);

    if (value === null || value === undefined) value = "Unknown";
    if (value.value) value = value.value;
    value = decodeIFCString(value);

    const propertyValue = document.createElement('td');
    propertyValue.textContent = value;
    row.appendChild(propertyValue);
}

function decodeIFCString(ifcString) {
    const ifcUnicodeRegEx = /\\X2\\(.*?)\\X0\\/uig;
    let resultString = ifcString;
    let match = ifcUnicodeRegEx.exec(ifcString);
    while (match) {
        const unicodeChar = String.fromCharCode(parseInt(match[1], 16));
        resultString = resultString.replace(match[0], unicodeChar);
        match = ifcUnicodeRegEx.exec(ifcString);
    }
    return resultString;
}
/*END EXPORT TO EXCEL*/