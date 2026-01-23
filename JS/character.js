var clearStorageButton = undefined;
var level = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initSheet() {
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
    // TS.debug.log(input.id)
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
        } else {
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

    // TS.debug.log("Input ID: "+input.id)

    if (input.id == "abilities-text") {
        let actions = parseActions(input.value);
        addActions(actions);
    }

    if (input.id == "skills-text") {
        let skills = parseSkillsLores(input.value);
        TS.debug.log("Before adding skills");
        addSkillLore(skills);
        TS.debug.log("After adding skills");
        for (skill in skills['title']) {
            TS.debug.log(skill);
        }
    }

    if (input.id == "Hitdice-text") {
        let actionsNew = parseActions(input.value);
        addActionsNew(actionsNew);
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
        TS.debug.log("CreateDiceRoll input element: "+inputElement.value)
        if (inputElement.dataset.save == true || inputElement.value > 0) {
            TS.debug.log("ADD LEVEL")
            TS.debug.log("Training: "+parseInt(inputElement.value))
            TS.debug.log("Level: "+parseInt(level))
            TS.debug.log("Mod 1: "+inputElement.dataset.modifier)
            TS.debug.log("Mod 2: "+document.getElementById(inputElement.dataset.modifier))
            TS.debug.log("Mod Final: "+document.getElementById(inputElement.dataset.modifier).value)
            modifierString = "+" + (parseInt(inputElement.value) + parseInt(level) + parseInt(document.getElementById(inputElement.dataset.modifier).value));
            TS.debug.log("Mod string: "+modifierString);

        }
        // Otherwise, don't add level
        else {
            TS.debug.log("NO LEVEL")
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

        TS.debug.log("Description")
        let newDesc = newCondition.querySelector("p");
        newDesc.id = 'condition-desc-'+condition;
        newDesc.textContent = conditionDescriptions[condition];

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
    
    return BONUS
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
    
    var InitBon = document.getElementById('InitBon').value ;
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

    document.getElementById('MODIF_STR').value =  CALCULMODIF(baseStr, exhaustionmod);
    document.getElementById('MODIF_INT').value =  CALCULMODIF(baseInt, exhaustionmod);
    document.getElementById('MODIF_WIS').value =  CALCULMODIF(baseWis, exhaustionmod);
    document.getElementById('MODIF_DEX').value =  CALCULMODIF(baseDex, exhaustionmod);
    document.getElementById('MODIF_CON').value =  CALCULMODIF(baseCon, exhaustionmod);
    document.getElementById('MODIF_CHA').value =  CALCULMODIF(baseCha, exhaustionmod);
   
    var MODIF_STR = document.getElementById('MODIF_STR').value;
    var MODIF_INT = document.getElementById('MODIF_INT').value;
    var MODIF_WIS = document.getElementById('MODIF_WIS').value;
    var MODIF_DEX = document.getElementById('MODIF_DEX').value;
    var MODIF_CON = document.getElementById('MODIF_CON').value;
    var MODIF_CHA = document.getElementById('MODIF_CHA').value;

    var class_skills = {'str': MODIF_STR, 'int': MODIF_INT, 'wis': MODIF_WIS, 'dex': MODIF_DEX, 'con': MODIF_CON, 'cha': MODIF_CHA}
    var MODIF_CLASS = class_skills[document.getElementById('class-skill').value]
    var MODIF_SPELL = class_skills[document.getElementById('spell-skill').value]

    document.getElementById('SaveFortitude').value = BONCALC (MODIF_CON, saveFortBon, fortTrain, level, false);
    document.getElementById('SaveReflex').value = BONCALC (MODIF_DEX, saveReflexBon, reflTrain, level, false);
    document.getElementById('SaveWill').value = BONCALC (MODIF_WIS, saveWillBon, willTrain, level, false);

    document.getElementById('InitTot').value = BONCALC (MODIF_WIS, InitBon, initTrain, level, true); 

    document.getElementById('AcrTot').value = BONCALC (MODIF_DEX, AcrBon, acrTrain, level, true); 
    document.getElementById('ArcTot').value = BONCALC (MODIF_INT, ArcBon, arcTrain, level, true); 
    document.getElementById('AthTot').value = BONCALC (MODIF_STR, AthBon, athTrain, level, true); 
    document.getElementById('CraTot').value = BONCALC (MODIF_INT, CraBon, craTrain, level, true); 
    document.getElementById('DecTot').value = BONCALC (MODIF_CHA, DecBon, decTrain, level, true); 
    document.getElementById('DipTot').value = BONCALC (MODIF_CHA, DipBon, dipTrain, level, true); 
    document.getElementById('IntimTot').value = BONCALC (MODIF_CHA, IntimBon, intimTrain, level, true); 
    document.getElementById('MedTot').value = BONCALC (MODIF_WIS, MedBon, medTrain, level, true); 

    document.getElementById('NatTot').value = BONCALC (MODIF_WIS, NatBon, natTrain, level, true); 
    document.getElementById('OccTot').value = BONCALC (MODIF_INT, OccBon, occTrain, level, true); 
    document.getElementById('PerfTot').value = BONCALC (MODIF_CHA, PerfBon, perfTrain, level, true); 
    document.getElementById('RelTot').value = BONCALC (MODIF_WIS, RelBon, relTrain, level, true); 
    document.getElementById('SocTot').value = BONCALC (MODIF_INT, SocBon, socTrain, level, true); 
    document.getElementById('SteTot').value = BONCALC (MODIF_DEX, SteBon, steTrain, level, true); 
    document.getElementById('SurTot').value = BONCALC (MODIF_WIS, SurBon, surTrain, level, true); 
    document.getElementById('ThiTot').value = BONCALC (MODIF_DEX, ThiBon, thiTrain, level, true); 

    document.getElementById('acTot').value = 10 + BONCALC(MODIF_DEX, acBon, acTrain, level, true);
    document.getElementById('classTot').value = 10 + BONCALC(MODIF_CLASS, classBon, classTrain, level, true);
    document.getElementById('spellTot').value = 10 + BONCALC(MODIF_SPELL, spellBon, spellTrain, level, true);
}
