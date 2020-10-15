<div align="center">
	<img src="https://assets.vorlias.com/i1/zirconium.png"/>
</div>
<div align="center">
	<h1>Zirconium</h1>
    	<a href="https://www.npmjs.com/package/@rbxts/zirconium">
		<img src="https://badge.fury.io/js/%40rbxts%2Fzirconium.svg"></img>
	</a>
</div>

### _Note: Currently Beta: This means the API is not finalized and may change._



## What Zirconium is
- Zirconium is a runtime scripting language for Roblox, for programmatic manipulation of Roblox games during runtime. Unlike other solutions this is not bound to any sort of command framework.
- The scripts can be as simple as user commands, to more complex scripting systems like quest triggers.
- Zirconium is sandboxed. You can only use functions that you explicitly provide. Each script runs in it's own environment.

## Supported
- [x] Variables
- [x] If/Else
- [x] For-In Statement
- [x] Functions (both Zr and Luau)
- [x] Arrays (including indexing)
- [x] Objects (including property access)


## Limitations
- Stack limit: 256. This is intentionally small as _you shouldn't_ be doing anything that complex with this.


<!-- ```bash
# Zirconium alpha, [aka cmd-core]
player --set-level 5
player equip --slot 'Chest' 25
player equip --slot 'Legs' 22
player equip --slot 'Shoulders' 21
player equip --slot 'Hands' 24
player equip --slot 'Feet' 23
player stats
```

and as you can see, while it worked it was very tedious and 

Zirconium - The beta (target)
```bash
# Zirconium Beta
$toEquip = {
    Chest: 25,
    Legs: 22,
    Shoulders: 21,
    Hands: 24,
    Feet: 23
} # This is an object, one of the many new structures in Zr.

player.setLevel 5 # implicit call
player.equip $toEquip
print(player.stats(), prettyPrint: true) # "Explicit call", since we want the result of player.stats printed
``` -->