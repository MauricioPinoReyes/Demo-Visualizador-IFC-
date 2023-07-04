import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { IFCWALLSTANDARDCASE } from 'web-ifc';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
viewer.grid.setGrid();
viewer.axes.setAxes();

async function loadIfc(url) {
    await viewer.IFC.setWasmPath("wasm/");
    const model = await viewer.IFC.loadIfcUrl(url);
    /*await viewer.shadowDropper.renderShadow(model.modelID);*/
    /*viewer.context.renderer.postProduction.active = true;*/

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    createTreeMenu(ifcProject);

    /*LOAD EXPORT TO EXCEL*/
    const walls = await viewer.IFC.getAllItemsOfType(model.modelID, IFCWALLSTANDARDCASE, true);

    const table = document.getElementById('walls-table');
    const body = table.querySelector('tbody');
    for (const wall of walls) {
        createWallNameEntry(body, wall);

        for (let propertyName in wall) {
            const propertyValue = wall[propertyName];
            addPropertyEntry(body, propertyName, propertyValue);
        }
    }

    const exportButton = document.getElementById('export');
    exportButton.onclick = () => {
        const book = XLSX.utils.table_to_book(table);
        XLSX.writeFile(book, "SheetJSTable.xlsx");
    }


    /*END LOAD EXPORT TO EXCEL*/
}

/*END EXPORT TO EXCCEL*/
function createWallNameEntry(table, wall) {
    const row = document.createElement('tr');
    table.appendChild(row);

    const wallName = document.createElement('td');
    wallName.colSpan = 2;
    wallName.textContent = 'Wall ' + wall.GlobalId.value;
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

/*END EXPORT TO EXCCEL*/

loadIfc('./06.ifc');

// TREE BUTTON

const toggleButtonMenu = document.getElementById('toggle-button-menu');
const content = document.getElementById('content-tree');

toggleButtonMenu.addEventListener('click', function () {
    content.classList.toggle('hidden-tree');
});

// TREE BUTTON

// PROPERTIES BUTTON

const toggleButtonProperties = document.getElementById('toggle-button-properties');
const contentProperties = document.getElementById('content-properties');

toggleButtonProperties.addEventListener('click', function () {
    contentProperties.classList.toggle('hidden-properties');
});


let textoElemento = document.getElementById("ifc-property-item-id");
textoElemento.style.textTransform = "uppercase";

// END PROPERTIES BUTTON

// EXPORT TO EXCEL BUTTON
const toggleButtonExport = document.getElementById('toggle-button-export');
const contentExport = document.getElementById('content-export-to excel');

toggleButtonExport.addEventListener('click', function () {
    contentExport.classList.toggle('hidden-export-to-excel');
});


// END EXPORT TO EXCEL BUTTON


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

/*PROPERTIES MENU*/

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
    const result = await viewer.IFC.selector.highlightIfcItem();
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