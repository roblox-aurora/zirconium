export function isArray<T = defined>(value: unknown): value is Array<T>;
export function isMap<T = defined>(value: unknown): value is Map<string, T>;
export function isAmbiguous<T>(value: unknown): value is Array<T> & Map<string, T>;
