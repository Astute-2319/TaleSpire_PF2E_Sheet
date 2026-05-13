This character sheet is based on the generic character sheet provided by BouncyRock, and is intended to be used for PF2E characters.

# How to install

0. Ensure Symbiotes are enabled in your TaleSpire game client
1. Download all files here as a ZIP
2. Unzip contents into the Symbiotes folder of your TaleSpire AppData location. Example path: `C:\Users\USER\AppData\LocalLow\BouncyRock Entertainment\TaleSpire\Symbiotes\My PF2E Character Sheet`
3. Launch TaleSpire, and you should find the Symbiote available in the client.

# Features

Currently implemented
- Track and store data per campaign
- Any time a change is made, data is stored in campaign-wide local storage
- User can submit dice rolls based on calculated modifiers and share the results in the game chat
- User can select proficiency/training modifiers from dropdown menus as needed to add the appropriate modifiers to their stats/skills.
- Automatically calculate modifier values based on stats and proficiency/training
- Automatically calculate base values for AC, Class DC, and Spell DC
- Users can manually increase values as needed to represent item bonuses, temporary bonuses, etc
- User can add custom skills/lores, and dice rolls are automated for these
  - Known Bug: Modifier does not show in the generated number field. The dice roll still seems to be calculating correctly. Low priority fix right now since the dice rolling works and the modifier can be viewed that way.
- Conditions and their effects on stats
- User can input weapons into a submission form in the character page and it will add a weapon to the page.
  - Weapon traits are not included with this submission, as implementing their effects is going to be a large undertaking. Will likely tackle this later in the future.
  - The current implementation seems a tad buggy at times, but closing and reopening the sheet tends to solve issues. In order to make weapons populate on the sheet, and change needs to be made in the text box provided, such as simply appending a space on the end of a line.
- Exhaustion level can be set to subtract values from stats
  - This is mainly here to serve as an example of how I want to implement conditions later.
- Free text sections for notes, languages known, inventory, etc.

Planned:
- Button that resets all user-implemented bonus changes to reset modifiers and values without clearing the sheet
- Auto calculate max HP for a character
- Fully implement weapon attack rolls and damage
  - Namely, weapon traits option and their effects on rolls. That was a beast I did not want to tackle right now.
- Separate page for character spells that users can save spell information to, and automates spell attack rolls as needed.
- Rolling for initative adds the player's associated mini to the initative order in the correct position.
  - This feature will be reliant on further development of API calls from BouncyRock. May not happen.
- Auto calculate modifiers on sheet open. Currently it only calculates when a change is made.

## Abilities entry

The "Abilities, Skills, Weapons" section is meant to be filled with anything that can be used as a combat action, be it an ability, a spell, a weapon attack, etc
This can be done in any way that is most comfortable for you to use, however, if you follow the pattern of:
"Name DiceRoll \[Optional Description\]" for each line in the text field each line will be extracted from the text field and shown as an extra UI element with a "roll damage" button using the entered dice roll.
For example if your character has a Rapier and a Dagger to attack with, you can enter:

```
Rapier 1d8+2
Dagger 1d6+2 Can be thrown
```

and both lines will be parsed from the text field to be displayed separately as well.

# How to Use

Fill in character information, base stats (STR, INT, WIS, DEX, CON, CHA), class skill, spell skill, any skill proficiencies, etc. Fields should auto-populate as associated data is entered. All data is saved to the campaign's local storage on any change to the sheet. 

Modifiers and such are only calculated whenever a change is made to the sheet. To work around this, there is a recalculate checkbox element at the top of the sheet. Functionally it does nothing, but it registers as a change to the sheet so it will update all modifiers and save the current data on press.

<!-- # Adapting for other systems

The generic character sheet base code is made to be fairly customizable, making it easy to adapt minor things in the sheet. Adding extra fields can be done by simply copying existing ones and renaming them. All input fields need to have a unique ID to be stored and conversely, as soon as they have an ID (and are either an HTML `<input>`, `<button>` or `<textarea>`), they will be stored and reloaded.
You can make the `field-title` label clickable for rolling by adding the HTML attribute `data-dice-type` and adding the dice that should be rolled. By default, clicking will add the accompanying input elements' value as an additive modifier (ie: If the input field has a value set of 3 and the dice type is 1d20, it will create a 1d20+3 roll). If no modifier is desired, add the attribute `data-modifier="no-mod"`, if you want to have a different input field as the modifier, like for an attack roll button that depends on eg: the Strength value set elsewhere, set the `data-modifier` value to the id of the input field you want to get the value from, eg: `data-modifier="str"`.

The description (`field-desc`) label is simply for readability/understandability and can be omitted if deemed unnecessary. -->
