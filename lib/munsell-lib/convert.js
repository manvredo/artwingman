"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.mhvcToMunsell = exports.munsellToHex = exports.mhvcToHex = exports.munsellToRgb255 = exports.mhvcToRgb255 = exports.munsellToRgb = exports.mhvcToRgb = exports.munsellToLinearRgb = exports.mhvcToLinearRgb = exports.munsellToXyz = exports.mhvcToXyz = exports.munsellToLab = exports.mhvcToLab = exports.munsellToLchab = exports.munsellToMhvc = exports.mhvcToLchab = exports.munsellValueToL = exports.munsellValueToY = void 0;
var MRD = __importStar(require("./MRD"));
var colorspace_1 = require("./colorspace");
var arithmetic_1 = require("./arithmetic");
/**
 * Converts Munsell value to Y (of XYZ) based on the formula in the ASTM
 * D1535-18e1.
 * @param v - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @returns {number} Y
 */
var munsellValueToY = function (v) {
    return v * (1.1914 + v * (-0.22533 + v * (0.23352 + v * (-0.020484 + v * 0.00081939)))) * 0.01;
};
exports.munsellValueToY = munsellValueToY;
/**
 * Converts Munsell value to L* (of CIELAB).
 * @param v - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @returns {number} L*
 */
var munsellValueToL = function (v) {
    return 116 * (0, colorspace_1.functionF)((0, exports.munsellValueToY)(v)) - 16;
};
exports.munsellValueToL = munsellValueToL;
// These converters process a dark color (value < 1) separately because the
// values of the Munsell Renotation Data (all.dat) are not evenly distributed:
// [0, 0.2, 0.4, 0.6, 0.8, 1, 2, 3, ..., 10].
// In the following functions, the actual value equals scaledValue/5 if dark is
// true; the actual chroma equals to halfChroma*2.
var mhvcToLchabAllIntegerCase = function (hue40, scaledValue, halfChroma, dark) {
    // This function deals with the case where H, V, and C are all integers.
    // If chroma is larger than 50, C * ab is linearly extrapolated.
    if (dark === void 0) { dark = false; }
    // This function does no range checks: hue40 must be in {0, 1, ..., 39};
    // scaledValue must be in {0, 1, ..., 10} if dark is false, and {0, 1, ..., 6}
    // if dark is true; halfChroma must be a non-negative integer.
    if (dark) {
        // Value is in {0, 0.2, 0.4, 0.6, 0.8, 1}.
        if (halfChroma <= 25) {
            return [
                MRD.mrdLTableDark[scaledValue],
                MRD.mrdCHTableDark[hue40][scaledValue][halfChroma][0],
                MRD.mrdCHTableDark[hue40][scaledValue][halfChroma][1],
            ];
        }
        else {
            // Linearly extrapolates a color outside the MRD.
            var cstarab = MRD.mrdCHTableDark[hue40][scaledValue][25][0];
            var factor = halfChroma / 25;
            return [
                MRD.mrdLTableDark[scaledValue],
                cstarab * factor,
                MRD.mrdCHTableDark[hue40][scaledValue][25][1],
            ];
        }
    }
    else {
        if (halfChroma <= 25) {
            return [
                MRD.mrdLTable[scaledValue],
                MRD.mrdCHTable[hue40][scaledValue][halfChroma][0],
                MRD.mrdCHTable[hue40][scaledValue][halfChroma][1],
            ];
        }
        else {
            var cstarab = MRD.mrdCHTable[hue40][scaledValue][25][0];
            var factor = halfChroma / 25;
            return [
                MRD.mrdLTable[scaledValue],
                cstarab * factor,
                MRD.mrdCHTable[hue40][scaledValue][25][1],
            ];
        }
    }
};
// Deals with the case where V and C are integer.
var mhvcToLchabValueChromaIntegerCase = function (hue40, scaledValue, halfChroma, dark) {
    if (dark === void 0) { dark = false; }
    var hue1 = Math.floor(hue40);
    var hue2 = (0, arithmetic_1.mod)(Math.ceil(hue40), 40);
    var _a = mhvcToLchabAllIntegerCase(hue1, scaledValue, halfChroma, dark), lstar = _a[0], cstarab1 = _a[1], hab1 = _a[2];
    if (hue1 === hue2) {
        return [lstar, cstarab1, hab1];
    }
    else {
        var _b = mhvcToLchabAllIntegerCase(hue2, scaledValue, halfChroma, dark), cstarab2 = _b[1], hab2 = _b[2];
        if (hab1 === hab2 || (0, arithmetic_1.mod)(hab2 - hab1, 360) >= 180) {
            // FIXME: was workaround for the rare
            // case hab1 exceeds hab2, which will be removed after some test.
            return [lstar, cstarab1, hab1];
        }
        else {
            var hab = (0, arithmetic_1.circularLerp)(hue40 - hue1, hab1, hab2, 360);
            var cstarab = (cstarab1 * (0, arithmetic_1.mod)(hab2 - hab, 360)) / (0, arithmetic_1.mod)(hab2 - hab1, 360) +
                (cstarab2 * (0, arithmetic_1.mod)(hab - hab1, 360)) / (0, arithmetic_1.mod)(hab2 - hab1, 360);
            return [lstar, cstarab, hab];
        }
    }
};
// Deals with the case where V is integer.
var mhvcToLchabValueIntegerCase = function (hue40, scaledValue, halfChroma, dark) {
    if (dark === void 0) { dark = false; }
    var halfChroma1 = Math.floor(halfChroma);
    var halfChroma2 = Math.ceil(halfChroma);
    if (halfChroma1 === halfChroma2) {
        return mhvcToLchabValueChromaIntegerCase(hue40, scaledValue, halfChroma, dark);
    }
    else {
        var _a = mhvcToLchabValueChromaIntegerCase(hue40, scaledValue, halfChroma1, dark), lstar = _a[0], cstarab1 = _a[1], hab1 = _a[2];
        var _b = mhvcToLchabValueChromaIntegerCase(hue40, scaledValue, halfChroma2, dark), cstarab2 = _b[1], hab2 = _b[2];
        var _c = (0, arithmetic_1.polarToCartesian)(cstarab1, hab1, 360), astar1 = _c[0], bstar1 = _c[1];
        var _d = (0, arithmetic_1.polarToCartesian)(cstarab2, hab2, 360), astar2 = _d[0], bstar2 = _d[1];
        var astar = astar1 * (halfChroma2 - halfChroma) + astar2 * (halfChroma - halfChroma1);
        var bstar = bstar1 * (halfChroma2 - halfChroma) + bstar2 * (halfChroma - halfChroma1);
        return (0, colorspace_1.labToLchab)(lstar, astar, bstar);
    }
};
var mhvcToLchabGeneralCase = function (hue40, scaledValue, halfChroma, dark) {
    if (dark === void 0) { dark = false; }
    var actualValue = dark ? scaledValue * 0.2 : scaledValue;
    var scaledValue1 = Math.floor(scaledValue);
    var scaledValue2 = Math.ceil(scaledValue);
    var lstar = (0, exports.munsellValueToL)(actualValue);
    if (scaledValue1 === scaledValue2) {
        return mhvcToLchabValueIntegerCase(hue40, scaledValue1, halfChroma, dark);
    }
    else if (scaledValue1 === 0) {
        // If the given color is so dark (V < 0.2) that it is out of MRD, we use the
        // fact that the chroma and hue of LCHab corresponds roughly to that of
        // Munsell.
        var _a = mhvcToLchabValueIntegerCase(hue40, 1, halfChroma, dark), cstarab = _a[1], hab = _a[2];
        return [lstar, cstarab, hab];
    }
    else {
        var _b = mhvcToLchabValueIntegerCase(hue40, scaledValue1, halfChroma, dark), lstar1 = _b[0], cstarab1 = _b[1], hab1 = _b[2];
        var _c = mhvcToLchabValueIntegerCase(hue40, scaledValue2, halfChroma, dark), lstar2 = _c[0], cstarab2 = _c[1], hab2 = _c[2];
        var _d = (0, arithmetic_1.polarToCartesian)(cstarab1, hab1, 360), astar1 = _d[0], bstar1 = _d[1];
        var _e = (0, arithmetic_1.polarToCartesian)(cstarab2, hab2, 360), astar2 = _e[0], bstar2 = _e[1];
        var astar = (astar1 * (lstar2 - lstar)) / (lstar2 - lstar1) +
            (astar2 * (lstar - lstar1)) / (lstar2 - lstar1);
        var bstar = (bstar1 * (lstar2 - lstar)) / (lstar2 - lstar1) +
            (bstar2 * (lstar - lstar1)) / (lstar2 - lstar1);
        return (0, colorspace_1.labToLchab)(lstar, astar, bstar);
    }
};
/**
 * Converts Munsell HVC to LCHab. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @returns {Array} [L*, C*ab, hab]
 */
var mhvcToLchab = function (hue100, value, chroma) {
    var hue40 = (0, arithmetic_1.mod)(hue100 * 0.4, 40);
    var value10 = (0, arithmetic_1.clamp)(value, 0, 10);
    var halfChroma = Math.max(0, chroma) * 0.5;
    if (value >= 1) {
        return mhvcToLchabGeneralCase(hue40, value10, halfChroma, false);
    }
    else {
        return mhvcToLchabGeneralCase(hue40, value10 * 5, halfChroma, true);
    }
};
exports.mhvcToLchab = mhvcToLchab;
var hueNames = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP'];
/**
 * Converts Munsell Color string to Munsell HVC.
 * @param munsellStr - is the standard Munsell Color code.
 * @returns {Array} [hue100, value, chroma]
 * @throws {SyntaxError} if the given string is invalid.
 */
var munsellToMhvc = function (munsellStr) {
    var nums = munsellStr
        .split(/[^a-z0-9.-]+/)
        .filter(Boolean)
        .map(function (str) { return Number(str); });
    var words = munsellStr.match(/[A-Z]+/);
    if (words === null)
        throw new SyntaxError("Doesn't contain hue names: ".concat(munsellStr));
    var hueName = words[0];
    var hueNumber = hueNames.indexOf(hueName);
    if (hueName === 'N') {
        return [0, nums[0], 0];
    }
    else if (nums.length !== 3) {
        throw new SyntaxError("Doesn't contain 3 numbers: ".concat(nums));
    }
    else if (hueNumber === -1) {
        // achromatic
        throw new SyntaxError("Invalid hue designator: ".concat(hueName));
    }
    else {
        return [hueNumber * 10 + nums[0], nums[1], nums[2]];
    }
};
exports.munsellToMhvc = munsellToMhvc;
/**
 * Converts Munsell Color string to LCHab. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param munsellStr - is the standard Munsell Color code.
 * @returns {Array} [L*, C*ab, hab]
 */
var munsellToLchab = function (munsellStr) {
    return exports.mhvcToLchab.apply(void 0, (0, exports.munsellToMhvc)(munsellStr));
};
exports.munsellToLchab = munsellToLchab;
/**
 * Converts Munsell HVC to CIELAB. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @returns {Array} [L*, a*, b*]
 */
var mhvcToLab = function (hue100, value, chroma) {
    return colorspace_1.lchabToLab.apply(void 0, (0, exports.mhvcToLchab)(hue100, value, chroma));
};
exports.mhvcToLab = mhvcToLab;
/**
 * Converts Munsell Color string to CIELAB. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param munsellStr
 * @returns {Array} [L*, a*, b*]
 */
var munsellToLab = function (munsellStr) {
    return exports.mhvcToLab.apply(void 0, (0, exports.munsellToMhvc)(munsellStr));
};
exports.munsellToLab = munsellToLab;
/**
 * Converts Munsell HVC to XYZ.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @param [illuminant]
 * @returns {Array} [X, Y, Z]
 */
var mhvcToXyz = function (hue100, value, chroma, illuminant) {
    if (illuminant === void 0) { illuminant = colorspace_1.ILLUMINANT_D65; }
    // Uses Bradford transformation
    return (0, arithmetic_1.multMatrixVector)(illuminant.catMatrixCToThis, colorspace_1.labToXyz.apply(void 0, __spreadArray(__spreadArray([], (0, exports.mhvcToLab)(hue100, value, chroma), false), [colorspace_1.ILLUMINANT_C], false)));
};
exports.mhvcToXyz = mhvcToXyz;
/**
 * Converts Munsell Color string to XYZ.
 * @param munsellStr
 * @param [illuminant]
 * @returns {Array} [X, Y, Z]
 */
var munsellToXyz = function (munsellStr, illuminant) {
    if (illuminant === void 0) { illuminant = colorspace_1.ILLUMINANT_D65; }
    return exports.mhvcToXyz.apply(void 0, __spreadArray(__spreadArray([], (0, exports.munsellToMhvc)(munsellStr), false), [illuminant], false));
};
exports.munsellToXyz = munsellToXyz;
/**
 * Converts Munsell HVC to linear RGB.
 * @param hue100 - is in the circle group R/100Z. Any real
 * number is accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds
 * the interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero
 * if it is negative.
 * @param [rgbSpace]
 * @returns {Array} [linear R, linear G, linear B]
 */
var mhvcToLinearRgb = function (hue100, value, chroma, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return colorspace_1.xyzToLinearRgb.apply(void 0, __spreadArray(__spreadArray([], (0, exports.mhvcToXyz)(hue100, value, chroma, rgbSpace.illuminant), false), [rgbSpace], false));
};
exports.mhvcToLinearRgb = mhvcToLinearRgb;
/**
 * Converts Munsell Color string to linear RGB.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {Array} [linear R, linear G, linear B]
 */
var munsellToLinearRgb = function (munsellStr, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return exports.mhvcToLinearRgb.apply(void 0, __spreadArray(__spreadArray([], (0, exports.munsellToMhvc)(munsellStr), false), [rgbSpace], false));
};
exports.munsellToLinearRgb = munsellToLinearRgb;
/**
 * Converts Munsell HVC to gamma-corrected RGB.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @param [rgbSpace]
 * @returns {Array} [R, G, B]
 */
var mhvcToRgb = function (hue100, value, chroma, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return colorspace_1.linearRgbToRgb.apply(void 0, __spreadArray(__spreadArray([], (0, exports.mhvcToLinearRgb)(hue100, value, chroma, rgbSpace), false), [rgbSpace], false));
};
exports.mhvcToRgb = mhvcToRgb;
/**
 * Converts Munsell Color string to gamma-corrected RGB.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {Array} [R, G, B]
 */
var munsellToRgb = function (munsellStr, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return exports.mhvcToRgb.apply(void 0, __spreadArray(__spreadArray([], (0, exports.munsellToMhvc)(munsellStr), false), [rgbSpace], false));
};
exports.munsellToRgb = munsellToRgb;
/**
 * Converts Munsell HVC to quantized RGB.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @param [clamp] - If true, the returned value will be clamped
 * to the range [0, 255].
 * @param [rgbSpace]
 * @returns {Array} [R255, G255, B255]
 */
var mhvcToRgb255 = function (hue100, value, chroma, clamp, rgbSpace) {
    if (clamp === void 0) { clamp = true; }
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return colorspace_1.rgbToRgb255.apply(void 0, __spreadArray(__spreadArray([], (0, exports.mhvcToRgb)(hue100, value, chroma, rgbSpace), false), [clamp], false));
};
exports.mhvcToRgb255 = mhvcToRgb255;
/**
 * Converts Munsell Color string to quantized RGB.
 * @param munsellStr
 * @param [clamp] - If true, the returned value will be clamped
 * to the range [0, 255].
 * @param [rgbSpace]
 * @returns {Array} [R255, G255, B255]
 */
var munsellToRgb255 = function (munsellStr, clamp, rgbSpace) {
    if (clamp === void 0) { clamp = true; }
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return exports.mhvcToRgb255.apply(void 0, __spreadArray(__spreadArray([], (0, exports.munsellToMhvc)(munsellStr), false), [clamp, rgbSpace], false));
};
exports.munsellToRgb255 = munsellToRgb255;
/**
 * Converts Munsell HVC to 24-bit hex color.
 * @param hue100 - is in the circle group R/100Z. Any real number is
 * accepted.
 * @param value - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @param chroma - will be in [0, +inf). Assumed to be zero if it is
 * negative.
 * @param [rgbSpace]
 * @returns {string} hex color "#XXXXXX"
 */
var mhvcToHex = function (hue100, value, chroma, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return colorspace_1.rgbToHex.apply(void 0, (0, exports.mhvcToRgb)(hue100, value, chroma, rgbSpace));
};
exports.mhvcToHex = mhvcToHex;
/**
 * Converts Munsell Color string to 24-bit hex color.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {string} hex color "#XXXXXX"
 */
var munsellToHex = function (munsellStr, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = colorspace_1.SRGB; }
    return exports.mhvcToHex.apply(void 0, __spreadArray(__spreadArray([], (0, exports.munsellToMhvc)(munsellStr), false), [rgbSpace], false));
};
exports.munsellToHex = munsellToHex;
/**
 * Converts Munsell HVC to string. `N`, the code for achromatic colors, is used
 * when the chroma becomes zero w.r.t. the specified number of digits.
 * @param hue100
 * @param value
 * @param chroma
 * @param [digits] - is the number of digits after the decimal
 * point. Must be non-negative integer. Note that the units digit of the hue
 * prefix is assumed to be already after the decimal point.
 * @returns {string} Munsell Color code
 */
var mhvcToMunsell = function (hue100, value, chroma, digits) {
    if (digits === void 0) { digits = 1; }
    var canonicalHue100 = (0, arithmetic_1.mod)(hue100, 100);
    var huePrefix = canonicalHue100 % 10;
    var hueNumber = Math.round((canonicalHue100 - huePrefix) / 10);
    // If the hue prefix is 0, we use 10 with the previous hue name instead, which is a
    // common practice in the Munsell system.
    var hueDigits = Math.max(digits - 1, 0);
    var fixedHuePrefix = huePrefix.toFixed(hueDigits);
    var hueStr = parseFloat(fixedHuePrefix) === 0
        ? Number(10).toFixed(hueDigits) + hueNames[(0, arithmetic_1.mod)(hueNumber - 1, 10)]
        : huePrefix.toFixed(hueDigits) + hueNames[hueNumber];
    var chromaStr = chroma.toFixed(digits);
    var valueStr = value.toFixed(digits);
    if (parseFloat(chromaStr) === 0) {
        return "N ".concat(valueStr);
    }
    else {
        return "".concat(hueStr, " ").concat(valueStr, "/").concat(chromaStr);
    }
};
exports.mhvcToMunsell = mhvcToMunsell;
//# sourceMappingURL=convert.js.map