"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToMunsell = exports.hexToMhvc = exports.rgb255ToMunsell = exports.rgb255ToMhvc = exports.rgbToMunsell = exports.rgbToMhvc = exports.linearRgbToMunsell = exports.linearRgbToMhvc = exports.xyzToMunsell = exports.xyzToMhvc = exports.labToMunsell = exports.labToMhvc = exports.lchabToMunsell = exports.lchabToMhvc = exports.lToMunsellValue = exports.yToMunsellValue = void 0;
var arithmetic_1 = require("./arithmetic");
var y_to_value_table_1 = require("./y-to-value-table");
var colorspace_1 = require("./colorspace");
var convert_1 = require("./convert");
/**
 * Converts Y of XYZ to Munsell value. The round-trip error, `abs(Y -
 * munsellValueToY(yToMunsellValue(Y))`, is guaranteed to be smaller than 1e-5 if
 * Y is in [0, 1].
 * @param Y - will be in [0, 1]. Clamped if it exceeds the interval.
 * @returns {number} Munsell value
 */
var yToMunsellValue = function (Y) {
    var y2000 = (0, arithmetic_1.clamp)(Y, 0, 1) * 2000;
    var yFloor = Math.floor(y2000);
    var yCeil = Math.ceil(y2000);
    if (yFloor === yCeil) {
        return y_to_value_table_1.yToMunsellValueTable[yFloor];
    }
    else {
        return ((yCeil - y2000) * y_to_value_table_1.yToMunsellValueTable[yFloor] +
            (y2000 - yFloor) * y_to_value_table_1.yToMunsellValueTable[yCeil]);
    }
};
exports.yToMunsellValue = yToMunsellValue;
/**
 * Converts L* of CIELAB to Munsell value. The round-trip error, `abs(L* -
 * munsellValueToL(lToMunsellValue(L*))`, is guaranteed to be smaller than 1e-3
 * if L* is in [0, 100].
 * @param lstar - will be in [0, 100]. Clamped if it exceeds the
 * interval.
 * @returns {number} Munsell value
 */
var lToMunsellValue = function (lstar) {
    return (0, exports.yToMunsellValue)((0, colorspace_1.lToY)(lstar));
};
exports.lToMunsellValue = lToMunsellValue;
var invertMhvcToLchab = function (lstar, cstarab, hab, initHue100, initChroma, threshold, maxIteration, ifReachMax, factor) {
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    var value = (0, exports.lToMunsellValue)(lstar);
    if (value <= threshold || initChroma <= threshold) {
        return [initHue100, value, initChroma];
    }
    var hue100 = initHue100;
    var chroma = initChroma;
    for (var i = 0; i < maxIteration; i++) {
        var _a = (0, convert_1.mhvcToLchab)(hue100, value, chroma), tmp_cstarab = _a[1], tmp_hab = _a[2];
        var d_cstarab = cstarab - tmp_cstarab;
        var d_hab = (0, arithmetic_1.circularDelta)(hab, tmp_hab, 360);
        var d_hue100 = d_hab * 0.277777777778; // 100/360
        var d_chroma = d_cstarab * 0.181818181818; // 1/5.5
        if (Math.abs(d_hue100) <= threshold && Math.abs(d_chroma) <= threshold) {
            return [(0, arithmetic_1.mod)(hue100, 100), value, chroma];
        }
        else {
            hue100 += factor * d_hue100;
            chroma = Math.max(0, chroma + factor * d_chroma);
        }
    }
    // If the loop has finished without achieving the required accuracy:
    switch (ifReachMax) {
        case 'error':
            throw new Error('invertMhvcToLchab() reached maxIteration without achieving the required accuracy.');
        case 'init':
            return [initHue100, value, initChroma];
        case 'last':
            return [hue100, value, chroma];
        default:
            throw new SyntaxError("Unknown ifReachMax specifier: ".concat(ifReachMax));
    }
};
/**
 * Converts LCHab to Munsell HVC by inverting {@link mhvcToLchab}() with a
 * simple iteration algorithm, which is almost the same as the one in "An
 * Open-Source Inversion Algorithm for the Munsell Renotation" by Paul Centore,
 * 2011:

 * - V := {@link lToMunsellValue}(L*);
 * - C<sub>0</sub> := C*<sub>ab</sub> / 5.5;
 * - H<sub>0</sub> := h<sub>ab</sub> * 100/360;
 * - C<sub>n+1</sub> := C<sub>n</sub> + factor * ΔC<sub>n</sub>;
 * - H<sub>n+1</sub> :=  H<sub>n</sub> + factor * ΔH<sub>n</sub>.

 * ΔH<sub>n</sub> and ΔC<sub>n</sub> are internally calculated at every
 * step. This function returns Munsell HVC values if C<sub>0</sub> ≦ threshold
 * or if V ≦ threshold or when max(ΔH<sub>n</sub>, ΔC<sub>n</sub>) falls
 * below threshold.

 * Note that the given values are assumed to be under **Illuminant C**.
 * I don't recommend you use this function if you are not sure what that means.
 * @param lstar
 * @param cstarab
 * @param hab
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 */
var lchabToMhvc = function (lstar, cstarab, hab, threshold, maxIteration, ifReachMax, factor) {
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return invertMhvcToLchab(lstar, cstarab, hab, hab * 0.277777777778, cstarab * 0.181818181818, threshold, maxIteration, ifReachMax, factor);
};
exports.lchabToMhvc = lchabToMhvc;
/**
 * Converts LCHab to Munsell string. Note that the given values are assumed to
 * be under **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param lstar
 * @param cstarab
 * @param hab
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var lchabToMunsell = function (lstar, cstarab, hab, digits, threshold, maxIteration, ifReachMax, factor) {
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.lchabToMhvc)(lstar, cstarab, hab, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.lchabToMunsell = lchabToMunsell;
/**
 * Converts CIELAB to Munsell HVC. Note that the given values are assumed to be
 * under **Illuminant C**. I don't recommend you use this function if you
 * are not sure what that means.
 * @param lstar
 * @param astar
 * @param bstar
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var labToMhvc = function (lstar, astar, bstar, threshold, maxIteration, ifReachMax, factor) {
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.lchabToMhvc.apply(void 0, __spreadArray(__spreadArray([], (0, colorspace_1.labToLchab)(lstar, astar, bstar), false), [threshold,
        maxIteration,
        ifReachMax,
        factor], false));
};
exports.labToMhvc = labToMhvc;
/**
 * Converts CIELAB to Munsell Color string. Note that the given values are assumed to
 * be under **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param lstar
 * @param astar
 * @param bstar
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var labToMunsell = function (lstar, astar, bstar, digits, threshold, maxIteration, ifReachMax, factor) {
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.labToMhvc)(lstar, astar, bstar, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.labToMunsell = labToMunsell;
/**
 * Converts XYZ to Munsell HVC, where Bradford transformation is used as CAT.
 * @param X
 * @param Y
 * @param Z
 * @param [illuminant]
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var xyzToMhvc = function (X, Y, Z, illuminant, threshold, maxIteration, ifReachMax, factor) {
    if (illuminant === void 0) { illuminant = colorspace_1.ILLUMINANT_D65; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.labToMhvc.apply(void 0, __spreadArray(__spreadArray([], colorspace_1.xyzToLab.apply(void 0, __spreadArray(__spreadArray([], (0, arithmetic_1.multMatrixVector)(illuminant.catMatrixThisToC, [X, Y, Z]), false), [colorspace_1.ILLUMINANT_C], false)), false), [threshold,
        maxIteration,
        ifReachMax,
        factor], false));
};
exports.xyzToMhvc = xyzToMhvc;
/**
 * Converts XYZ to Munsell Color string, where the Bradford transformation is used
 * as CAT.
 * @param X
 * @param Y
 * @param Z
 * @param [illuminant]
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var xyzToMunsell = function (X, Y, Z, illuminant, digits, threshold, maxIteration, ifReachMax, factor) {
    if (illuminant === void 0) { illuminant = colorspace_1.ILLUMINANT_D65; }
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.xyzToMhvc)(X, Y, Z, illuminant, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.xyzToMunsell = xyzToMunsell;
/**
 * Converts linear RGB to Munsell HVC.
 * @param lr - will be in [0, 1] though any real number is accepted and
 * properly processed as an out-of-gamut color.
 * @param lg - ditto.
 * @param lb - ditto.
 * @param [rgbSpace]
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var linearRgbToMhvc = function (lr, lg, lb, rgbSpace, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.xyzToMhvc.apply(void 0, __spreadArray(__spreadArray([], (0, colorspace_1.linearRgbToXyz)(lr, lg, lb, rgbSpace), false), [rgbSpace.illuminant,
        threshold,
        maxIteration,
        ifReachMax,
        factor], false));
};
exports.linearRgbToMhvc = linearRgbToMhvc;
/**
 * Converts linear RGB to Munsell Color string.
 * @param lr - will be in [0, 1] though any real number is accepted and
 * properly processed as an out-of-gamut color.
 * @param lg - ditto.
 * @param lb - ditto.
 * @param [rgbSpace]
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var linearRgbToMunsell = function (lr, lg, lb, rgbSpace, digits, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.linearRgbToMhvc)(lr, lg, lb, rgbSpace, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.linearRgbToMunsell = linearRgbToMunsell;
/**
 * Converts gamma-corrected RGB to Munsell HVC.
 * @param r - will be in [0, 1] though any real number is accepted and
 * properly processed as an out-of-gamut color.
 * @param g - ditto.
 * @param b - ditto.
 * @param [rgbSpace]
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var rgbToMhvc = function (r, g, b, rgbSpace, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.linearRgbToMhvc.apply(void 0, __spreadArray(__spreadArray([], (0, colorspace_1.rgbToLinearRgb)(r, g, b, rgbSpace), false), [rgbSpace,
        threshold,
        maxIteration,
        ifReachMax,
        factor], false));
};
exports.rgbToMhvc = rgbToMhvc;
/**
 * Converts gamma-corrected RGB to Munsell Color string.
 * @param r - will be in [0, 1] though any real number is accepted and
 * properly processed as an out-of-gamut color.
 * @param g - ditto.
 * @param b - ditto.
 * @param [rgbSpace]
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var rgbToMunsell = function (r, g, b, rgbSpace, digits, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.rgbToMhvc)(r, g, b, rgbSpace, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.rgbToMunsell = rgbToMunsell;
/**
 * Converts quantized RGB to Munsell HVC. Whether this conversion succeeds or
 * not depends on the parameters though the following behavior is guaranteed
 * and tested on Node.js:

 * If `r255`, `g255`, and `b255` are in {0, 1, ..., 255} and the optional
 * parameters have default values,

 * 1. `rgb255ToMhvc()` successfully returns Munsell HVC before maxIteration
 * 2. and the round-trip is invariant, i.e. {@link mhvcToRgb255}(rgb255ToMhvc(r255, g255, b255))
 * returns `[r255, g255, b255]`.

 * @param r255 - will be in {0, 1, ..., 255} though any integer is
 * accepted and properly processed as an out-of-gamut color.
 * @param g255 - ditto.
 * @param b255 - ditto.
 * @param [rgbSpace]
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var rgb255ToMhvc = function (r255, g255, b255, rgbSpace, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.rgbToMhvc.apply(void 0, __spreadArray(__spreadArray([], (0, colorspace_1.rgb255ToRgb)(r255, g255, b255), false), [rgbSpace,
        threshold,
        maxIteration,
        ifReachMax,
        factor], false));
};
exports.rgb255ToMhvc = rgb255ToMhvc;
/**
 * Converts quantized RGB to Munsell Color string. Whether this conversion
 * succeeds or not depends on the parameters though the following behaviour is
 * guaranteed and tested on Node.js:

 * If `r255`, `g255`, `b255` are in {0, 1, ..., 255} and the optional
 * parameters except `digits` have defaultvalues, `rgb255ToMunsell()` successfully
 * returns a Munsell Color string before `maxIteration`.

 * @param r255 - will be in {0, 1, ..., 255} though any integer is
 * accepted and properly processed as an out-of-gamut color.
 * @param g255 - ditto.
 * @param b255 - ditto.
 * @param [rgbSpace]
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var rgb255ToMunsell = function (r255, g255, b255, rgbSpace, digits, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.rgb255ToMhvc)(r255, g255, b255, rgbSpace, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.rgb255ToMunsell = rgb255ToMunsell;
/**
 * Converts hex color to Munsell HVC. Whether this conversion succeeds or
 * not depends on the parameters though the following behaviour is guaranteed
 * and tested on Node.js:

 * If the optional parameters have default values,

 * 1. `hexToMhvc()` successfully returns Munsell HVC before `maxIteration`
 * 2. and the round-trip is invariant for 24-bit hex colors, i.e.
 * {@link mhvcToHex}(hexToMhvc(hex)) returns the same hex color.

 * @param hex - may be 24-bit RGB (#XXXXXX), 12-bit RGB (#XXX), 32-bit
 * RGBA, (#XXXXXXXX), or 16-bit RGBA (#XXXX). Alpha channel is ignored.
 * @param [rgbSpace]
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {Array} [Hue, Value, Chroma]
 * @see {@link lchabToMhvc}
 */
var hexToMhvc = function (hex, rgbSpace, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return exports.rgbToMhvc.apply(void 0, __spreadArray(__spreadArray([], (0, colorspace_1.hexToRgb)(hex), false), [rgbSpace, threshold, maxIteration, ifReachMax, factor], false));
};
exports.hexToMhvc = hexToMhvc;
/**
 * Converts hex color to Munsell Color string. Whether this conversion
 * succeeds or not depends on the parameters though the following behavior is
 * guaranteed and tested on Node.js:

 * If the optional parameters except `digits` have default values,
 * `hexToMunsell()` successfully returns a Munsell Color string before `maxIteration`.

 * @param hex - may be 24-bit RGB (#XXXXXX), 12-bit RGB (#XXX), 32-bit
 * RGBA, (#XXXXXXXX), or 16-bit RGBA (#XXXX). Alpha channel is ignored.
 * @param [rgbSpace]
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @param [threshold]
 * @param [maxIteration]
 * @param [ifReachMax]
 * @param [factor]
 * @returns {string} Munsell Color code
 * @see {@link lchabToMhvc}
 */
var hexToMunsell = function (hex, rgbSpace, digits, threshold, maxIteration, ifReachMax, factor) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    if (digits === void 0) { digits = 1; }
    if (threshold === void 0) { threshold = 1e-6; }
    if (maxIteration === void 0) { maxIteration = 200; }
    if (ifReachMax === void 0) { ifReachMax = 'error'; }
    if (factor === void 0) { factor = 0.5; }
    return convert_1.mhvcToMunsell.apply(void 0, __spreadArray(__spreadArray([], (0, exports.hexToMhvc)(hex, rgbSpace, threshold, maxIteration, ifReachMax, factor), false), [digits], false));
};
exports.hexToMunsell = hexToMunsell;
//# sourceMappingURL=invert.js.map