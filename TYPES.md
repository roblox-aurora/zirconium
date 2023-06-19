# Zirconium Types

## `string`

```ts
string
```

## `number`

```ts
number
```

## `boolean`

```ts
true | false
```

## `array`
Creating the type:
```ts
let example = [1, 2, 3, 4];
```

Type access:
```ts
example[0]
example[array_index_variable]
```

## `function` (`ZrLuauFunction` | `ZrUserFunction`)

Creating a function in Zirconium

```ts
function func() {
	// body goes here
}
```

Creating a function in TypeScript:

```ts
const funcValue = new ZrLuauFunction((ctx, ...args) => {
	// Body goes here
});
```

Using functions

```rs
// command call syntax
func!
func arg1;
func arg1 arg2;

// function call syntax
func()
func(arg1)
func(arg1, arg2)
```

## `range` (`ZrRange`)
Creating the type:
```rs
x .. y
```
```sql
WHERE x IS number,
      y IS number
```

Fields:
-   `random` - Will give a random decimal number between the range
-   `random_int` - Will give a random integer number between the range
-   `min` - The range's min value
-   `max` - The range's max value


## `object` (`ZrObject`)
Creating the type:
```ts
let example = {
    value1: 10,
    value2: true,
    value3: "hi there"
}
```

Type access:
```ts
example.value1
example["value2"]
example[property_name_variable]
```

Fields:
- Dynamic

## `undefined` (`ZrUndefined`)
Equivalent to `undefined` in typescript, `nil` in Luau.

## `emum` (`ZrEnum`)
This is an implementation only construct. No current way to construct user enums in Zr.

