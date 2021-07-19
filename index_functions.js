// VEGA specific start up functions
var view;
var tableData;
var table;
var jsonData = {
    "name": "HRI case",
    "objective": "Objective description",
    "robotType": "Robotic arm",
    "teamComposition": "Humans = Robots",
    "sharedInteraction": "Direct shared interaction",
    "data": []
};

/**
 * Event listeners
 */

function updateObjective() {
    jsonData.objective = document.getElementById('objective').value;
}

function updateRobotType() {
    let e = document.getElementById("robotType");
    jsonData.robotType = e.options[e.selectedIndex].text;
    // jsonData.robotType = document.getElementById('robotType').value;
}

function updateTeamComposition() {
    let e = document.getElementById("teamComposition");
    jsonData.teamComposition = e.options[e.selectedIndex].text;
}

function updateSharedInteraction() {
    jsonData.sharedInteraction = document.getElementById('sharedInteraction').value;
}

function SaveFramework() {
    if (!jsonData)
        return;
    // Get table data
    let tableData = table.getData();
    // Update the JSON data file.
    jsonData.data = tableData;

    // Add default times
    // for(let entry of jsonData.data){
    //     entry.timeMin = 0;
    //     entry.timeMax = 0;
    // }
    downloadToFile(JSON.stringify(jsonData), jsonData.name + ".json", "text/json")
}

// Src: https://robkendal.co.uk/blog/2020-04-17-saving-text-to-client-side-file-using-vanilla-js
// TODO: update code to also include a file dialog
const downloadToFile = (content, filename, contentType) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });

    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();

    URL.revokeObjectURL(a.href);
};

function HandleSelectedFile() {
    const file = event.target.files[0];
    if (!file.type) {
        status.textContent = 'Error: The File.type property does not appear to be supported on this browser.';
        return;
    }

    /* Delete the current activity_grouped and table data. This seems to fix the inconsistency bug occurs while loading different files (thus data) in Vega using view.data,
    which according to the docs should delete the data before inserting the new values. https://vega.github.io/vega/docs/api/view/ (Data and scales)
    */
    view.data("activity_grouped", []);
    view.data("table", []);
    view.runAsync();

    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        var contents = event.target.result;
        if (!ProcessJSONFile(contents))
            alert("File processing error! Make sure you upload a correct JSON file.");
    });
    reader.readAsText(file);
}

function loadExampleFile() {
    let e = document.getElementById("exampleCase");
    let filename = e.options[e.selectedIndex].value;

    /* Delete the current activity_grouped and table data. This seems to fix the inconsistency bug occurs while loading different files (thus data) in Vega using view.data,
    which according to the docs should delete the data before inserting the new values. https://vega.github.io/vega/docs/api/view/ (Data and scales)
    */
    view.data("activity_grouped", []);
    view.data("table", []);
    view.runAsync();

    let fileContent = loadFile('examples/' + filename);
    // console.log(fileContent);
    if (!ProcessJSONFile(fileContent))
        alert("File processing error! Make sure you upload a correct JSON file.");
}

/**
 * Rendering and loading VEGA helper functions
 */

// Source: https://stackoverflow.com/questions/36921947/read-a-server-side-file-using-javascript
// Synchronously read a text file from the web server with Ajax
//
// The filePath is relative to the web page folder.
// Example:   myStuff = loadFile("Chuuk_data.txt");
//
// You can also pass a full URL, like http://sealevel.info/Chuuk1_data.json, but there
// might be Access-Control-Allow-Origin issues. I found it works okay in Firefox, Edge,
// or Opera, and works in IE 11 if the server is configured properly, but in Chrome it only
// works if the domains exactly match (and note that "xyz.com" & "www.xyz.com" don't match).
// Otherwise Chrome reports an error:
//
//   No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://sealevel.info' is therefore not allowed access.
//
// That happens even when "Access-Control-Allow-Origin *" is configured in .htaccess,
// and even though I verified the headers returned (you can use a header-checker site like
// http://www.webconfs.com/http-header-check.php to check it). I think it's a Chrome bug.
function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function render(spec) {
    view = new vega.View(vega.parse(spec), {
        logLevel: vega.Info, // Enables printing info from the vega json (using info() in a signal)
        renderer: 'canvas',  // renderer (canvas or svg)
        container: '#graph_canvas',   // parent DOM container
        hover: true       // enable hover processing
    });

    // some prototype resizing. Works but ideally only the y-axis is scaled and the horizontal stays above a lower limit.
    var graph_width = document.getElementById('graph_canvas').clientWidth;
    var graph_height = document.getElementById('graph_canvas').clientHeight;
    // Set graph to these sizes
    view.width(graph_width - 325);
    view.height(graph_height - 280);

    return view.runAsync();
}

function ProcessJSONFile(file_data_text) {
    // parse json data
    jsonData = JSON.parse(file_data_text);

    // Update the general information on the webpage
    document.getElementById('framework_title').innerHTML = jsonData.name;
    document.getElementById('objective').value = jsonData.objective;
    // document.getElementById('robotType').value = jsonData.robotType;
    // document.getElementById('teamComposition').value = jsonData.teamComposition;
    // document.getElementById('sharedInteraction').value = jsonData.sharedInteraction;
    // document.getElementById('space').value = jsonData.space;
    // document.getElementById('time').value = jsonData.time;

    var originalData = jsonData.data;
    // console.log(originalData);

    const returnValue = ProcessData(originalData);
    updateTable();
    return returnValue;

}

function ProcessFile(file_data_text) {
    // Test if the files uses , or ; as a separator for the CSV file since depending on the locale set the csv export from Excel might use both.
    // After that test if the header line contains the required fields.
    var originalData;
    // Transform csv string data to array, using the csv jquery plugin: https://github.com/evanplaice/jquery-csv/
    if (file_data_text.includes(","))
        if (TestIfHeadersAreCorrect(file_data_text, ","))
            originalData = $.csv.toObjects(file_data_text, { "separator": "," });
        else
            return false;
    else if (file_data_text.includes(";"))
        if (TestIfHeadersAreCorrect(file_data_text, ";"))
            originalData = $.csv.toObjects(file_data_text, { "separator": ";" });
        else
            return false;
    else
        return false;

    const returnValue = ProcessData(originalData);
    updateTable();
    return returnValue;
}

function ProcessData(originalData) {
    // Note: Data parsing should be done here, since the "auto" parsing of the data only happens on the first load in the vega.json file. (not needed, since all the values are strings)

    // Clone the array (https://stackoverflow.com/questions/597588/how-do-you-clone-an-array-of-objects-in-javascript)
    var parsedData = JSON.parse(JSON.stringify(originalData));
    // Automatically add an indicator 'x' to each data row.
    for (let i = 0; i < parsedData.length; i++) {
        parsedData[i]["x"] = i;
    }

    // Check if all the specific values used in the framework fields are correct, if not provide error to the user. Otherwise Vega will give unexpected results
    if (!CheckInputDataFieldValues(parsedData))
        return false;

    // Based on the original dataset, make a new dataset containing the rows that have a substantial increase or decrease in a field value. 
    var indicatorsData = GetChangeIndicatorsData(parsedData);

    // Add the increase/decrease data to the dataset to enable vega to draw them.
    addChangedIndicatorsToData(parsedData);

    // Calculate the Feedforward scoring for each action to use later on for feedforward rules and visualizations.
    addFeedforwardScoreToData(parsedData);

    console.log(parsedData);
    view.data('table', parsedData);
    view.data("indicator_table", indicatorsData)
    view.runAsync();

    // console.log("Data: table");
    // console.log(view.data('indicator_table'));
    // console.log("Data: activity_grouped");
    // console.log(view.data('activity_grouped'));

    // Update the table
    tableData = originalData;
    // console.log(tableData);

    return true;

}

function TestIfHeadersAreCorrect(file_data_text, separator) {
    const firstLine = file_data_text.substring(0, file_data_text.indexOf("\n"));

    if (separator === "," && firstLine.includes("Objective,Activity,Action,Proximity,Human Role,Information Acquisition,Information Analysis,Action Selection,Action Implementation,Criticality"))
        return true;
    else if (separator === ";" && firstLine.includes("Objective;Activity;Action;Proximity;Human Role;Information Acquisition;Information Analysis;Action Selection;Action Implementation;Criticality"))
        return true;
    else
        return false;
}

function CheckInputDataFieldValues(data) {
    // For each row check the fields
    for (let i = 0; i < data.length; i++) {
        if (!data[i]["Proximity"].match(/^(Following|Touching|Approaching|Passing|Avoidance|None)$/)) {
            alert("Invalid input value: '" + data[i]["Proximity"] + "' for field: Proximity on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Human Role"].match(/^(Collaborator|Cooperator|Operator|Supervisor|Bystander)$/)) {
            alert("Invalid input value: '" + data[i]["Human Role"] + "' for field: Human Role on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Criticality"].match(/^(Loss of life|Chance at critical injury|Chance at injury|Loss of comfort|Loss of essential money|Loss of discretionary money)$/)) {
            alert("Invalid input value: '" + data[i]["Criticality"] + "' for field: Criticality on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Information Acquisition"].match(/^(Full|Semi|None)$/)) {
            alert("Invalid input value: '" + data[i]["Information Acquisition"] + "' for field: Information Acquisition on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Information Analysis"].match(/^(Full|Semi|None)$/)) {
            alert("Invalid input value: '" + data[i]["Information Analysis"] + "' for field: Information Analysis on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Action Selection"].match(/^(Full|Semi|None)$/)) {
            alert("Invalid input value: '" + data[i]["Action Selection"] + "' for field: Action Selection on row: " + i + ". Data parsing stopped.");
            return false;
        }
        else if (!data[i]["Action Implementation"].match(/^(Full|Semi|None)$/)) {
            alert("Invalid input value: '" + data[i]["Action Implementation"] + "' for field: Action Implementation on row: " + i + ". Data parsing stopped.");
            return false;
        }
    }

    return true;
}

function ExportImage() {
    // generate a PNG snapshot and then download the image
    view.toImageURL('png').then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'graph.png');
        link.dispatchEvent(new MouseEvent('click'));
    }).catch(function (error) { /* error handling */ });
}

function addFeedforwardScoreToData(data){
    for(let entry of data){
        let scoreCriticality = TranslateCriticalityToNumberValue(entry["Criticality"]);
        let scoreProximity = TranslateProximityToNumberValue(entry["Proximity"]);
        let scoreHumanRole = TranslateHumanRoleToNumberValue(entry["Human Role"]);
        let scoreInformationAcquisition = TranslateAutonomyToNumberValue(entry["Information Acquisition"]);
        let scoreInformationAnalysis = TranslateAutonomyToNumberValue(entry["Information Analysis"]);
        let scoreActionSelection = TranslateAutonomyToNumberValue(entry["Action Selection"]);
        let scoreActionImplementation = TranslateAutonomyToNumberValue(entry["Action Implementation"]);

        let score = scoreCriticality + scoreProximity + scoreHumanRole + scoreInformationAcquisition + scoreInformationAnalysis + scoreActionSelection + scoreActionImplementation;
        
        entry["feedforwardScore"] = score;
    }
}
// @pre: assume all the data from this point on conforms to the standard values defined in the framework.
function addChangedIndicatorsToData(data) {
    // Handle all the different values in the data separatly. Ideally this would be done with reflection, but I don't know how in Javascript. This is good enough.
    data = UpdateDataChangeWithParams(data, "Criticality");
    data = UpdateDataChangeWithParams(data, "Proximity");
    data = UpdateDataChangeWithParams(data, "Human Role");
    data = UpdateDataChangeWithParams(data, "Information Acquisition");
    data = UpdateDataChangeWithParams(data, "Information Analysis");
    data = UpdateDataChangeWithParams(data, "Action Selection");
    data = UpdateDataChangeWithParams(data, "Action Implementation");

    return data;
}

function UpdateDataChangeWithParams(data, typeString) {
    const valueChangedString = typeString + "_Change";
    // Add all the changed values to the data
    for (var entry of data) {
        entry[valueChangedString] = "";
    }

    // Skip the first one, since we want to test the current and previous to see if there is a value change
    for (var i = 1; i < data.length; i++) {
        var currentEntry = data[i];
        var previousEntry = data[i - 1];
        // const changedValue = CompareEntries(TranslateProximityToNumberValue(currentEntry[typeString]), TranslateProximityToNumberValue(previousEntry[typeString]));
        const changedValue = CompareEntries(currentEntry[typeString], previousEntry[typeString], typeString);

        currentEntry[valueChangedString] += changedValue;
        previousEntry[valueChangedString] += changedValue;
    }
    /* Post processing of the changed dataset, since there is 1 edge-case where this solution doesn't work:
        * sequence: '*d' - 'di' - 'id' - 'd*'
        * This sequence should result in 'decrease' - 'increase' - 'decrease', but results in 'decrease' - 'decrease' - 'decrease'
        * Because of the 'di' - 'id' sequence, both decrease and increase are drawn, and since decrease is drawn last, this is shown.
        * 
        * SOLUTION:
        * Filter on that specific case and assign a special value 's', to create a third 'increase' line mark on top of it in Vega.
        * I don't see another way to do this in Vega, since you can't check previous or next value in Vega.
        * In psuedocode --> Loop and check the values one by one (can skip last 3, since the chain is length 4)
    */
    for (var i = 0; i < data.length - 3; i++) {
        if (data[i][valueChangedString].includes("d")) {
            if (data[i + 1][valueChangedString] === "di")
                if (data[i + 2][valueChangedString] === "id")
                    if (data[i + 3][valueChangedString].includes("d")) {
                        data[i + 1][valueChangedString] += 's'; // special case
                        data[i + 2][valueChangedString] += 's'; // special case
                    }
                    else
                        continue;
                else
                    continue;
            else
                continue
        }
        else
            continue;
    }

    return data;
}

function CompareEntries(currentEntry, previousEntry, typeString) {
    let currentEntryValue, previousEntryValue;
    // Check on the type string to use the correct translation function
    if (typeString === "Criticality") {
        currentEntryValue = TranslateCriticalityToNumberValue(currentEntry)
        previousEntryValue = TranslateCriticalityToNumberValue(previousEntry)
    }
    else if (typeString === "Proximity") {
        currentEntryValue = TranslateProximityToNumberValue(currentEntry)
        previousEntryValue = TranslateProximityToNumberValue(previousEntry)
    }
    else if (typeString === "Human Role") {
        currentEntryValue = TranslateHumanRoleToNumberValue(currentEntry)
        previousEntryValue = TranslateHumanRoleToNumberValue(previousEntry)
    }
    // Remainders are autonomy and they all use the same scale.
    else {
        currentEntryValue = TranslateAutonomyToNumberValue(currentEntry)
        previousEntryValue = TranslateAutonomyToNumberValue(previousEntry)
    }
    // check if the same
    if (currentEntryValue === previousEntryValue)
        return "";
    else if (currentEntryValue > previousEntryValue)
        return "i"; // i for increase
    else
        return "d"; // d for decrease 
}

function CompareEntriesAgainstThreshold(currentEntry, nextEntry, typeString) {
    let currentEntryValue, nextEntryValue;
    // Check on the type string to use the correct translation function
    if (typeString === "Criticality") {
        currentEntryValue = TranslateCriticalityToNumberValue(currentEntry)
        nextEntryValue = TranslateCriticalityToNumberValue(nextEntry)
    }
    else if (typeString === "Proximity") {
        currentEntryValue = TranslateProximityToNumberValue(currentEntry)
        nextEntryValue = TranslateProximityToNumberValue(nextEntry)
    }
    else if (typeString === "Human Role") {
        currentEntryValue = TranslateHumanRoleToNumberValue(currentEntry)
        nextEntryValue = TranslateHumanRoleToNumberValue(nextEntry)
    }
    // Remainders are autonomy and they all use the same scale.
    else {
        currentEntryValue = TranslateAutonomyToNumberValue(currentEntry)
        nextEntryValue = TranslateAutonomyToNumberValue(nextEntry)
    }
    let result = { "isIncrease": false, "type": "" }
    // Compare the values and get the increase or decrease direction
    let changeValue = currentEntryValue - nextEntryValue;
    if (changeValue < 0)
        result.isIncrease = true;
    else
        result.isIncrease = false;

    if (Math.abs(changeValue) >= 4) // Hard change
        result.type = "Hard";
    else if (Math.abs(changeValue) >= 3) // Medium change
        result.type = "Medium";
    else if (Math.abs(changeValue) >= 2) // Soft change
        result.type = "Soft";
    else
        result.type = "None";

    return result;
}

function TranslateCriticalityToNumberValue(input) {
    if (input === "Loss of life")
        return 5;
    else if (input === "Chance at critical injury")
        return 4;
    else if (input === "Chance at injury")
        return 3;
    else if (input === "Loss of comfort")
        return 2;
    else if (input === "Loss of essential money")
        return 1;
    else if (input === "Loss of discretionary money")
        return 0;
    else
        return -1;
}

function TranslateProximityToNumberValue(input) {
    if (input === "Following")
        return 5;
    else if (input === "Touching")
        return 4;
    else if (input === "Approaching")
        return 3;
    else if (input === "Passing")
        return 2;
    else if (input === "Avoidance")
        return 1;
    else if (input === "None")
        return 0;
    else
        return -1;
}

function TranslateHumanRoleToNumberValue(input) {
    if (input === "Collaborator")
        return 4;
    else if (input === "Cooperator")
        return 3;
    else if (input === "Operator")
        return 2;
    else if (input === "Supervisor")
        return 1;
    else if (input === "Bystander")
        return 0;
    else
        return -1;
}

function TranslateAutonomyToNumberValue(input) {
    if (input === "Full")
        return 2;
    else if (input === "Semi")
        return 1;
    else if (input === "None")
        return 0;
    else
        return -1;
}

function GetChangeIndicatorsData(inputData) {
    var data = [];

    // Compare current versus next value against the threshold to see what the change is
    for (let i = 0; i < inputData.length - 1; i++) {
        // Test per input field
        let indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Criticality");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Proximity");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Human Role");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Information Acquisition");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Information Analysis");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Action Selection");
        if (indicatorRow)
            data.push(indicatorRow);
        indicatorRow = GetIndicatorForType(inputData[i], inputData[i + 1], "Action Implementation");
        if (indicatorRow)
            data.push(indicatorRow);
    }

    return data;
}

function GetIndicatorForType(currentEntry, nextEntry, typeString) {
    let result = CompareEntriesAgainstThreshold(currentEntry[typeString], nextEntry[typeString], typeString)
    if (result.type != "None") {
        // Shallow copy (ES2015 function) the currentEntry, to not change the original data entry. Want to keep them separated.
        let tempDataCopy = { ...currentEntry };
        tempDataCopy["indicator_field"] = typeString;
        tempDataCopy["indicator_type"] = result.type;
        tempDataCopy["indicator_isIncrease"] = result.isIncrease;
        tempDataCopy["indicator_description"] = CreateDescriptionText(result, typeString);
        return tempDataCopy;
    }
    else
        return null;
}

function CreateDescriptionText(result, typeString) {
    return typeString + " is " + ((result.isIncrease) ? "increasing" : "decreasing") + " with type: " + result.type;
}

/**
 * Tabulator table functions
 */
function updateTable() {
    table.setData(tableData);
}

function updateGraphBasedOnTable(data) {
    view.data("activity_grouped", []);
    view.data("table", []);
    view.runAsync();
    ProcessData(data);
}

$(document).ready(function () {
    // Load the default Vega json.
    fetch('framework_visualization.vg.json')
        .then(res => res.json())
        .then(spec => render(spec))
        .catch(err => console.error(err));


    //Default table array
    var tabledata = [
        {
            "id": 0,
            "Activity": "Describe the activity",
            "Action": "Describe the action",
            "Proximity": "Following",
            "Human Role": "Collaborator",
            "Criticality": "Loss of life",
            "Information Acquisition": "Full",
            "Information Analysis": "Full",
            "Action Implementation": "Full",
            "Action Selection": "Full",
            "timeMin": 0,
            "timeMax": 0
        }
    ];

    //custom accessor
    function numberConvert(value, data, type, component) {
        const result = Number(value);
        if (isNaN(result))
            return 0;
        else
            return result;
    }

    //initialize table: SRC: https://github.com/olifolkerd/tabulator
    table = new Tabulator("#example-table", {
        data: tabledata, //assign data to table
        addRowPos: "bottom",
        // height: "50%",
        // maxheight: "50%", // http://tabulator.info/docs/4.9/layout
        layout: "fitDataStretch", // The table will resize so that columns fit width of the container|| Or fitToWidth when using growth factors: http://tabulator.info/examples/4.9#fittowidth 
        history: true, // Undo/redo functionality http://tabulator.info/examples/4.9#history
        movableRows: true, //movable rows 
        columns: [ // http://tabulator.info/docs/4.9/columns#definition Define the columns, editor to beable to click and select a value, validator to require input and be a string, headersort false to disable sorter http://tabulator.info/docs/4.9/sort
            { rowHandle: true, formatter: "handle", headerSort: false, width: 30, minWidth: 30 }, // Needed, since the selectors and drag and drop interfene otherwise http://tabulator.info/docs/4.9/move
            {
                formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "left", headerSort: false, width: 30, minWidth: 30, cellClick: function (e, cell) {
                    cell.getRow().toggleSelect();
                }
            },
            { title: "Task", field: "Activity", editor: "input", maxWidth: 300, validator: ["required", "string"], headerSort: false },
            { title: "Action", field: "Action", editor: "input", maxWidth: 400, validator: ["required", "string"], headerSort: false },
            { title: "Proximity", field: "Proximity", editor: "select", editorParams: { values: { "Following": "Following", "Touching": "Touching", "Approaching": "Approaching", "Passing": "Passing", "Avoidance": "Avoidance", "None": "None" } }, validator: "required", headerSort: false },
            { title: "Human Role", field: "Human Role", editor: "select", editorParams: { values: { "Collaborator": "Collaborator", "Cooperator": "Cooperator", "Operator": "Operator", "Supervisor": "Supervisor", "Bystander": "Bystander" } }, validator: "required", headerSort: false },
            { title: "Criticality", field: "Criticality", editor: "select", editorParams: { values: { "Loss of life": "Loss of life", "Chance at critical injury": "Chance at critical injury", "Chance at injury": "Chance at injury", "Loss of comfort": "Loss of comfort", "Loss of essential money": "Loss of essential money", "Loss of discretionary money": "Loss of discretionary money" } }, validator: "required", headerSort: false },
            { title: "Information Acquisition", field: "Information Acquisition", editor: "select", editorParams: { values: { "Full": "Full", "Semi": "Semi", "None": "None" } }, validator: "required", headerSort: false },
            { title: "Information Analysis", field: "Information Analysis", editor: "select", editorParams: { values: { "Full": "Full", "Semi": "Semi", "None": "None" } }, validator: "required", headerSort: false },
            { title: "Action Implementation", field: "Action Implementation", editor: "select", editorParams: { values: { "Full": "Full", "Semi": "Semi", "None": "None" } }, validator: "required", headerSort: false },
            { title: "Action Selection", field: "Action Selection", editor: "select", editorParams: { values: { "Full": "Full", "Semi": "Semi", "None": "None" } }, validator: "required", headerSort: false },
            { title: "Time min", field: "timeMin", editor: "input", validator: ["number"], headerSort: false, accessorData:numberConvert },
            { title: "Time max", field: "timeMax", editor: "input", validator: ["number"], headerSort: false, accessorData:numberConvert },
        ]
    });

    /**
     * On click functions
    */

    //Add row on "Add Row" button click
    document.getElementById("add-row").addEventListener("click", function () {
        // Copy the data from the last row
        let rowData = table.getRow(table.getDataCount() - 1).getData();
        // Local copy data
        let rowCopy = {
            "id": rowData.id + 1,
            "Activity": rowData.Activity,
            "Action": rowData.Action,
            "Proximity": rowData.Proximity,
            "Human Role": rowData["Human Role"],
            "Criticality": rowData.Criticality,
            "Information Acquisition": rowData["Information Acquisition"],
            "Information Analysis": rowData["Information Analysis"],
            "Action Implementation": rowData["Action Implementation"],
            "Action Selection": rowData["Action Selection"],
            "timeMin": rowData["timeMin"],
            "timeMax": rowData["timeMax"]
        }
        table.addRow(rowCopy);
    });

    //undo button
    document.getElementById("history-undo").addEventListener("click", function () {
        table.undo();
    });

    //redo button
    document.getElementById("history-redo").addEventListener("click", function () {
        table.redo();
    });

    //Delete selected rows
    document.getElementById("delete-selected").addEventListener("click", function () {
        table.deleteRow(table.getSelectedRows());
        // Update all the indices manually
        let index = 0;
        let rows = table.getRows();
        for (let row of rows) {
            row.update({ id: index })
            index += 1;
        }
    });

    // Update the graph button click
    document.getElementById("update-data").addEventListener("click", function () {
        updateGraphBasedOnTable(table.getData());
    });

    document.getElementById("framework_title").addEventListener("input", function () {
        jsonData.name = document.getElementById('framework_title').innerHTML;
    });

});


