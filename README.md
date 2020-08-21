Command Core
====================
Bash-like command framework for Roblox, written in TypeScript, which uses [cmd-ast](https://github.com/roblox-aurora/cmd-ast) for parsing commands.

The purpose of this specific framework is to provide a framework for adding programmatic command capabilities to your games, which you can extend through player chat or your own custom command console.

## Fixed commands
```ts
const KillCommand = Command.create({
    command: "kill",
    args: [{type: "player"}] as const,
    options: {
        withExplosion: {type: "switch"},
    },
    execute: (ctx, {Arguments, Options}) => {
        const [player] = Arguments; // player: Player | undefined
        const {withExplosion} = Options;
		if (withExplosion) {
			const explode = new Instance("Explosion");
			explode.Position = player.Character?.GetPrimaryPartCFrame().Position ?? new Vector3();
			explode.Parent = game.Workspace;
		} else {
			player.Character?.BreakJoints();
		}
    }
})
CmdServer.Registry.RegisterCommand(KillCommand);
```

then
```bash
kill vorlias # any more than 'vorlias' will be an error.
kill --with-explosion vorlias # sets 'withExplosion' to true
```

## Variadic Commands

```ts
// basic print command, for example
const PrintCommand = Command.create({
    command: "print",
    args: [{type: ["string", "number", "boolean"], variadic: true}] as const, // ...(string | number | boolean)[]
    options: {},
    execute: (ctx, { Arguments }) => {
        const message = Arguments.filterUndefined().join(" ");
        ctx.PushOutput(message);
    }
});
CmdServer.Registry.RegisterCommand(PrintCommand);
```

Then

```bash
print "Hello, World!" 10 true
```
will work.

## Differences to other solutions
- Uses AST for parsing
- Commands can be executed sequentially and/or results of commands can be piped to other commands. More akin to writing a script for your game.
- Option capabilities (e.g. `my-cmd --thing xyz`)
- Variable usage - e.g. `my-cmd $value` and string interpolation with `my-cmd "A value is: $value"`

## Goals
- Allow declaration of commands, for server and for client
- Allow commands to have child commands
- Allow option and argument type parsing/transforming
- Allow user-based permission restrictions on commands
- Allow the ability to "suggest" input (intellisense-esque)
- Plus anything else I think of later down the line...

## Possible future goals
- Allow more complex constructs like loops, variable declarations etc.

## Non-goals
- Becoming a fully-fledged command console package like [cmdr](https://github.com/evaera/cmdr). This is just a core framework.

# Used by Core
- [Command AST](https://github.com/roblox-aurora/cmd-ast) for parsing commands.
- [Net](https://github.com/roblox-aurora/rbx-net) for Server/Client networking.
