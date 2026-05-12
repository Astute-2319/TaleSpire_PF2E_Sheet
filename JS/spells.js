function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initSheet() {
    let inputs = document.querySelectorAll("input,button,textarea,select");
    for (let input of inputs) {
        if (input.id != undefined && input.id != "clear-storage") {
            input.addEventListener("change", function() {
                onInputChange(input)
            }); 
            try {
                let titleSibling = findFirstSiblingWithClass(input, "field-title");
                if (titleSibling != null) {
                titleSibling.id = `${input.id}-field-title`;
            }
            }
            catch {titleSibling = null}
            try{
                let descSibling = findFirstSiblingWithClass(input, "field-desc");
                if (descSibling != null) {
                    descSibling.id = `${input.id}-field-desc`;
                }
            }
            catch {descSibling = null}
            let finalInput = input; //otherwise the input can change which breaks the onchange handler
            // if (titleSibling == null && input.dataset.modifier != undefined) {
            //     //manual fix for melee/ranged attack buttons being formatted differently
            //     titleSibling = finalInput;
            //     finalInput = document.getElementById(finalInput.dataset.modifier);
            // }

            if (titleSibling != null && titleSibling.dataset.diceType != undefined) {
                titleSibling.classList.add("interactible-title");
                titleSibling.style.cursor = "pointer";
                titleSibling.addEventListener("click", function() {
                    TS.dice.putDiceInTray([createDiceRoll(titleSibling, finalInput)]);
                    //we are not checking for success or failure here, but could easily by adding a .then (success) and .catch (failure)
                });
                input.setAttribute("aria-labelledby", titleSibling.id);
                if (descSibling != null) {
                    input.setAttribute("aria-describedby", descSibling.id);
                }
            } else if (titleSibling != null) {
                titleSibling.setAttribute("for", input.id);
                if (descSibling != null) {
                    input.setAttribute("aria-describedby", descSibling.id);
                }
            }
        }
    }
}

function onInputChange(input) {
    TS.debug.log("Input Change Start: " + input.id)
    // console.log(input.id)
    // if (input.id == 'weapons-text') {
    //     TS.debug.log("Input type: "+input.type)
    //     TS.debug.log("value: "+document.getElementById('weapons-text').value)
    // // TS.debug.log(input.id)
    // }
    //handles input changes to store them in local storage
    calculateRolls();
    let data;
    // get already stored data
    // See the folder .localStorage to see data format (it's a JSON file)
    // TODO: Can I make it have multiple "pieces"?
    // Example: [character={...}, spells={...}, ...]
    TS.localStorage.campaign.getBlob().then((storedData) => {
        // TS.debug.log(storedData)
        //parse stored blob as json, but also handle if it's empty by
        //defaulting to an empty json document "{}" if stored data is false
        data = JSON.parse(storedData || "{character={}, spells={}}");
        // TS.debug.log(data)
        // TS.debug.log(data['spells'])
        // TS.debug.log(input.id)
        if (input.type == "checkbox") {
            data['spells'][input.id] = input.checked ? "on" : "off";
        } 
        // else if (input.type == "textarea") {
        //     data[input.id] = input.textContent;
        // } 
        else {
            data['spells'][input.id] = input.value;
            // TS.debug.log(data['spells'][input.id])
        }
        //set new data, handle response
        TS.localStorage.campaign.setBlob(JSON.stringify(data)).then(() => {
            //if storing the data succeeded, enable the clear storage button
            // clearStorageButton.classList.add("danger");
            // clearStorageButton.disabled = false;
            // clearStorageButton.textContent = "Clear Character Sheet";
        }).catch((setBlobResponse) => {
            TS.debug.log("Failed to store change to local storage: " + setBlobResponse.cause);
            console.error("Failed to store change to local storage:", setBlobResponse);
        });
    }).catch((getBlobResponse) => {
        TS.debug.log("Failed to load data from local storage: " + getBlobResponse.cause);
        console.error("Failed to load data from local storage:", getBlobResponse);
    });

    // TS.debug.log("Input ID after blobs: "+input.id)
    // TS.debug.log(input.id == "weapons-text")
    // console.debug.log("Input ID: "+input.id)

    // if (input.id == "abilities-text") {
    //     TS.debug.log('Abilities if statement')
    //     let actions = parseActions(input.value);
    //     addActions(actions);
    // }

    // if (input.id == "skills-text") {
    //     TS.debug.log('Skills if statement')
    //     let skills = parseSkillsLores(input.value);
    //     addSkillLore(skills);
    //     // for (skill in skills['title']) {
    //     //     // TS.debug.log(skill);
    //     // }
    // }

    // if (input.id == "Hitdice-text") {
    //     TS.debug.log('Hitdice if statement')
    //     let actionsNew = parseActions(input.value);
    //     addActionsNew(actionsNew);
    // }

    // if (input.id == "weapons-text") {
    //     TS.debug.log('Weapons if statement')
    //     TS.debug.log(input.value)
    //     TS.debug.log(document.getElementById('weapons-text').value)
    //     let weapons = parseWeapons(input.value)
    //     createWeapon(weapons)
    //     // for (weapon in weapons) {
    //     //     createWeapon(weapons[weapon])
    //     // }
    // }
}

function loadStoredData() {
    TS.localStorage.campaign.getBlob().then((storedData) => {
        //localstorage blobs are just unstructured text.
        //this means we can store whatever we like, but we also need to parse it to use it.
        let data = JSON.parse(storedData || "{character={}, spells={}}");
        if (Object.entries(data['spells']).length > 0) {
            // clearStorageButton.classList.add("danger");
            // clearStorageButton.disabled = false;
            // clearStorageButton.textContent = "Clear Character Sheet";
        }
        let keyCount = 0;
        for (let [key, value] of Object.entries(data['spells'])) {
            keyCount++;
            let element = document.getElementById(key);
            element.value = value;
            if (key == "thac0") {
                element.dispatchEvent(new Event('change'));
            } else if (element.type == "checkbox") {
                element.checked = value == "on" ? true : false;
            } else if (key == "abilities-text") {
                let results = parseActions(element.value);
                addActions(results);
            } else if (key == "skills-text") {
                let results = parseSkillsLores(element.value);
                addSkillLore(results);
            } else if (key == "Hitdice-text") {
                let results = parseActions(element.value);
                addActionsNew(results);
            }
        }
        //adding some log information to the symbiote log
        //this doesn't have particular importance, but is here to show how it's done
        TS.debug.log(`Loaded ${keyCount} values from storage`);
    });
}

async function onStateChangeEvent(msg) {
    if (msg.kind === "hasInitialized") {
        //the TS Symbiote API has initialized and we can begin the setup. think of this as "init".
        // clearStorageButton = document.getElementById("clear-storage");
        loadStoredData();
        await sleep(1000);
        initSheet();
    }
}

function calculateRolls(){
    return;
}