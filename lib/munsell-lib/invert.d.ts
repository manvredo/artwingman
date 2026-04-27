import { Vector3 } from './arithmetic';
/**
 * Converts Y of XYZ to Munsell value. The round-trip error, `abs(Y -
 * munsellValueToY(yToMunsellValue(Y))`, is guaranteed to be smaller than 1e-5 if
 * Y is in [0, 1].
 * @param Y - will be in [0, 1]. Clamped if it exceeds the interval.
 * @returns {number} Munsell value
 */
export declare const yToMunsellValue: (Y: number) => number;
/**
 * Converts L* of CIELAB to Munsell value. The round-trip error, `abs(L* -
 * munsellValueToL(lToMunsellValue(L*))`, is guaranteed to be smaller than 1e-3
 * if L* is in [0, 100].
 * @param lstar - will be in [0, 100]. Clamped if it exceeds the
 * interval.
 * @returns {number} Munsell value
 */
export declare const lToMunsellValue: (lstar: number) => number;
/**
 * ProcType specifies the action to be taken when a computation doesn't converge
 * within the given number of iterations. The following options are available:
 * - `"error"`: throws Error;
 * - `"init"`: returns the initial rough approximation.
 * - `"last"`: returns the last approximation.
 */
export type ProcType = 'error' | 'init' | 'last';
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
export declare const lchabToMhvc: (lstar: number, cstarab: number, hab: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const lchabToMunsell: (lstar: number, cstarab: number, hab: number, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const labToMhvc: (lstar: number, astar: number, bstar: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const labToMunsell: (lstar: number, astar: number, bstar: number, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const xyzToMhvc: (X: number, Y: number, Z: number, illuminant?: import("./colorspace").Illuminant, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const xyzToMunsell: (X: number, Y: number, Z: number, illuminant?: import("./colorspace").Illuminant, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const linearRgbToMhvc: (lr: number, lg: number, lb: number, rgbSpace?: import("./colorspace").RGBSpace, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const linearRgbToMunsell: (lr: number, lg: number, lb: number, rgbSpace?: import("./colorspace").RGBSpace, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const rgbToMhvc: (r: number, g: number, b: number, rgbSpace?: import("./colorspace").RGBSpace, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const rgbToMunsell: (r: number, g: number, b: number, rgbSpace?: import("./colorspace").RGBSpace, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const rgb255ToMhvc: (r255: number, g255: number, b255: number, rgbSpace?: import("./colorspace").RGBSpace, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const rgb255ToMunsell: (r255: number, g255: number, b255: number, rgbSpace?: import("./colorspace").RGBSpace, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
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
export declare const hexToMhvc: (hex: string, rgbSpace?: import("./colorspace").RGBSpace, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => Vector3;
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
export declare const hexToMunsell: (hex: string, rgbSpace?: import("./colorspace").RGBSpace, digits?: number, threshold?: number, maxIteration?: number, ifReachMax?: ProcType, factor?: number) => string;
//# sourceMappingURL=invert.d.ts.map