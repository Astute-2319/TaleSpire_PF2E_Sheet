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
    TS.debug.log('Loading spells text')
    TS.debug.log(document.getElementById('spells-text').value)
    let spells = parseSpells(document.getElementById('spells-text').value)
    
    createSpell(spells)
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

    if (input.id == "spells-text") {
        // TS.debug.log('Weapons if statement')
        // TS.debug.log(input.value)
        // TS.debug.log(document.getElementById('weapons-text').value)
        let spells = parseSpells(input.value)
        // TS.debug.log("WEAPONS: "+weapons)
        for (spell of spells) {
            try {
                // TS.debug.log(spell["spellName"])
                clearSpell(spell["spellName"])
            }
            catch {}
        }
        // TS.debug.log("CLEAR SUCCESS")
        createSpell(spells)
    }
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
        TS.debug.log("Load stored data for loop start")
        for (let [key, value] of Object.entries(data['spells'])) {
            TS.debug.log(key)
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
        TS.debug.log("Load stored data for loop end")
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

function printSpell(spellName) {
    // TS.debug.log("Button Press")
    // TS.debug.log(spellName)
    // TS.debug.log('spell-'+spellName+'-desc')
    // TS.debug.log(document.getElementById('spell-'+spellName+'-desc').textContent)
    // TS.debug.log("End Button Press")
    let text = spellName.toUpperCase() + '\n' + document.getElementById('spell-'+spellName+'-desc').textContent;
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
    spellAttackMisc, spellDamageDieCount, spellDamageDieType, spellAbilityMod, 
    spellDamageMisc, spellDamageType, spellSaveBasic, spellSaveType, spellSaveMisc, 
    spellDesc = ''
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

    // spellAttackBox = document.getElementById('spell-attack-check').value

    if (document.getElementById('spell-attack-check').checked) {
        spellAttackMisc = document.getElementById('spell-attack-misc').value
    }
    else {
        spellAttackMisc = '`'
    }

    // spellDamageBox = docu*ment.getElementById('spell-damage-check').value

    if (document.getElementById('spell-damage-check').checked) {
        spellDamageDieCount = document.getElementById('spell-dice-number').value
        spellDamageDieType = document.getElementById('spell-dice-type').value
        spellAbilityMod = document.getElementById('spell-damage-ability').value
        spellDamageMisc = document.getElementById('spell-damage-misc').value
        spellDamageType = document.getElementById('spell-damage-type').value
    }
    else {
        spellDamageDieCount = '`'
        spellDamageDieType = '`'
        spellAbilityMod = '`'
        spellDamageMisc = '`'
        spellDamageType = '`'
    }

    // spellSaveBox = document.getElementById('spell-save-check').value

    if (document.getElementById('spell-save-check').checked) {
        spellSaveBasic = document.getElementById('spell-save-basic').checked
        spellSaveType = document.getElementById('spell-save-type').value
        spellSaveMisc = document.getElementById('spell-save-misc').value
    }
    else {
        spellSaveBasic = '`'
        spellSaveType = '`'
        spellSaveMisc = '`'
    }

    spellDesc = document.getElementById('spell-desc').value

    TS.debug.log('Create spell form desc')
    TS.debug.log(spellDesc)

    // if (weapName == '' || weapCat == '---' || weapType == '---'
    //     || weapDice == '---') {
    //         return
    // }

    // weapNameSave = weapName.replace(/ /g, "_")
    // weapDescSave = weapDesc.replace(/ /g, "_");

    let writeSpell = spellName+' '+spellBaseLvl+' '+spellSlotLvl+' '+spellTradition+' '+
                     spellSchool+' '+spellRange+' '+spellTargets+' '+spellTargetsType+' '+
                     spellArea+' '+spellAreaUnit+' '+spellDuration+' '+spellFreq+' '+
                     spellAttackMisc+' '+spellDamageDieCount+' '+spellDamageDieType+' '+
                     spellAbilityMod+' '+spellDamageMisc+' '+spellDamageType+' '+
                     spellSaveBasic+' '+spellSaveType+' '+spellSaveMisc+' '+spellDesc
    // let saveWeapon = weapNameSave +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDescSave
    // TS.debug.log(saveWeapon)
    document.getElementById('spells-text').value += writeSpell + '\n~~~~~\n';
    // TS.debug.log('weapons-text value: '+document.getElementById('weapons-text').value)
    // TS.debug.log('CreateWeaponForm done');
    onInputChange(document.getElementById('spells-text'));
}

function parseSpells(text) {
    let results = text.matchAll(/(.*) (\d+) (\d+) (arcane|divine|primal|occult) (none|abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation) (\d+) (\d+) (creature|object) (\d+) (burst|cone|emanation|line) (\d+) (constant|at-will|x-per-day) (\d+|`) (\d+|`) ((?:\d{0,2}d\d{1,2}[+-]?\d*)+|`) (str|dex|con|int|wis|cha|`) (\d+|`) (.*|`) (true|false|') (fortitude|reflex|will|`) (\d+|`) ((.|\n)*?)(\n~~~~~)/gm);
    let spells = [];
    for (let result of results) {
        TS.debug.log('Result: '+[result])
        // tempName = result[1].replace(/_/g, " ")
        // tempDesc = result[6].replace(/_/g, " ")
        // TS.debug.log('tempName: '+tempName)
        for (let i = 1; i < 21; i++) {
            if (result[i] == '`') {
                result[i] == ''
            }
        }
 
        let spell = {
            spellName: result[1],
            spellBaseLvl: result[2],
            spellSlotLvl: result[3],
            spellTradition: result[4],
            spellSchool: result[5],
            spellRange: result[6],
            spellTargets: result[7],
            spellTargetsType: result[8],
            spellArea: result[9],
            spellAreaUnit: result[10],
            spellDuration: result[11],
            spellFreq: result[12],
            spellAttackMisc: result[13],
            spellDamageDieCount: result[14],
            spellDamageDieType: result[15],
            spellAbilityMod: result[16],
            spellDamageMisc: result[17],
            spellDamageType: result[18],
            spellSaveBasic: result[19],
            spellSaveType: result[20],
            spellSaveMisc: result[21],
            spellDesc: result[22]
        }
        spells.push(spell);
    }
    // TS.debug.log("parseWeapons return: "+weapons)
    // TS.debug.log("parseWeapons[0]: "+weapons[0])
    // TS.debug.log("parseWeapons[0]['weapName']: "+weapons[0]['weapName'])
    TS.debug.log(spells)
    return spells;
}

function createSpell(spells) {
    TS.debug.log("Attempting createSpell")
    TS.debug.log(spells)
    let spellName, spellBaseLvl, spellSlotLvl, spellTradition, spellSchool, spellRange, 
    spellTargets, spellTargetsType, spellArea, spellAreaUnit, spellDuration, spellFreq,
    spellAttackMisc, spellDamageDieCount, spellDamageDieType, spellAbilityMod, 
    spellDamageMisc, spellDamageType, spellSaveBasic, spellSaveType, spellSaveMisc, 
    spellDesc = ''

    // Create new spell from template
    let templateNew = document.getElementById("spell-template");
    let containerNew = templateNew.parentElement;

    for (let i = 0; i < spells.length; i++) {
        // TS.debug.log(weapons[i]['weapName'])
        // weapName = weapons[i]['weapName']
        spellName = spells[i]['spellName']
        spellName = spellName.toLowerCase()
        spellBaseLvl = spells[i]['spellBaseLvl']
        spellSlotLvl = spells[i]['spellSlotLvl']
        spellTradition = spells[i]['spellTradition']
        spellSchool = spells[i]['spellSchool']
        spellRange = spells[i]['spellRange']
        spellTargets = spells[i]['spellTargets']
        spellTargetsType = spells[i]['spellTargetsType']
        spellArea = spells[i]['spellArea']
        spellAreaUnit = spells[i]['spellAreaUnit']
        spellDuration = spells[i]['spellDuration']
        spellFreq = spells[i]['spellFreq']
        spellAttackMisc = spells[i]['spellAttackMisc']
        spellDamageDieCount = spells[i]['spellDamageDieCount']
        spellDamageDieType = spells[i]['spellDamageDieType']
        spellAbilityMod = spells[i]['spellAbilityMod']
        spellDamageMisc = spells[i]['spellDamageMisc']
        spellDamageType = spells[i]['spellDamageType']
        spellSaveBasic = spells[i]['spellSaveBasic']
        spellSaveType = spells[i]['spellSaveType']
        spellSaveMisc = spells[i]['spellSaveMisc']
        spellDesc = spells[i]['spellDesc']

        TS.debug.log("Spell desc: ")
        TS.debug.log(spellDesc)

        // TS.debug.log('Vars saved')

        // weapNameSave = weapName.replace(/ /g, "_")
        // weapDescSave = weapDesc.replace(/ /g, "_");

        // writeWeapon += (weapName +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDesc + '\n')
        // saveText += (weapNameSave +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDescSave + '\n')
        // TS.debug.log('Save text: '+saveText)
        let writeSpell = (spellName+' '+spellBaseLvl+' '+spellSlotLvl+' '+spellTradition+' '+
                     spellSchool+' '+spellRange+' '+spellTargets+' '+spellTargetsType+' '+
                     spellArea+' '+spellAreaUnit+' '+spellDuration+' '+spellFreq+' '+
                     spellAttackMisc+' '+spellDamageDieCount+' '+spellDamageDieType+' '+
                     spellAbilityMod+' '+spellDamageMisc+' '+spellDamageType+' '+
                     spellSaveBasic+' '+spellSaveType+' '+spellSaveMisc+' '+spellDesc + '\n')

        let newSpell = templateNew.content.firstElementChild.cloneNode(true);
        newSpell.id = 'spell-container-'+ spellName
        // TS.debug.log('newSpell ID: '+newSpell.id)

        var spellExists = document.getElementById(newSpell.id);
        // TS.debug.log('Spell Exists: '+spellExists)
        
    
        let count = 1
        while (spellExists) {
            newSpell.id = newSpell.id + count;
            spellName = spellName + count;
            spellExists = document.getElementById(newSpell.id);
            count += 1;
        }

        // TS.debug.log('Past While Loop')

        // TS.debug.log(newWeapon.firstElementChild.id)
        // let newWeaponRow = newWeapon.getElementById('weapon-row')
        let newSpellRow = newSpell.firstElementChild
        newSpellRow.id = 'spell-row-'+spellName;
        // TS.debug.log('Past Weapon')
        // TS.debug.log('New Spell ID: '+newSpellRow.id)

        let newLabel = newSpellRow.querySelector("label");
        newLabel.id = 'spell-'+spellName;
        newLabel.textContent = spellName;
        newLabel.class = "field-title";
        newLabel.dataset.label = spellName;
        // newLabel.dataset.cat = weapCat;
        // newLabel.dataset.type = weapType;
        // newLabel.dataset.diceType = weapDice;
        // newLabel.dataset.tohitMod = weapTohit;
        // TS.debug.log('Past Label')

        let attackOne = newSpellRow.querySelectorAll('button')[0];
        attackOne.id = "spell-"+spellName+'-attack-1'
        attackOne.dataset.diceType = '1d20'
        // TS.debug.log('Past Attack1')
        // TS.debug.log('New Weapon Attack 1: '+ attackOne.id)

        let attackTwo = newSpellRow.querySelectorAll('button')[1];
        attackTwo.id = "spell-"+spellName+'-attack-2'
        attackTwo.dataset.diceType = '1d20'
        // TS.debug.log('Past Attack2')

        let attackThree = newSpellRow.querySelectorAll('button')[2];
        attackThree.id = "spell-"+spellName+'-attack-3'
        attackThree.dataset.diceType = '1d20'
        // TS.debug.log('Past Attack3')

        let rollDamage = newSpellRow.querySelectorAll('button')[3];
        rollDamage.id = "spell-"+spellName+'-damage'
        // rollDamage.dataset.diceType = spellDice
        // TS.debug.log('Past Damage')

        let rollDamageCrit = newSpellRow.querySelectorAll('button')[4];
        rollDamageCrit.id = "spell-"+spellName+'-damage-crit'
        // rollDamageCrit.dataset.diceType = spellDice
        // TS.debug.log('Past Crit Damage')

        let spellClear = newSpellRow.querySelectorAll('button')[5];
        spellClear.id = "spell-"+spellName+'-clear'
        // TS.debug.log('Past Clear')

        let newDesc = newSpell.querySelector('p');
        newDesc.id = 'spell-'+spellName+'-desc';
        newDesc.textContent = spellDesc;
        // TS.debug.log('Past Desc')
        TS.debug.log('Desc button time')
        let spellDescButton = newSpell.querySelectorAll('button')[6];
        spellDescButton.id = 'spell-'+spellName+'-desc-button'

        // TS.debug.log('Before Insert')

        containerNew.insertBefore(newSpell, document.getElementById("spells-text").parentNode);

        let spellNameSubmit = spellName
        let spellTradtionSubmit = spellTradition
        let spellAttackMiscSubmit = spellAttackMisc
        let spellDamageDieCountSubmit = spellDamageDieCount
        let spellDamageDieTypeSubmit = spellDamageDieType
        let spellDamageMiscSubmit = spellDamageMisc

        document.getElementById(attackOne.id).onclick=function(){spellAttack(spellNameSubmit, spellTradtionSubmit, spellAttackMiscSubmit, 0)};
        document.getElementById(attackTwo.id).onclick=function(){spellAttack(spellNameSubmit, spellTradtionSubmit, spellAttackMiscSubmit, -5)};
        document.getElementById(attackThree.id).onclick=function(){spellAttack(spellNameSubmit, spellTradtionSubmit, spellAttackMiscSubmit, -10)};
        document.getElementById(rollDamage.id).onclick=function(){spellHit(spellNameSubmit, spellTradtionSubmit, spellDamageDieCountSubmit, spellDamageDieTypeSubmit, spellDamageMiscSubmit, false, 0)};
        document.getElementById(rollDamageCrit.id).onclick=function(){spellHit(spellNameSubmit, spellTradtionSubmit, spellDamageDieCountSubmit, spellDamageDieTypeSubmit, spellDamageMiscSubmit, true, 0)};
        document.getElementById(spellClear.id).onclick=function(){clearSpell(spellNameSubmit)};
        document.getElementById(spellDescButton.id).onclick=function(){printSpell(spellNameSubmit)};
    }
    TS.debug.log('End create spells for loop')

    document.getElementById('spells-text').textContent = writeSpell;
}

function spellAttack(spellName, spellTradition, spellAttackMisc, multiAttackMod) {
    TS.debug.log("Starting spellAttack")
    let hitMod = 0
    let rollName = ''
    let rollFinal = ''

    // TS.debug.log(document.getElementById('spell-attack-roll').value)
    hitMod += parseInt(document.getElementById('spell-attack-roll').value)
    TS.debug.log("Hit Mod: "+hitMod)

    hitMod += parseInt(multiAttackMod)
    TS.debug.log("Hit Mod after multi penalty: "+hitMod)

    rollFinal = '1d20+'+hitMod

    TS.debug.log("Roll final: "+rollFinal)

    // Attack 1
    if (multiAttackMod == 0) {
        rollName = "Attack 1 with "+spellName
    }
    // Attack 2
    else if (multiAttackMod == -5) {
        rollName = "Attack 2 with "+spellName
    }
    // Attack 3
    else {
        rollName = "Attack 3 with "+spellName
    }

    let diceDesc = [{name: rollName, roll: rollFinal}]

    TS.dice.putDiceInTray(diceDesc)
}

function spellHit(spellName, spellTradition, spellDamageDieCount, spellDamageDieType, spellDamageMisc, crit, other) {
    TS.debug.log('Attempting spell hit')
    let rollName = "Damage with "+spellName;
    // TS.debug.log(spellDamageDieCount)
    let dmgDice = spellDamageDieCount+spellDamageDieType
    // TS.debug.log(dmgDice)
    let dmgMod = 0

    dmgMod += parseInt(spellDamageMisc)

    if (parseInt(dmgMod) >= 0) {
        finalRoll = dmgDice + '+' + dmgMod
    }
    else {
        finalRoll = dmgDice + dmgMod
    }

    let diceDesc = [{name: rollName, roll: finalRoll}]

    TS.dice.putDiceInTray(diceDesc)
}

function clearSpell(spell) {
    TS.debug.log('Attempting spell clear')
    TS.debug.log(document.getElementById('spell-container-'+spell.toLowerCase()))
    var removeElement = document.getElementById('spell-container-'+spell.toLowerCase())
    // TS.debug.log(removeElement)
    document.getElementById(removeElement.id).remove();
}