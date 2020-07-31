type Literal = string | number | boolean | undefined | null | void | defined;

declare const LAZY: unique symbol;
type Lazy<T> = T & { readonly [LAZY]: true; GetValue(): T; HasValue(): boolean };

declare function Lazy<T, A extends Array<Literal>>(fn: (...args: A) => T, ...args: A): Lazy<T>;

export = Lazy;
