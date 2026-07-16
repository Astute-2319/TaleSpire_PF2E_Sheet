function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initSheet() {
    // Run a roll calculation on page open
    TS.localStorage.campaign.getBlob().then((storedData) => {
        // TS.debug.log(storedData)
        //parse stored blob as json, but also handle if it's empty
        if (!storedData){
            data = JSON.parse('{"character":{}, "spells":{}}');
        }
        else{
            data = JSON.parse(storedData)
        }
        calculateRolls(data);
    }).catch((getBlobResponse) => {
        TS.debug.log("Failed to load data from local storage: " + getBlobResponse.cause);
        console.error("Failed to load data from local storage:", getBlobResponse);
    });
    
    let inputs = document.querySelectorAll("input,button,textarea,select");
    for (let input of inputs) {
        // TS.debug.log(input.id)
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
    // TS.debug.log("Input Change Start: " + input.id)
    // console.log(input.id)
    //handles input changes to store them in local storage
    let data;
    // get already stored data
    // See the folder .localStorage to see data format (it's a JSON file)
    // TODO: Can I make it have multiple "pieces"?
    // Example: [character={...}, spells={...}, ...]
    TS.localStorage.campaign.getBlob().then((storedData) => {
        // TS.debug.log(storedData)
        //parse stored blob as json, but also handle if it's empty by
        //defaulting to an empty json document "{}" if stored data is false
        data = JSON.parse(storedData || '{"character":{}, "spells":{}}');
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
        calculateRolls(data)
    }).catch((getBlobResponse) => {
        TS.debug.log("Failed to load data from local storage: " + getBlobResponse.cause);
        console.error("Failed to load data from local storage:", getBlobResponse);
    });
}

function loadStoredData() {
    TS.localStorage.campaign.getBlob().then((storedData) => {
        //localstorage blobs are just unstructured text.
        //this means we can store whatever we like, but we also need to parse it to use it.
        let data = JSON.parse(storedData || '{"character":{}, "spells":{}}');
        if (Object.entries(data['spells']).length > 0) {
            // clearStorageButton.classList.add("danger");
            // clearStorageButton.disabled = false;
            // clearStorageButton.textContent = "Clear Character Sheet";
        }
        let keyCount = 0;
        // NOTE: If while working you add an ID and later change/delete it, 
        // make sure to remove it from the data file!!!
        for (let [key, value] of Object.entries(data['spells'])) {
            // TS.debug.log(key)
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

function CALCULMODIF(TOTCARAC, EXHAUSTION){
    if (Math.floor(parseInt(TOTCARAC)/10<1)) {
        MODIF = Math.floor(((parseInt(TOTCARAC)-10)/2))-EXHAUSTION
      } else {
        MODIF = Math.floor((parseInt(TOTCARAC)-10)/2)-EXHAUSTION
      }
    return MODIF
}

function calculateRolls(data){
    var level = parseInt(data["character"]["level"]);

    spellSkill = data["character"]["spell-skill"]
    // capitalize first letter
    spellSkill = spellSkill.charAt(0).toUpperCase() + spellSkill.slice(1)
    var spellSkillVal = parseInt(parseInt(data['character']['base'+spellSkill]))

    var exhaustionmod = parseInt(data['character']['exhaustion-mod'])

    document.getElementById('spell-attack-roll').value = CALCULMODIF(spellSkillVal, exhaustionmod) + level + parseInt(data['spells']['spell-attack-prof'])
    document.getElementById('spell-dc').value = 10 + CALCULMODIF(spellSkillVal, exhaustionmod) + level + parseInt(data['spells']['spell-dc-prof'])
    document.getElementById('cantrip-level').value = Math.ceil(level/2)
    document.getElementById('cantrip-level-1').value = Math.ceil(level/2)
    document.getElementById('cantrip-level-2').value = Math.ceil(level/2)
    document.getElementById('cantrip-level-3').value = Math.ceil(level/2)
    document.getElementById('cantrip-level-4').value = Math.ceil(level/2)
    document.getElementById('cantrip-level-5').value = Math.ceil(level/2)
    document.getElementById('spell-attack-create').value = CALCULMODIF(spellSkillVal, exhaustionmod) + level + parseInt(data['spells']['spell-attack-prof'])
    document.getElementById('spell-dc-create').value = 10 + CALCULMODIF(spellSkillVal, exhaustionmod) + level + parseInt(data['spells']['spell-dc-prof'])
    return;
}

function printSpell(spellDetailsTag) {
    // TS.debug.log("Button Press")
    // TS.debug.log(data['spells'][spellDetailsTag])
    // TS.debug.log("End Button Press")
    let text = data['spells'][spellDetailsTag];
    if (text.length > 400) {
        const text_arr = text.match(/(.|[\r\n]){1,400}/g);
        for (let i = 0; i < text_arr.length; i++) {
            TS.chat.send(text_arr[i], "campaign").catch(console.error);
        }
    }
    else {
        TS.chat.send(text, "campaign").catch(console.error);
    }
}

function showCheckboxText(checkboxID, checkboxText) {
    // Get the checkbox
    var checkBox = document.getElementById(checkboxID);
    // Get the output text
    var text = document.getElementById(checkboxText);

    // If the checkbox is checked, display the output text
    if (checkBox.checked == true){
        text.style.display = "block";
    } else {
        text.style.display = "none";
    }
}

function createSpellForm() {
    let spellName, spellBaseLvl, spellSlotLvl, spellTradition, spellSchool, spellRange, 
    spellTargets, spellTargetsType, spellArea, spellAreaUnit, spellDuration, spellFreq,
    spellAttackBox, spellAttackMisc, spellDamageBox, spellDamageDieCount, spellDamageDieType,
    spellAbilityMod, spellDamageMisc, spellDamageType, spellSaveBox, spellSaveType, 
    spellSaveMisc, spellDesc = ''
    // TS.debug.log('Run createWeaponForm')
    // Get info from form on HTML page
    spellName = document.getElementById('spell-name').value
    spellBaseLvl = document.getElementById('spell-base-lvl').value
    spellSlotLvl = document.getElementById('spell-slot-lvl').value
    spellTradition = document.getElementById('spell-tra').value
    spellSchool = document.getElementById('spell-school').value
    spellRange = document.getElementById('spell-range').value
    spellTargets = document.getElementById('spell-target').value
    spellTargetsType = document.getElementById('spell-target-thing').value
    spellArea = document.getElementById('spell-area').value
    spellAreaUnit = document.getElementById('spell-area-unit').value
    spellDuration = document.getElementById('spell-duration').value
    spellFreq = document.getElementById('spell-frequency').value

    spellAttackBox = document.getElementById('spell-attack-check').value

    if (spellAttackBox == 'on') {
        spellAttackMisc = document.getElementById('spell-attack-misc').value
    }

    spellDamageBox = document.getElementById('spell-damage-check').value

    if (spellDamageBox == 'on') {
        spellDamageDieCount = document.getElementById('spell-dice-number').value
        spellDamageDieType = document.getElementById('spell-dice-type').value
        spellAbilityMod = document.getElementById('spell-damage-ability').value
        spellDamageMisc = document.getElementById('spell-damage-misc').value
        spellDamageType = document.getElementById('spell-damage-type').value
    }

    spellSaveBox = document.getElementById('spell-save-check').value

    if (spellSaveBox == 'on') {
        spellSaveType = document.getElementById('spell-save-type').value
        spellSaveMisc = document.getElementById('spell-save-misc').value
    }

    spellDesc = document.getElementById('spell-desc').value

    // if (weapName == '' || weapCat == '---' || weapType == '---'
    //     || weapDice == '---') {
    //         return
    // }

    // weapNameSave = weapName.replace(/ /g, "_")
    // weapDescSave = weapDesc.replace(/ /g, "_");

    let writeSpell = spellName+' '+spellBaseLvl+' '+spellSlotLvl+' '+spellTradition+' '+
                     spellSchool+' '+spellRange+' '+spellTargets+' '+spellTargetsType+' '+
                     spellArea+' '+spellAreaUnit+' '+spellDuration+' '+spellFreq+' '+
                     spellAttackBox+' '+spellAttackMisc+' '+spellDamageBox+' '+
                     spellDamageDieCount+' '+spellDamageDieType+' '+spellAbilityMod+' '+
                     spellDamageMisc+' '+spellDamageType+' '+spellSaveBox+' '+spellSaveType+' '+
                     spellSaveMisc+' '+spellDesc
    // let saveWeapon = weapNameSave +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDescSave
    // TS.debug.log(saveWeapon)
    document.getElementById('spells-text').value += writeSpell + '\n~~~~~\n';
    // TS.debug.log('weapons-text value: '+document.getElementById('weapons-text').value)
    // TS.debug.log('CreateWeaponForm done');
    onInputChange(document.getElementById('spells-text'));
}