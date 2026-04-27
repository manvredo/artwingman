/**
 * Provides several arithmetic operations (mainly in a circle group) which are
 * called only internally.
 *
 * Note that no functions take `multiple laps' into consideration: i.e. the arc
 * length of the interval [-2pi, 2pi] is not 4pi but 0.
 * @module
 */
export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Matrix33 = [Vector3, Vector3, Vector3];
export declare const TWO_PI: number;
export declare const mod: (dividend: number, divisor: number) => number;
export declare const clamp: (x: number, min: number, max: number) => number;
export declare const cartesianToPolar: (x: number, y: number, perimeter?: number) => Vector2;
export declare const polarToCartesian: (r: number, theta: number, perimeter?: number) => Vector2;
/**
 * Is a counterclockwise linear interpolation from theta1 to theta2 in a
 * circle group. It is guaranteed that the returned value is within the
 * given interval if amount is in [0, 1].
 * @param amount - should be in [0, 1]
 * @param theta1
 * @param theta2
 * @param [perimeter]
 */
export declare const circularLerp: (amount: number, theta1: number, theta2: number, perimeter?: number) => number;
/**
 * Returns the 'difference' of two values in a circle group. The returned value
 * Δ satisfies theta2 + Δ ≡ theta1 and -perimeter/2 <= Δ <= perimeter/2.
 * @param theta1
 * @param theta2
 * @param [perimter]
 */
export declare const circularDelta: (theta1: number, theta2: number, perimeter?: number) => number;
export declare const multMatrixVector: (A: Matrix33, x: Vector3) => Vector3;
export declare const multMatrixMatrix: (A: Matrix33, B: Matrix33) => Matrix33;
//# sourceMappingURL=arithmetic.d.ts.map