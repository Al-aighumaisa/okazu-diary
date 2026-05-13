export type Branded<T, B extends symbol> = T & Record<B, unknown>;

export function brand<T, B extends symbol>(value: T, _brand: B): Branded<T, B> {
  return value as Branded<T, B>;
}
