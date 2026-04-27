"use strict";
/**
 * Provides several arithmetic operations (mainly in a circle group) which are
 * called only internally.
 *
 * Note that no functions take `multiple laps' into consideration: i.e. the arc
 * length of the interval [-2pi, 2pi] is not 4pi but 0.
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.multMatrixMatrix = exports.multMatrixVector = exports.circularDelta = exports.circularLerp = exports.polarToCartesian = exports.cartesianToPolar = exports.clamp = exports.mod = exports.TWO_PI = void 0;
exports.TWO_PI = Math.PI * 2;
var mod = function (dividend, divisor) {
    var x = dividend % divisor;
    if (x >= 0) {
        return x;
    }
    else {
        return x + divisor;
    }
};
exports.mod = mod;
var clamp = function (x, min, max) {
    return Math.min(Math.max(x, min), max);
};
exports.clamp = clamp;
var cartesianToPolar = function (x, y, perimeter) {
    if (perimeter === void 0) { perimeter = exports.TWO_PI; }
    var factor = perimeter / exports.TWO_PI;
    return [Math.sqrt(x * x + y * y), (0, exports.mod)(Math.atan2(y, x) * factor, perimeter)];
};
exports.cartesianToPolar = cartesianToPolar;
var polarToCartesian = function (r, theta, perimeter) {
    if (perimeter === void 0) { perimeter = exports.TWO_PI; }
    var factor = exports.TWO_PI / perimeter;
    var hueRad = theta * factor;
    return [r * Math.cos(hueRad), r * Math.sin(hueRad)];
};
exports.polarToCartesian = polarToCartesian;
/**
 * Is a counterclockwise linear interpolation from theta1 to theta2 in a
 * circle group. It is guaranteed that the returned value is within the
 * given interval if amount is in [0, 1].
 * @param amount - should be in [0, 1]
 * @param theta1
 * @param theta2
 * @param [perimeter]
 */
var circularLerp = function (amount, theta1, theta2, perimeter) {
    if (perimeter === void 0) { perimeter = exports.TWO_PI; }
    var theta1Mod = (0, exports.mod)(theta1, perimeter);
    var theta2Mod = (0, exports.mod)(theta2, perimeter);
    if (amount === 1)
        return theta2Mod; // special treatment to decrease computational error
    var res = theta1Mod * (1 - amount) + (theta1Mod > theta2Mod ? theta2Mod + perimeter : theta2Mod) * amount;
    if (res >= perimeter) {
        return Math.min(res - perimeter, theta2Mod);
    }
    else {
        return res;
    }
};
exports.circularLerp = circularLerp;
/**
 * Returns the 'difference' of two values in a circle group. The returned value
 * Δ satisfies theta2 + Δ ≡ theta1 and -perimeter/2 <= Δ <= perimeter/2.
 * @param theta1
 * @param theta2
 * @param [perimter]
 */
var circularDelta = function (theta1, theta2, perimeter) {
    if (perimeter === void 0) { perimeter = exports.TWO_PI; }
    var d = (0, exports.mod)(theta1 - theta2, perimeter);
    if (d <= perimeter / 2) {
        return d;
    }
    else {
        return d - perimeter;
    }
};
exports.circularDelta = circularDelta;
// We need only the following two kinds of multiplication.
var multMatrixVector = function (A, x) {
    return [
        A[0][0] * x[0] + A[0][1] * x[1] + A[0][2] * x[2],
        A[1][0] * x[0] + A[1][1] * x[1] + A[1][2] * x[2],
        A[2][0] * x[0] + A[2][1] * x[1] + A[2][2] * x[2],
    ];
};
exports.multMatrixVector = multMatrixVector;
var multMatrixMatrix = function (A, B) {
    return [
        [
            A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
            A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
            A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
        ],
        [
            A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
            A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
            A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
        ],
        [
            A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
            A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
            A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
        ],
    ];
};
exports.multMatrixMatrix = multMatrixMatrix;
//# sourceMappingURL=arithmetic.js.map