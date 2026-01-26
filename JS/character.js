var clearStorageButton = undefined;
var level = 0;

// Conditions that have a number associated
var valuedConditions = [
    'clumsy',
    'doomed',
    'drained',
    'dying',
    'enfeebled',
    'frightened',
    'persdamage',
    'sickened',
    'slowed',
    'stunned',
    'stupefied',
    'wounded'
]

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initSheet() {
    // TS.debug.log(document.getElementById('weapons-text').textContent)
    let inputs = document.querySelectorAll("input,button,textarea,select");
    for (let input of inputs) {
        // TS.debug.log(input.id)
        if (input.id != undefined && input.id != "clear-storage") {
            input.addEventListener("change", function() {
                onInputChange(input)
            });

            let titleSibling = findFirstSiblingWithClass(input, "field-title");
            if (titleSibling != null) {
                titleSibling.id = `${input.id}-field-title`;
            }
            let descSibling = findFirstSiblingWithClass(input, "field-desc");
            if (descSibling != null) {
                descSibling.id = `${input.id}-field-desc`;
            }

            let finalInput = input; //otherwise the input can change which breaks the onchange handler
            if (titleSibling == null && input.dataset.modifier != undefined) {
                //manual fix for melee/ranged attack buttons being formatted differently
                titleSibling = finalInput;
                finalInput = document.getElementById(finalInput.dataset.modifier);
            }

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
    if (input.id == 'weapons-text') {
        TS.debug.log("Input type: "+input.type)
        TS.debug.log("value: "+document.getElementById('weapons-text').value)
    // TS.debug.log(input.id)
    }
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
        data = JSON.parse(storedData || "{}");
        if (input.type == "checkbox") {
            data[input.id] = input.checked ? "on" : "off";
        } 
        // else if (input.type == "textarea") {
        //     data[input.id] = input.textContent;
        // } 
        else {
            data[input.id] = input.value;
        }
        //set new data, handle response
        TS.localStorage.campaign.setBlob(JSON.stringify(data)).then(() => {
            //if storing the data succeeded, enable the clear storage button
            clearStorageButton.classList.add("danger");
            clearStorageButton.disabled = false;
            clearStorageButton.textContent = "Clear Character Sheet";
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

    if (input.id == "abilities-text") {
        TS.debug.log('Abilities if statement')
        let actions = parseActions(input.value);
        addActions(actions);
    }

    if (input.id == "skills-text") {
        TS.debug.log('Skills if statement')
        let skills = parseSkillsLores(input.value);
        addSkillLore(skills);
        // for (skill in skills['title']) {
        //     // TS.debug.log(skill);
        // }
    }

    if (input.id == "Hitdice-text") {
        TS.debug.log('Hitdice if statement')
        let actionsNew = parseActions(input.value);
        addActionsNew(actionsNew);
    }

    if (input.id == "weapons-text") {
        TS.debug.log('Weapons if statement')
        TS.debug.log(input.value)
        TS.debug.log(document.getElementById('weapons-text').value)
        let weapons = parseWeapons(input.value)
        createWeapon(weapons)
        // for (weapon in weapons) {
        //     createWeapon(weapons[weapon])
        // }
    }
}

function findFirstSiblingWithClass(element, className) {
    let siblings = element.parentElement.children;
    for (let sibling of siblings) {
        if (sibling.classList.contains(className)) {
            return sibling;
        }
    }
    return null;
}

function createDiceRoll(clickElement, inputElement) {
    let modifierString = "";

    // TS.debug.log("Click Element: "+clickElement.id)
    // TS.debug.log("Input Element: "+inputElement.id+"\n")

    // If the thing being rolled has a prof modifier (saves, skills, etc.)
    if (clickElement.dataset.modifier != "no-mod" && inputElement != null && clickElement.dataset.prof) {
        // If it is a save or you are proficient in any way, always add level
        // TS.debug.log("CreateDiceRoll input element: "+inputElement.value)
        if (inputElement.dataset.save == true || inputElement.value > 0) {
            // If more than one modifier
            if (inputElement.dataset.modifier.includes(',')) {
                // TS.debug.log('Includes ,')
                var modifsArray = inputElement.dataset.modifier.split(',')
                // TS.debug.log(modifsArray)
                var total = 0
                for (i in modifsArray) {
                    // TS.debug.log("ADD LEVEL")
                    // TS.debug.log("Training: "+parseInt(inputElement.value))
                    // TS.debug.log("Level: "+parseInt(level))
                    // TS.debug.log("Mod 1: "+modifsArray[i])
                    // TS.debug.log("Mod 2: "+document.getElementById(modifsArray[i]))
                    // TS.debug.log("Mod Final: "+document.getElementById(modifsArray[i]).value)
                    total += parseInt(document.getElementById(modifsArray[i]).value)
                }
                modifierString = "+" + (parseInt(inputElement.value) + parseInt(level) + parseInt(total));
                // TS.debug.log("Mod string: "+modifierString);
            }

            else {
                modifierString = "+" + (parseInt(inputElement.value) + parseInt(level) + parseInt(document.getElementById(inputElement.dataset.modifier).value));
            }


        }
        // Otherwise, don't add level
        else {
            // TS.debug.log("NO LEVEL")
            modifierString ="+" + (parseInt(inputElement.value) + parseInt(document.getElementById(inputElement.dataset.modifier).value));
        }
        // modifierString = inputElement.value >= 0 ? "+" + (parseInt(inputElement.value) + parseInt(level) + parseInt(document.getElementById(inputElement.dataset.modifier).value)) : inputElement.value;
        // TS.debug.log(modifierString);
    }

    else if (clickElement.dataset.modifier != "no-mod" && inputElement != null) {
        modifierString = inputElement.value >= 0 ? "+" + inputElement.value : inputElement.value;
    }
    let label = "";
    if (clickElement.dataset.label != undefined) {
        label = clickElement.dataset.label;
    } else {
        label = clickElement.textContent;
    }
    let roll = `${clickElement.dataset.diceType}${modifierString == '+' ? '' : modifierString}`

    //this returns a roll descriptor object. we could be using TS.dice.makeRollDescriptor(`${roll}+${modifierString}`) instead
    //depends mostly on personal preference. using makeRollDescriptor can be safer through updates, but it's also less efficient
    //and would ideally need error handling on the return value (and can be rate limited)
    return { name: label, roll: roll };
}

// function manualCheckWeapText() {
//     let input = document.getElementById('weapons-text')
//     let weapons = parseWeapons(input.textContent)
//     createWeapon(weapons)
// }

function createWeaponForm() {
    let weapName, weapCat, weapType, weapDice, weapToHit, weapDesc = ''
    TS.debug.log('Run createWeaponForm')
    // Get info from form on HTML page
    weapName = document.getElementById('weapon-name').value
    weapCat = document.getElementById('weapon-cat').value
    weapType = document.getElementById('weapon-type').value
    weapDice = document.getElementById('weapon-dice-number').value + document.getElementById('weapon-dice-type').value
    weapTohit = document.getElementById('weapon-tohit-mod').value
    weapDesc = document.getElementById('weapon-desc').value

    // if (weapName == '' || weapCat == '---' || weapType == '---'
    //     || weapDice == '---') {
    //         return
    // }

    weapNameSave = weapName.replace(/ /g, "_")
    weapDescSave = weapDesc.replace(/ /g, "_");

    let writeWeapon = weapName +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDesc
    let saveWeapon = weapNameSave +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDescSave
    // TS.debug.log(saveWeapon)
    document.getElementById('weapons-text').value += writeWeapon + '\n';
    // TS.debug.log('weapons-text value: '+document.getElementById('weapons-text').value)
    // TS.debug.log('CreateWeaponForm done');
    onInputChange(document.getElementById('weapons-text'));
}

function createWeapon(weapons){
    TS.debug.log("In createWeapon call")

    // let oldWeaponsNew = document.querySelectorAll("[id^=list-weapons-new]");
    // for (let oldWeaponsNew of oldWeaponsNew) {
    //     TS.debug.log('removing weapon')
    //     oldWeaponsNew.remove();
    // }
    // TS.debug.log('After removal')

    let weapName, weapCat, weapType, weapDice, weapToHit, weapDesc = ''
    
    // Create new weapon from template
    let templateNew = document.getElementById("weapon-template");
    let containerNew = templateNew.parentElement;
    let writeWeapon = ''
    let saveText = '';

    TS.debug.log(weapons.length)

    for (let i = 0; i < weapons.length; i++) {
        // TS.debug.log(weapons[i]['weapName'])
        weapName = weapons[i]['weapName']
        weapCat = weapons[i]['weapCat']
        weapType = weapons[i]['weapType']
        weapDice = weapons[i]['weapDice']
        weapTohit = weapons[i]['weapTohit']
        weapDesc = weapons[i]['weapDesc']

        weapNameSave = weapName.replace(/ /g, "_")
        weapDescSave = weapDesc.replace(/ /g, "_");

        writeWeapon += (weapName +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDesc + '\n')
        // saveText += (weapNameSave +' '+ weapCat +' '+ weapType +' '+ weapDice +' '+ weapTohit +' '+ weapDescSave + '\n')
        TS.debug.log('Save text: '+saveText)

        let newWeapon = templateNew.content.firstElementChild.cloneNode(true);
        newWeapon.id = 'weapon-container-'+ weapName.toLowerCase().replace(' ', '-')
        TS.debug.log('newWeapon ID: '+newWeapon.id)

        var weaponExists = document.getElementById(newWeapon.id);
        TS.debug.log('Weapon Exists: '+weaponExists)
        
    
        let count = 1
        while (weaponExists) {
            newWeapon.id = newWeapon.id + count;
            weapName = weapName + count;
            weaponExists = document.getElementById(newWeapon.id);
            count += 1;
        }

        TS.debug.log('Past While Loop')

        // TS.debug.log(newWeapon.firstElementChild.id)
        // let newWeaponRow = newWeapon.getElementById('weapon-row')
        let newWeaponRow = newWeapon.firstElementChild
        newWeaponRow.id = 'weapon-row-'+weapName;
        TS.debug.log('Past Weapon')
        TS.debug.log('New Weapon ID: '+newWeaponRow.id)

        let newLabel = newWeaponRow.querySelector("label");
        newLabel.id = 'weapon-'+weapName;
        newLabel.textContent = weapName;
        newLabel.class = "field-title";
        newLabel.dataset.label = weapName;
        newLabel.dataset.cat = weapCat;
        newLabel.dataset.type = weapType;
        newLabel.dataset.diceType = weapDice;
        newLabel.dataset.tohitMod = weapTohit;
        // TS.debug.log('Past Label')

        let attackOne = newWeaponRow.querySelectorAll('button')[0];
        attackOne.id = "weapon-"+weapName+'-attack-1'
        attackOne.dataset.diceType = '1d20'
        TS.debug.log('Past Attack1')
        TS.debug.log('New Weapon Attack 1: '+ attackOne.id)

        let attackTwo = newWeaponRow.querySelectorAll('button')[1];
        attackTwo.id = "weapon-"+weapName+'-attack-2'
        attackTwo.dataset.diceType = '1d20'
        // TS.debug.log('Past Attack2')

        let attackThree = newWeaponRow.querySelectorAll('button')[2];
        attackThree.id = "weapon-"+weapName+'-attack-3'
        attackThree.dataset.diceType = '1d20'
        // TS.debug.log('Past Attack3')

        let rollDamage = newWeaponRow.querySelectorAll('button')[3];
        rollDamage.id = "weapon-"+weapName+'-damage'
        rollDamage.dataset.diceType = weapDice
        // TS.debug.log('Past Damage')

        let weaponClear = newWeaponRow.querySelectorAll('button')[4];
        weaponClear.id = "weapon-"+weapName+'-clear'
        // TS.debug.log('Past Clear')

        let newDesc = newWeapon.querySelector('p');
        newDesc.id = 'weapon-'+weapName+'-desc';
        newDesc.textContent = weapDesc;
        // TS.debug.log('Past Desc')

        TS.debug.log('Before Insert')

        containerNew.insertBefore(newWeapon, document.getElementById("weapons-text").parentNode);

        // TS.debug.log(weapName)
        // TS.debug.log(weapCat)
        // TS.debug.log(weapType)
        // TS.debug.log(weapTohit)
        // TS.debug.log('Attack 1 ID: '+attackOne.id)

        let weapNameSubmit = weapName
        let weapCatSubmit = weapCat
        let weapTypeSubmit = weapType
        let weapTohitSubmit = weapTohit
        let weapDiceSubmit = weapDice

        document.getElementById(attackOne.id).onclick=function(){weaponAttack(weapNameSubmit, weapCatSubmit, weapTypeSubmit, weapTohitSubmit, 0)};
        document.getElementById(attackTwo.id).onclick=function(){weaponAttack(weapNameSubmit, weapCatSubmit, weapTypeSubmit, weapTohitSubmit, -5)};
        document.getElementById(attackThree.id).onclick=function(){weaponAttack(weapNameSubmit, weapCatSubmit, weapTypeSubmit, weapTohitSubmit, -10)};
        document.getElementById(rollDamage.id).onclick=function(){weaponHit(weapNameSubmit, weapTypeSubmit, weapDiceSubmit, 0)};
        document.getElementById(weaponClear.id).onclick=function(){clearWeapon(weapNameSubmit)};


    }

    TS.debug.log(document.getElementById('weapon-Mace-attack-1').onclick)
    TS.debug.log(document.getElementById('weapon-Longbow-attack-1').onclick)

    document.getElementById('weapons-text').textContent = writeWeapon;
}

function weaponAttack(weapName, weapCat, weapType, weapTohitMod, multiAttackMod) {
    let hitMod = 0
    let rollName = ''
    let rollFinal = ''
    
    // Get weapon training modifier
    if (weapCat == 'unarmed') {
        let unarmedTrain = parseInt(document.getElementById('unarmed-train').value)
        if (unarmedTrain > 0) {
            hitMod += unarmedTrain + level
        }
    }
    else if (weapCat == 'simple') {
        let simpleTrain = parseInt(document.getElementById('simple-train').value)
        if (simpleTrain > 0) {
            hitMod += simpleTrain + level
        }
    }
    else {
        let martialTrain = (document.getElementById('martial-train').value)
        if (martialTrain > 0) {
            hitMod += martialTrain + level
        }
    }

    if (weapType == 'melee') {
        hitMod += parseInt(document.getElementById('MODIF_STR').value)
    }
    else {
        hitMod += parseInt(document.getElementById('MODIF_DEX').value)
    }

    hitMod += parseInt(weapTohitMod) + parseInt(multiAttackMod)

    if (parseInt(hitMod) >= 0 ){
        rollFinal = '1d20+'+hitMod
    }
    else {
        rollFinal = '1d20'+hitMod
    }
    
    TS.debug.log('Roll final: '+rollFinal)

    // Attack 1
    if (multiAttackMod == 0) {
        rollName = "Attack 1 with "+weapName
    }
    // Attack 2
    else if (multiAttackMod == -5) {
        rollName = "Attack 2 with "+weapName
    }
    // Attack 3
    else {
        rollName = "Attack 3 with "+weapName
    }

    let diceDesc = [{name: rollName, roll: rollFinal}]

    TS.dice.putDiceInTray(diceDesc)

}

function weaponHit(weapName, weapType, weapDice, other) {
    let rollName = "Damage with "+weapName;
    let dmgDice = weapDice
    let dmgMod = 0

    if (weapType == 'melee') {
        dmgMod += parseInt(document.getElementById('MODIF_STR').value)
    }
    else {
        dmgMod += parseInt(document.getElementById('MODIF_DEX').value)
    }

    dmgMod += other

    if (parseInt(dmgMod) >= 0) {
        finalRoll = dmgDice + '+' + dmgMod
    }
    else {
        finalRoll = dmgDice + dmgMod
    }
    

    let diceDesc = [{name: rollName, roll: finalRoll}]

    TS.dice.putDiceInTray(diceDesc)
}

function clearWeapon(weapon) {
    var removeElement1 = document.getElementById('weapon-row-'+weapon)
    var removeElement2 = document.getElementById('weapon-desc-'+weapon)
    document.getElementById(removeElement1.id).remove();
    document.getElementById(removeElement2.id).remove();
}

function parseSkillsLores(text) {
    let results = text.matchAll(/(.*) (STR|INT|WIS|DEX|CON|CHA) ?(.*)/gi);
    let skills = [];
    for (let result of results) {
        let skill = {
            title: result[1],
            mod: result[2],
            description: result[3]
        }
        skills.push(skill);
    }
    return skills;
}

function parseWeapons(text) {
    TS.debug.log('parseWeapons Text: '+text)
    let results = text.matchAll(/(.*) (.*) (.*) ((?:\d{0,2}d\d{1,2}[+-]?\d*)+) (\d+) ?(.*)/gi);
    // TS.debug.log('regex results: '+results)
    let weapons = [];
    for (let result of results) {
        TS.debug.log('Result: '+[result])
        tempName = result[1].replace(/_/g, " ")
        tempDesc = result[6].replace(/_/g, " ")
        // TS.debug.log('tempName: '+tempName)
        let weapon = {
            weapName: tempName,
            weapCat: result[2],
            weapType: result[3],
            weapDice: result[4],
            weapTohit: result[5],
            weapDesc: tempDesc
        }
        weapons.push(weapon);
    }
    TS.debug.log("parseWeapons return: "+weapons)
    TS.debug.log("parseWeapons[0]: "+weapons[0])
    TS.debug.log("parseWeapons[0]['weapName']: "+weapons[0]['weapName'])
    return weapons;
}

function parseActions(text) {
    let results = text.matchAll(/(.*) ((?:\d{0,2}d\d{1,2}[+-]?\d*)+) ?(.*)/gi);
    let actions = [];
    for (let result of results) {
        let action = {
            title: result[1],
            dice: result[2],
            description: result[3]
        }
        actions.push(action);
    }
    return actions;
}

function addActions(results) {
    //remove old actions
    let oldActions = document.querySelectorAll("[id^=list-action-main]");
    for (let oldAction of oldActions) {
        oldAction.remove();
    }

    //add new actions
    let template = document.getElementById("abilities-template");

    let container = template.parentElement;
    for (let i = 0; i < results.length; i++) {
        let clonedAction = template.content.firstElementChild.cloneNode(true);
        clonedAction.id = "list-action-main" + i;
        let title = clonedAction.querySelector("[id=abilities-template-title]");
        title.removeAttribute("id");
        title.textContent = results[i]["title"];

        let description = clonedAction.querySelector("[id=abilities-template-desc]");
        description.removeAttribute("id");
        description.textContent = results[i]["description"];

        let button = clonedAction.querySelector("[id=abilities-template-button]");
        button.id = "action-button" + i;
        button.dataset.diceType = results[i]["dice"];
        button.dataset.label = results[i]["title"];
        button.addEventListener("click", function() {
            TS.dice.putDiceInTray([createDiceRoll(button, null)]);
            //we are not checking for success or failure here, but could easily by adding a .then (success) and .catch (failure)
        });

        container.insertBefore(clonedAction, document.getElementById("abilities-text").parentElement);
    }
}

function addActionsNew(results) {
    const hitText = "Hitdice-template-button"
    //remove old actions
    let oldActionsNew = document.querySelectorAll("[id^=list-action-new]");
    for (let oldActionNew of oldActionsNew) {
        oldActionNew.remove();
    }
     //add new actions    
     let templateNew = document.getElementById("Hitdice-template");
   
     let containerNew = templateNew.parentElement;
     for (let i = 0; i < results.length; i++) {
         let clonedActionNew = templateNew.content.firstElementChild.cloneNode(true);
         clonedActionNew.id = "list-action-new" + i;
         let titleNew = clonedActionNew.querySelector("[id=Hitdice-template-title]");
         titleNew.removeAttribute("id");
         titleNew.textContent = results[i]["title"];
 
         let descriptionNew = clonedActionNew.querySelector("[id=Hitdice-template-desc]");
         descriptionNew.removeAttribute("id");
         descriptionNew.textContent = results[i]["description"];

         for (let j = 0; j<3; j ++){
            let newText = hitText + j.toString()
            let buttonNew = clonedActionNew.querySelector("[id="+newText+"]");
            buttonNew.id = "action-button-new" + i;
            if (j>0){
                var mod = (results[i]["dice"].toString().split("+"))[1]
                var op = 1 
                var intMod = 0

                if(mod == undefined){

                    mod = (results[i]["dice"].toString().split("-"))[1]
                    if(mod == undefined){
                        mod = 0
                    }
                    intMod = (parseInt(mod)*-1)
                    intMod = intMod - (5*j)
                    op = 2

                } else {
                    intMod = parseInt(mod)
                    intMod = intMod - (5*j) 
                }
                
                if (intMod<0){
                    if (op == 1){
                        buttonNew.dataset.diceType = results[i]["dice"].toString().split("+")[0].toString() + "-"+Math.abs(intMod).toString();
                    } else {
                        buttonNew.dataset.diceType = results[i]["dice"].toString().split("-")[0].toString() + "-"+Math.abs(intMod).toString();
                    }

                } else{
                    buttonNew.dataset.diceType = results[i]["dice"].toString().split("+")[0].toString() + "+"+intMod.toString();
                }
                
            } else {
                buttonNew.dataset.diceType = results[i]["dice"]
            }
            
            buttonNew.dataset.label = results[i]["title"];
            buttonNew.addEventListener("click", function() {
                TS.dice.putDiceInTray([createDiceRoll(buttonNew, null)]);
                //we are not checking for success or failure here, but could easily by adding a .then (success) and .catch (failure)
            });
 
            containerNew.insertBefore(clonedActionNew, document.getElementById("Hitdice-text").parentElement);


         }
 
         
     }
}

function addSkillLore(results) {
    // TS.debug.log("In addSkillLore call")
    const skillText = "skill-template-title"
    //remove old actions
    let oldSkillsNew = document.querySelectorAll("[id^=list-skill-new]");
    for (let oldSkillNew of oldSkillsNew) {
        oldSkillNew.remove();
    }

    //add new skills
    let templateNew = document.getElementById("skill-template");
   
    let containerNew = templateNew.parentElement;
    // TS.debug.log("Before first FOR loop");
    // For each item written down
    for (let i = 0; i < results.length; i++) {
        let newSkill = templateNew.content.firstElementChild.cloneNode(true);

        let newLabel = newSkill.querySelector("label")
        newLabel.id = results[i]["title"];
        newLabel.textContent = results[i]["title"];
        newLabel.class = "field-title";
        newLabel.dataset.modifier = results[i]["title"]+"Tot"
        newLabel.dataset.label = results[i]["title"];

        let newInput1 = newSkill.querySelector("input");
        newInput1.id = results[i]["title"]+"Bon";

        let newInput2 = newSkill.querySelectorAll("input")[1];
        newInput2.id = results[i]["title"]+"Tot";

        let newSelect = newSkill.querySelector("select");
        newSelect.id = results[i]["title"]+"-train";
        newSelect.dataset.modifier = "MODIF_"+results[i]["mod"].toUpperCase();

        let newDesc = newSkill.querySelector("p");
        newDesc.id = results[i]["description"];
        newDesc.textContent = results[i]["description"];

        containerNew.insertBefore(newSkill, document.getElementById("skills-text").parentElement);

        var skillMod = newSelect.dataset.modifier
        var skillTrain = document.getElementById(newSelect.id).value;
        var skillBon = document.getElementById(newInput1.id).value;
        document.getElementById(newInput2.id).value = BONCALC (skillMod, skillBon, skillTrain, level, true);
    }
}

function addCondition() {
    var condition = document.getElementById("conditions").value
    var conditionExists = document.getElementById("condition-"+condition);

    // If the condition already exists, do nothing
    if (conditionExists && condition != 'persdamage') {
        return
    }
    // Otherwise, add it
    else {
        let templateNew = document.getElementById("condition-template");
        let containerNew = templateNew.parentElement;

        let newCondition = templateNew.content.firstElementChild.cloneNode(true);
        newCondition.id = 'condition-row-'+condition

        let newLabel = newCondition.querySelector("label")
        newLabel.id = 'condition-'+condition;
        newLabel.textContent = condition;
        newLabel.class = "field-title";
        newLabel.dataset.label = condition;

        if (valuedConditions.includes(condition)) {
            let newInput = newCondition.querySelector("input");
            newInput.id = 'condition-num-'+condition;
            newInput.value = 1
        }
        else {
            newCondition.querySelector('input').remove()
        }

        // If persistent damage, add a drop down for the type
        if (condition == 'persdamage') {
            for (i = 0; i < 3; i++) {
                var newSelectID = "condition-persdamage-select"+i
                if (!(document.getElementById(newSelectID))) {
                    break
                }
            }

            let newSelect = newCondition.querySelector("select");
            newSelect.id = newSelectID;
        }
        else {
            newCondition.querySelector('select').remove()
        }

        // TS.debug.log("Description")
        let newDesc = newCondition.querySelector("p");
        newDesc.id = 'condition-desc-'+condition;
        newDesc.textContent = conditionDescriptions[condition];
        // TS.debug.log(newDesc.id)
        // TS.debug.log(newDesc.textContent)

        let newButton = newCondition.querySelector("button");
        newButton.id = "clear-condition-"+condition;
        containerNew.insertBefore(newCondition, document.getElementById("condition-temp").parentElement);

        // add this after the container is created so the button exists
        document.getElementById(newButton.id).onclick=function(){clearCondition(condition)};
    }
}

function clearCondition(condition) {
    var removeElement = document.getElementById('condition-row-'+condition)
    document.getElementById(removeElement.id).remove();
}

function populateTHAC0(event) {
    let matrix = document.getElementById("thac0-matrix");
    let children = matrix.children;
    let remainingElements = 9;
    for (let child of children) {
        if (child.classList.contains("field-data-short")) {
            child.textContent = event.target.value - remainingElements;
            remainingElements--;
        }
    }
}

function loadStoredData() {
    TS.localStorage.campaign.getBlob().then((storedData) => {
        //localstorage blobs are just unstructured text.
        //this means we can store whatever we like, but we also need to parse it to use it.
        let data = JSON.parse(storedData || "{}");
        if (Object.entries(data).length > 0) {
            clearStorageButton.classList.add("danger");
            clearStorageButton.disabled = false;
            clearStorageButton.textContent = "Clear Character Sheet";
        }
        let keyCount = 0;
        for (let [key, value] of Object.entries(data)) {
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

function clearSheet() {
    //clear stored data
    TS.localStorage.campaign.deleteBlob().then(() => {
        //if the delete succeeded (.then), set the UI to reflect that
        clearStorageButton.classList.remove("danger");
        clearStorageButton.disabled = true;
        clearStorageButton.textContent = "Character Sheet Empty";
    }).catch((deleteResponse) => {
        //if the delete failed (.catch), write a message to symbiote log
        TS.debug.log("Failed to delete local storage: " + deleteResponse.cause);
        console.error("Failed to delete local storage:", deleteResponse);
    });

    //clear sheet inputs
    let inputs = document.querySelectorAll("input,textarea");
    for (let input of inputs) {
        switch (input.type) {
            case "button":
                break;
            case "checkbox":
                input.checked = false;
                break;
            default:
                input.value = "";
                break;
        }
    }
}

async function onStateChangeEvent(msg) {
    if (msg.kind === "hasInitialized") {
        //the TS Symbiote API has initialized and we can begin the setup. think of this as "init".
        clearStorageButton = document.getElementById("clear-storage");
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

function CALCULCOND(condition, value) {
    // TS.debug.log(conditionModifiers[condition])
    // var finalArray = 
    // TS.debug.log(value)
    return conditionModifiers[condition].map(x => x * parseInt(value));
}

function BONCALC(MOD, BON, TRAIN, LEVEL, SKILL){
    // If the bonus being calculated is for a skill, only add a proficiency if TRAIN is non 0
    if (SKILL) {
        if (TRAIN > 0) {
            if (parseInt(BON)>0){
                BONUS = parseFloat(MOD)+parseFloat(BON)+parseFloat(ProfBonus(TRAIN, LEVEL))
            } else {
                BONUS = parseFloat(MOD)+parseFloat(ProfBonus(TRAIN, LEVEL))
            }
        }
        else {
            if (parseInt(BON)>0){
                BONUS = parseFloat(MOD)+parseFloat(BON)
            } else {
                BONUS = parseFloat(MOD)
            }
        }
    }

    // If the bonus is not for a skill (a save), always add the prof bonus
    else {
        if (parseInt(BON)>0){
            BONUS = parseFloat(MOD)+parseFloat(BON)+parseFloat(ProfBonus(TRAIN, LEVEL))
        } else {
            BONUS = parseFloat(MOD)+parseFloat(ProfBonus(TRAIN, LEVEL))
        }
    }
    
    return parseInt(BONUS)
}

function EXMOD(EXHAUSTIONMOD){
    if (parseInt(EXHAUSTIONMOD)>0){
        MALUS = -1*parseFloat(EXHAUSTIONMOD)
    } else {
        MALUS = parseFloat(EXHAUSTIONMOD)
    }
    return MALUS
}
function ATTEXH(ATT, EXHAUSTIONMOD){
    if (parseInt(EXHAUSTIONMOD)>0){
        ATTMALUS = parseFloat(ATT)-parseFloat(EXHAUSTIONMOD)
    } else {
        ATTMALUS = parseFloat(ATT)
    }
    return ATTMALUS
}

function LVLPROF(LEVEL){
    if (parseInt(LEVEL)>4){
        PROFICIENCY = Math.ceil(parseFloat(LEVEL)/4)+1
    } else {
        PROFICIENCY = 2
    }
    return PROFICIENCY
}

function ProfBonus(training, level) {
    return parseInt(training)+level
}

function addToInitiative() {
    input = document.getElementById("init-train")
    let finalInput = input;
    let titleSibling = findFirstSiblingWithClass(input, "field-title");
    titleSibling.id = `${input.id}-field-title`;
    TS.dice.putDiceInTray([createDiceRoll(titleSibling, finalInput)]);
}

function calculateRolls(){
   
    level = parseInt(document.getElementById('level').value) ;
    document.getElementById('Proficiency Bonus').value = LVLPROF(level);

    var baseStr = document.getElementById('baseStr').value ;
    var baseInt = document.getElementById('baseInt').value ;
    var baseWis = document.getElementById('baseWis').value ;
    var baseDex = document.getElementById('baseDex').value ;
    var baseCon = document.getElementById('baseCon').value ;
    var baseCha = document.getElementById('baseCha').value ;


    // var missileATT = document.getElementById('missile-mod').value ;
    // var spellATT = document.getElementById('spell-mod').value ;

    var fortTrain = document.getElementById('fort-train').value;
    var reflTrain = document.getElementById('refl-train').value;
    var willTrain = document.getElementById('will-train').value;

    var initTrain = document.getElementById('init-train').value;

    var acrTrain = document.getElementById('acr-train').value;
    var arcTrain = document.getElementById('arc-train').value;
    var athTrain = document.getElementById('ath-train').value;
    var craTrain = document.getElementById('cra-train').value;
    var decTrain = document.getElementById('dec-train').value;
    var dipTrain = document.getElementById('dip-train').value;
    var intimTrain = document.getElementById('intim-train').value;
    var medTrain = document.getElementById('med-train').value;
    var natTrain = document.getElementById('nat-train').value;
    var occTrain = document.getElementById('occ-train').value;
    var perfTrain = document.getElementById('perf-train').value;
    var relTrain = document.getElementById('rel-train').value;
    var socTrain = document.getElementById('soc-train').value;
    var steTrain = document.getElementById('ste-train').value;
    var surTrain = document.getElementById('sur-train').value;
    var thiTrain = document.getElementById('thi-train').value;

    var acTrain = document.getElementById('ac-train').value;
    var classTrain = document.getElementById('class-train').value;
    var spellTrain = document.getElementById('spell-train').value;
    var simpleTrain = document.getElementById('simple-train').value;
    var martialTrain = document.getElementById('martial-train').value;
    

    var saveFortBon = document.getElementById('save-fortitude-bon').value;
    var saveReflexBon = document.getElementById('save-reflex-bon').value;
    var saveWillBon = document.getElementById('save-will-bon').value; 

    var acBon = document.getElementById('acBon').value;
    var classBon = document.getElementById('classBon').value;
    var spellBon = document.getElementById('spellBon').value;
    
    var InitBon = document.getElementById('InitBon').value;
    var AcrBon = document.getElementById('AcrBon').value;
    var ArcBon = document.getElementById('ArcBon').value;
    var AthBon = document.getElementById('AthBon').value;
    var CraBon = document.getElementById('CraBon').value;
    var DecBon = document.getElementById('DecBon').value;
    var DipBon = document.getElementById('DipBon').value;
    var IntimBon = document.getElementById('IntimBon').value;
    var MedBon = document.getElementById('MedBon').value;

    var NatBon = document.getElementById('NatBon').value;
    var OccBon = document.getElementById('OccBon').value;
    var PerfBon = document.getElementById('PerfBon').value;
    var RelBon = document.getElementById('RelBon').value;
    var SocBon = document.getElementById('SocBon').value;
    var SteBon = document.getElementById('SteBon').value;
    var SurBon = document.getElementById('SurBon').value;
    var ThiBon = document.getElementById('ThiBon').value;

    var exhaustionmod = document.getElementById('exhaustion-mod').value;

    // TS.debug.log("Exhaustion: "+exhaustionmod); // --- 0

    document.getElementById('exhaustion-mod-neg').value = EXMOD(exhaustionmod);

    // document.getElementById('missile-mod-exhaustion').value = ATTEXH(missileATT, exhaustionmod);
    // document.getElementById('spell-mod-exhaustion').value = ATTEXH(spellATT, exhaustionmod);

    document.getElementById('MODIF_STR').value = CALCULMODIF(baseStr, exhaustionmod);
    document.getElementById('MODIF_INT').value = CALCULMODIF(baseInt, exhaustionmod);
    document.getElementById('MODIF_WIS').value = CALCULMODIF(baseWis, exhaustionmod);
    document.getElementById('MODIF_DEX').value = CALCULMODIF(baseDex, exhaustionmod);
    document.getElementById('MODIF_CON').value = CALCULMODIF(baseCon, exhaustionmod);
    document.getElementById('MODIF_CHA').value = CALCULMODIF(baseCha, exhaustionmod);

    var MODIF_STR = parseInt(document.getElementById('MODIF_STR').value);
    var MODIF_INT = parseInt(document.getElementById('MODIF_INT').value);
    var MODIF_WIS = parseInt(document.getElementById('MODIF_WIS').value);
    var MODIF_DEX = parseInt(document.getElementById('MODIF_DEX').value);
    var MODIF_CON = parseInt(document.getElementById('MODIF_CON').value);
    var MODIF_CHA = parseInt(document.getElementById('MODIF_CHA').value);

    // Getting condition modifiers
    var keys = Object.keys(conditionModifiers)
    var allCondMods = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    var tempCondMods = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    for (i in keys){
        condCheck = document.getElementById('condition-row-'+keys[i])
        // if condition is present, update mod array
        // TS.debug.log(condCheck)
        if (condCheck) {
            // if the condition has a value
            if (valuedConditions.includes(keys[i])){
                tempCondMods = CALCULCOND(keys[i], document.getElementById('condition-num-'+keys[i]).value)
                allCondMods = tempCondMods.map(function (num, idx) {
                    return num + allCondMods[idx];
            });
            }
            else {
                tempCondMods = CALCULCOND(keys[i], 1)
                allCondMods = tempCondMods.map(function (num, idx) {
                    return num + allCondMods[idx];
                });
            }
            
        }
    }

    MODIF_STR += parseInt(allCondMods[0])
    MODIF_INT += parseInt(allCondMods[1])
    MODIF_WIS += parseInt(allCondMods[2])
    MODIF_DEX += parseInt(allCondMods[3])
    MODIF_CON += parseInt(allCondMods[4])
    MODIF_CHA += parseInt(allCondMods[5])
    var MODIF_PER = parseInt(allCondMods[6])
    var MODIF_FOR = parseInt(allCondMods[7])
    var MODIF_RFX = parseInt(allCondMods[8])
    var MODIF_WIL = parseInt(allCondMods[9])
    var MODIF_AC = parseInt(allCondMods[10])
    var MODIF_HP_MAX = parseInt(allCondMods[11])
    var MODIF_ALL_SKILLS = parseInt(allCondMods[12])
    var MODIF_ALL_SAVES = parseInt(allCondMods[13])
    var MODIF_ATTACKS = parseInt(allCondMods[14])

    // TS.debug.log(MODIF_AC)

    document.getElementById('MODIF_STR').value = MODIF_STR;
    document.getElementById('MODIF_INT').value = MODIF_INT;
    document.getElementById('MODIF_WIS').value = MODIF_WIS;
    document.getElementById('MODIF_DEX').value = MODIF_DEX;
    document.getElementById('MODIF_CON').value = MODIF_CON;
    document.getElementById('MODIF_CHA').value = MODIF_CHA;
    document.getElementById('MODIF_PER').value = MODIF_PER;

    var class_skills = {'str': MODIF_STR, 'int': MODIF_INT, 'wis': MODIF_WIS, 'dex': MODIF_DEX, 'con': MODIF_CON, 'cha': MODIF_CHA}
    var MODIF_CLASS = class_skills[document.getElementById('class-skill').value]
    var MODIF_SPELL = class_skills[document.getElementById('spell-skill').value]

    document.getElementById('SaveFortitude').value = MODIF_FOR + MODIF_ALL_SAVES + BONCALC (MODIF_CON, saveFortBon, fortTrain, level, false);
    document.getElementById('SaveReflex').value = MODIF_RFX + MODIF_ALL_SAVES + BONCALC (MODIF_DEX, saveReflexBon, reflTrain, level, false);
    document.getElementById('SaveWill').value = MODIF_WIL + MODIF_ALL_SAVES + BONCALC (MODIF_WIS, saveWillBon, willTrain, level, false);

    document.getElementById('InitTot').value = MODIF_PER + BONCALC (MODIF_WIS, InitBon, initTrain, level, true); 

    // TS.debug.log(document.getElementById('InitTot').value)

    document.getElementById('AcrTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_DEX, AcrBon, acrTrain, level, true); 
    document.getElementById('ArcTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_INT, ArcBon, arcTrain, level, true); 
    document.getElementById('AthTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_STR, AthBon, athTrain, level, true); 
    document.getElementById('CraTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_INT, CraBon, craTrain, level, true); 
    document.getElementById('DecTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_CHA, DecBon, decTrain, level, true); 
    document.getElementById('DipTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_CHA, DipBon, dipTrain, level, true); 
    document.getElementById('IntimTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_CHA, IntimBon, intimTrain, level, true); 
    document.getElementById('MedTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_WIS, MedBon, medTrain, level, true); 

    document.getElementById('NatTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_WIS, NatBon, natTrain, level, true); 
    document.getElementById('OccTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_INT, OccBon, occTrain, level, true); 
    document.getElementById('PerfTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_CHA, PerfBon, perfTrain, level, true); 
    document.getElementById('RelTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_WIS, RelBon, relTrain, level, true); 
    document.getElementById('SocTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_INT, SocBon, socTrain, level, true); 
    document.getElementById('SteTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_DEX, SteBon, steTrain, level, true); 
    document.getElementById('SurTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_WIS, SurBon, surTrain, level, true); 
    document.getElementById('ThiTot').value = MODIF_ALL_SKILLS + BONCALC (MODIF_DEX, ThiBon, thiTrain, level, true); 

    document.getElementById('acTot').value = 10 + MODIF_AC + BONCALC(MODIF_DEX, acBon, acTrain, level, true);
    document.getElementById('classTot').value = 10 + BONCALC(MODIF_CLASS, classBon, classTrain, level, true);
    document.getElementById('spellTot').value = 10 + BONCALC(MODIF_SPELL, spellBon, spellTrain, level, true);
}
