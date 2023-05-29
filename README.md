<div align="center">
	<img src="https://i.imgur.com/pPwm8wc.png"/>
</div>
<div align="center">
	<h1>Zirconium v2</h1>
    <p>Roblox-based Runtime Scripting Language</p>
    <a href="https://www.npmjs.com/package/@rbxts/zirconium">
		<img src="https://badge.fury.io/js/%40rbxts%2Fzirconium.svg"></img>
	</a>
</div>

# What Zirconium is
- Zirconium is a runtime scripting language for Roblox, for programmatic manipulation of Roblox games during runtime. Unlike other solutions this is not bound to any sort of command framework. It is inspired by Rust and TypeScript.
- The scripts can be as simple as user commands, to more complex scripting systems like quest triggers.
- Zirconium is sandboxed. You can only use functions that you explicitly provide. Each script runs in it's own environment.

## Why
- In cases where you want to run code dynamically (such as through a debug console) to affect a currently running game, a typical situation like Luau would not really work (`loadstring` is extremely risky to enable and doesn't work on the client)
- A scripting language was required for the [Zircon](https://github.com/roblox-aurora/zircon) console, written originally for Zenerith that's now open source. It was required that you could powerfully script during a running game to execute code, while still being quite sandboxed. Simple command frameworks such as `Cmdr` weren't viable.

## Supported
- [x] Variables
    ```ts
    let x = 10; // basic declaration
    const x = 10; // constant (can not reassign)
    ```
- [x] If/Else
    ```ts
    // Shorthand if
    if value: print "Hello, World!";

    // Longhand if
    if value { // brackets are optional
        print "Hello, World!";
    }

    // If else
    if value {
        print "Value is true!";
    } else {
        print "Value is false!";
    }
    ```
- [x] For-In Statement
    ```ts
    // Iterate array/object - like for _, value in pairs(myArray)
    for value in myArray {
        print $value;
    }

    // Iterate range (Print numbers 1 to 10), like for i = 1, 10 do
    for value in 1..10 {
        print $value;
    }
    ```

- [x] Functions (both Zr and Luau)
    ```ts
    // Command calls
    test! // no arguments, exclaimation is because otherwise it's evaluated as the variable itself
    print "Hello, World!" 42 true; // arguments
    print $[10, 20, 30] ${a: 10} 1..10 $variable; // inline objects
    // NOTE: When using command call syntax, semicolon is required for any statements following the call

    // Script calls
    test() //  no arguments
    print("Hello, World!", 42, true) // arguments

    // Declaring and using user functions
    function example() {
        print "Hello from example!"
        return "Example return!"
    }

    print(example!) // will print 'Example return!'
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
