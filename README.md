Command Core
====================
A command library for Roblox, written in TypeScript, which uses [cmd-ast](https://github.com/roblox-aurora/cmd-ast) for parsing/interpreting commands.

The purpose of this specific library is to provide a framework for commands, which you can extend through player chat or your own custom command console.

## Goals
- Allow declaration of commands, for server and for client
- Allow user type handling as well as primitives.
- Allow user-based permission restrictions on commands
- Allow the ability to "suggest" input (intellisense-esque)
- Plus anything else I think of later down the line...

## Non-goals
- Becoming a fully-fledged command console like [cmdr](https://github.com/evaera/cmdr). This is just a core framework for a command system. You can create a console to use this. (I may also create a full package that uses this framework too later down the line!)

# Used by Core
- [Command AST](https://github.com/roblox-aurora/cmd-ast) for Parsing/interpreting commands
- [Net](https://github.com/roblox-aurora/rbx-net) for Server/Client networking.