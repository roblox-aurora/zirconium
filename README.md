<div align="center">
	<img src="https://assets.vorlias.com/i1/zirconium.png"/>
</div>
<div align="center">
	<h1>Zirconium</h1>
    	<a href="https://www.npmjs.com/package/@rbxts/zirconium">
		<img src="https://badge.fury.io/js/%40rbxts%2Fzirconium.svg"></img>
	</a>
</div>

# What Zirconium is
- Zirconium is a runtime scripting language for Roblox, for programmatic manipulation of Roblox games during runtime. Unlike other solutions this is not bound to any sort of command framework. It is inspired by Rust and TypeScript.
- The scripts can be as simple as user commands, to more complex scripting systems like quest triggers.
- Zirconium is sandboxed. You can only use functions that you explicitly provide. Each script runs in it's own environment.

## Supported
- [x] Variables
    ```ts
    let x = 10; // basic declaration
    const x = 10; // constant (can not reassign)
    ```
- [x] If/Else
    ```ts
    // Shorthand if
    if value: print "Hello, World!"

    // Longhand if
    if value { // brackets are optional
        print "Hello, World!"
    }

    // If else
    if value {
        print "Value is true!"
    } else {
        print "Value is false!"
    }
    ```
- [x] For-In Statement
    ```ts
    // Iterate array/object - like for _, value in pairs(myArray)
    for value in myArray {
        print $value
    }

    // Iterate range (Print numbers 1 to 10), like for i = 1, 10 do
    for value in 1..10 {
        print $value
    }
    ```

- [x] Functions (both Zr and Luau)
    ```ts
    // Command calls
    test! // no arguments, exclaimation is because otherwise it's evaluated as the variable itself
    print "Hello, World!" 42 true // arguments

    // Script calls
    test() //  no arguments
    print("Hello, World!", 42, true) // arguments

    // Declaring and using user functions
    function example() {
        print "Hello from example!"
    }

    example!
    ```

- [x] Arrays (including indexing)
    ```ts
    let exampleArray = [1, 2, 3];
    let emptyArray = [];
    let arrayWithMixed = [1, "Hello!", true];
    ```

- [x] Objects (including property access)
    ```ts
    let exampleObject = {
        aNumber: 10,
        aBoolean: true,
        aString: "Hi there!"
    }
    let emptyObject = {}
    ```


## Limitations
- Stack limit: 256. This is intentionally small as _you shouldn't_ be doing anything that complex with this.