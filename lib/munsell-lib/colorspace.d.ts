import { Vector3, Matrix33 } from './arithmetic';
export declare const functionF: (x: number) => number;
export declare const labToLchab: (lstar: number, astar: number, bstar: number) => Vector3;
export declare const lchabToLab: (lstar: number, Cstarab: number, hab: number) => Vector3;
export declare class Illuminant {
    X: number;
    Z: number;
    catMatrixCToThis: Matrix33;
    catMatrixThisToC: Matrix33;
    constructor(X: number, Z: number, catMatrixCToThis: Matrix33, catMatrixThisToC: Matrix33);
}
export declare const ILLUMINANT_D65: Illuminant;
export declare const ILLUMINANT_C: Illuminant;
export declare const lToY: (lstar: number) => number;
export declare const labToXyz: (lstar: number, astar: number, bstar: number, illuminant?: Illuminant) => Vector3;
export declare const xyzToLab: (X: number, Y: number, Z: number, illuminant?: Illuminant) => Vector3;
export declare class RGBSpace {
    matrixThisToXyz: Matrix33;
    matrixXyzToThis: Matrix33;
    linearizer: (x: number) => number;
    delinearizer: (x: number) => number;
    illuminant: Illuminant;
    constructor(matrixThisToXyz: Matrix33, matrixXyzToThis: Matrix33, linearizer?: (x: number) => number, delinearizer?: (x: number) => number, illuminant?: Illuminant);
}
export declare const SRGB: RGBSpace;
export declare const ADOBE_RGB: RGBSpace;
export declare const xyzToLinearRgb: (X: number, Y: number, Z: number, rgbSpace?: RGBSpace) => Vector3;
export declare const linearRgbToXyz: (lr: number, lg: number, lb: number, rgbSpace?: RGBSpace) => Vector3;
export declare const linearRgbToRgb: (lr: number, lg: number, lb: number, rgbSpace?: RGBSpace) => Vector3;
export declare const rgbToLinearRgb: (r: number, g: number, b: number, rgbSpace?: RGBSpace) => Vector3;
export declare const rgbToRgb255: (r: number, g: number, b: number, clamp?: boolean) => Vector3;
export declare const rgb255ToRgb: (r255: number, g255: number, b255: number) => Vector3;
export declare const rgbToHex: (r: number, g: number, b: number) => string;
export declare const hexToRgb: (hex: string) => Vector3;
//# sourceMappingURL=colorspace.d.ts.map