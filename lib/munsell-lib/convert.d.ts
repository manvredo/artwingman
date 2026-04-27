import { Vector3 } from './arithmetic';
/**
 * Converts Munsell value to Y (of XYZ) based on the formula in the ASTM
 * D1535-18e1.
 * @param v - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @returns {number} Y
 */
export declare const munsellValueToY: (v: number) => number;
/**
 * Converts Munsell value to L* (of CIELAB).
 * @param v - will be in [0, 10]. Clamped if it exceeds the
 * interval.
 * @returns {number} L*
 */
export declare const munsellValueToL: (v: number) => number;
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
export declare const mhvcToLchab: (hue100: number, value: number, chroma: number) => Vector3;
/**
 * Converts Munsell Color string to Munsell HVC.
 * @param munsellStr - is the standard Munsell Color code.
 * @returns {Array} [hue100, value, chroma]
 * @throws {SyntaxError} if the given string is invalid.
 */
export declare const munsellToMhvc: (munsellStr: string) => Vector3;
/**
 * Converts Munsell Color string to LCHab. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param munsellStr - is the standard Munsell Color code.
 * @returns {Array} [L*, C*ab, hab]
 */
export declare const munsellToLchab: (munsellStr: string) => Vector3;
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
export declare const mhvcToLab: (hue100: number, value: number, chroma: number) => Vector3;
/**
 * Converts Munsell Color string to CIELAB. Note that the returned value is under
 * **Illuminant C**. I don't recommend you use this function
 * if you are not sure what that means.
 * @param munsellStr
 * @returns {Array} [L*, a*, b*]
 */
export declare const munsellToLab: (munsellStr: string) => Vector3;
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
export declare const mhvcToXyz: (hue100: number, value: number, chroma: number, illuminant?: import("./colorspace").Illuminant) => Vector3;
/**
 * Converts Munsell Color string to XYZ.
 * @param munsellStr
 * @param [illuminant]
 * @returns {Array} [X, Y, Z]
 */
export declare const munsellToXyz: (munsellStr: string, illuminant?: import("./colorspace").Illuminant) => Vector3;
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
export declare const mhvcToLinearRgb: (hue100: number, value: number, chroma: number, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
/**
 * Converts Munsell Color string to linear RGB.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {Array} [linear R, linear G, linear B]
 */
export declare const munsellToLinearRgb: (munsellStr: string, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
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
export declare const mhvcToRgb: (hue100: number, value: number, chroma: number, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
/**
 * Converts Munsell Color string to gamma-corrected RGB.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {Array} [R, G, B]
 */
export declare const munsellToRgb: (munsellStr: string, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
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
export declare const mhvcToRgb255: (hue100: number, value: number, chroma: number, clamp?: boolean, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
/**
 * Converts Munsell Color string to quantized RGB.
 * @param munsellStr
 * @param [clamp] - If true, the returned value will be clamped
 * to the range [0, 255].
 * @param [rgbSpace]
 * @returns {Array} [R255, G255, B255]
 */
export declare const munsellToRgb255: (munsellStr: string, clamp?: boolean, rgbSpace?: import("./colorspace").RGBSpace) => Vector3;
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
export declare const mhvcToHex: (hue100: number, value: number, chroma: number, rgbSpace?: import("./colorspace").RGBSpace) => string;
/**
 * Converts Munsell Color string to 24-bit hex color.
 * @param munsellStr
 * @param [rgbSpace]
 * @returns {string} hex color "#XXXXXX"
 */
export declare const munsellToHex: (munsellStr: string, rgbSpace?: import("./colorspace").RGBSpace) => string;
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
export declare const mhvcToMunsell: (hue100: number, value: number, chroma: number, digits?: number) => string;
//# sourceMappingURL=convert.d.ts.map