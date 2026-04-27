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
exports.hexToRgb = exports.rgbToHex = exports.rgb255ToRgb = exports.rgbToRgb255 = exports.rgbToLinearRgb = exports.linearRgbToRgb = exports.linearRgbToXyz = exports.xyzToLinearRgb = exports.ADOBE_RGB = exports.SRGB = exports.RGBSpace = exports.xyzToLab = exports.labToXyz = exports.lToY = exports.ILLUMINANT_C = exports.ILLUMINANT_D65 = exports.Illuminant = exports.lchabToLab = exports.labToLchab = exports.functionF = void 0;
var arithmetic_1 = require("./arithmetic");
var CONST1 = 216 / 24389;
var CONST2 = 24389 / 27 / 116;
var CONST3 = 16 / 116;
var functionF = function (x) {
    // Called in XYZ -> Lab conversion
    if (x > CONST1) {
        return Math.pow(x, 0.3333333333333333);
    }
    else {
        return CONST2 * x + CONST3;
    }
};
exports.functionF = functionF;
var labToLchab = function (lstar, astar, bstar) {
    return __spreadArray([lstar], (0, arithmetic_1.cartesianToPolar)(astar, bstar, 360), true);
};
exports.labToLchab = labToLchab;
var lchabToLab = function (lstar, Cstarab, hab) {
    return __spreadArray([lstar], (0, arithmetic_1.polarToCartesian)(Cstarab, hab, 360), true);
};
exports.lchabToLab = lchabToLab;
var Illuminant = /** @class */ (function () {
    function Illuminant(X, Z, catMatrixCToThis, catMatrixThisToC) {
        this.X = X;
        this.Z = Z;
        this.catMatrixCToThis = catMatrixCToThis;
        this.catMatrixThisToC = catMatrixThisToC;
    }
    return Illuminant;
}());
exports.Illuminant = Illuminant;
// The following data are based on dufy. I use the Bradford transformation as CAT.
exports.ILLUMINANT_D65 = new Illuminant(0.950428061568676, 1.08891545904089, [
    [0.9904112147597705, -0.00718628493839008, -0.011587161829988951],
    [-0.012395677058354078, 1.01560663662526, -0.0029181533414322086],
    [-0.003558889496942143, 0.006762494889396557, 0.9182865019746504],
], [
    [1.0098158523233767, 0.007060316533713093, 0.012764537821734395],
    [0.012335983421444891, 0.9846986027789835, 0.003284857773421468],
    [0.003822773174044815, -0.007224207660971385, 1.0890100329203007],
]);
exports.ILLUMINANT_C = new Illuminant(0.9807171421603395, 1.182248923134197, [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
], [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
]);
var DELTA = 6 / 29;
var CONST4 = 3 * DELTA * DELTA;
var lToY = function (lstar) {
    var fy = (lstar + 16) / 116;
    return fy > DELTA ? fy * fy * fy : (fy - CONST3) * CONST4;
};
exports.lToY = lToY;
var labToXyz = function (lstar, astar, bstar, illuminant) {
    if (illuminant === void 0) { illuminant = exports.ILLUMINANT_D65; }
    var fy = (lstar + 16) / 116;
    var fx = fy + astar * 0.002;
    var fz = fy - bstar * 0.005;
    var Xw = illuminant.X;
    var Zw = illuminant.Z;
    return [
        fx > DELTA ? fx * fx * fx * Xw : (fx - CONST3) * CONST4 * Xw,
        fy > DELTA ? fy * fy * fy : (fy - CONST3) * CONST4,
        fz > DELTA ? fz * fz * fz * Zw : (fz - CONST3) * CONST4 * Zw,
    ];
};
exports.labToXyz = labToXyz;
var xyzToLab = function (X, Y, Z, illuminant) {
    if (illuminant === void 0) { illuminant = exports.ILLUMINANT_D65; }
    var _a = [X / illuminant.X, Y, Z / illuminant.Z].map(exports.functionF), fX = _a[0], fY = _a[1], fZ = _a[2];
    return [116 * fY - 16, 500 * (fX - fY), 200 * (fY - fZ)];
};
exports.xyzToLab = xyzToLab;
var createLinearizer = function (gamma) {
    // Returns a function for inverse gamma-correction (not used for sRGB).
    var reciprocal = 1 / gamma;
    return function (x) {
        return x >= 0 ? Math.pow(x, reciprocal) : -Math.pow(-x, reciprocal);
    };
};
var createDelinearizer = function (gamma) {
    // Returns a function for gamma correction (not used for sRGB).
    return function (x) {
        return x >= 0 ? Math.pow(x, gamma) : -Math.pow(-x, gamma);
    };
};
var RGBSpace = /** @class */ (function () {
    function RGBSpace(matrixThisToXyz, matrixXyzToThis, linearizer, delinearizer, illuminant) {
        if (linearizer === void 0) { linearizer = createLinearizer(2.2); }
        if (delinearizer === void 0) { delinearizer = createDelinearizer(2.2); }
        if (illuminant === void 0) { illuminant = exports.ILLUMINANT_D65; }
        this.matrixThisToXyz = matrixThisToXyz;
        this.matrixXyzToThis = matrixXyzToThis;
        this.linearizer = linearizer;
        this.delinearizer = delinearizer;
        this.illuminant = illuminant;
    }
    return RGBSpace;
}());
exports.RGBSpace = RGBSpace;
var CONST5 = 0.0031308 * 12.92;
// The following data are based on dufy.
exports.SRGB = new RGBSpace([
    [0.4124319639872968, 0.3575780371782625, 0.1804592355313134],
    [0.21266023143094992, 0.715156074356525, 0.07218369421252536],
    [0.01933274831190452, 0.11919267905942081, 0.9504186404649174],
], [
    [3.240646461582504, -1.537229731776316, -0.49856099408961585],
    [-0.969260718909152, 1.876000564872059, 0.04155578980259398],
    [0.05563672378977863, -0.2040013205625215, 1.0570977520057931],
], function (x) {
    // Below is actually the linearizer of bg-sRGB.
    if (x > CONST5) {
        return Math.pow((0.055 + x) / 1.055, 2.4);
    }
    else if (x < -CONST5) {
        return -Math.pow((0.055 - x) / 1.055, 2.4);
    }
    else {
        return x / 12.92;
    }
}, function (x) {
    // Below is actually the delinearizer of bg-sRGB.
    if (x > 0.0031308) {
        return Math.pow(x, 1 / 2.4) * 1.055 - 0.055;
    }
    else if (x < -0.0031308) {
        return -Math.pow(-x, 1 / 2.4) * 1.055 + 0.055;
    }
    else {
        return x * 12.92;
    }
});
exports.ADOBE_RGB = new RGBSpace([
    [0.5766645233146432, 0.18556215235063508, 0.18820138590339738],
    [0.29734264483411293, 0.6273768008045281, 0.07528055436135896],
    [0.027031149530373878, 0.07069034375262295, 0.991193965757893],
], [
    [2.0416039047109305, -0.5650114025085637, -0.3447340526026908],
    [-0.969223190031607, 1.8759279278672774, 0.04155418080089159],
    [0.01344622799042258, -0.11837953662156253, 1.015322039041507],
], createDelinearizer(563 / 256), createLinearizer(563 / 256));
var xyzToLinearRgb = function (X, Y, Z, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = exports.SRGB; }
    return (0, arithmetic_1.multMatrixVector)(rgbSpace.matrixXyzToThis, [X, Y, Z]);
};
exports.xyzToLinearRgb = xyzToLinearRgb;
var linearRgbToXyz = function (lr, lg, lb, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = exports.SRGB; }
    return (0, arithmetic_1.multMatrixVector)(rgbSpace.matrixThisToXyz, [lr, lg, lb]);
};
exports.linearRgbToXyz = linearRgbToXyz;
var linearRgbToRgb = function (lr, lg, lb, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = exports.SRGB; }
    return [lr, lg, lb].map(rgbSpace.delinearizer);
};
exports.linearRgbToRgb = linearRgbToRgb;
var rgbToLinearRgb = function (r, g, b, rgbSpace) {
    if (rgbSpace === void 0) { rgbSpace = exports.SRGB; }
    return [r, g, b].map(rgbSpace.linearizer);
};
exports.rgbToLinearRgb = rgbToLinearRgb;
var rgbToRgb255 = function (r, g, b, clamp) {
    if (clamp === void 0) { clamp = true; }
    if (clamp) {
        return [r, g, b].map(function (x) { return (0, arithmetic_1.clamp)(Math.round(x * 255), 0, 255); });
    }
    else {
        return [r, g, b].map(function (x) { return Math.round(x * 255); });
    }
};
exports.rgbToRgb255 = rgbToRgb255;
var rgb255ToRgb = function (r255, g255, b255) {
    return [r255 / 255, g255 / 255, b255 / 255];
};
exports.rgb255ToRgb = rgb255ToRgb;
var rgbToHex = function (r, g, b) {
    var toHex = function (x) {
        return Math.round((0, arithmetic_1.clamp)(x, 0, 1) * 255)
            .toString(16)
            .padStart(2, '0');
    };
    return "#".concat(toHex(r)).concat(toHex(g)).concat(toHex(b));
};
exports.rgbToHex = rgbToHex;
var hexToRgb = function (hex) {
    switch (hex.length) {
        case 7: // #XXXXXX
        case 9: // #XXXXXXXX
            return [
                parseInt(hex.slice(1, 3), 16) / 255,
                parseInt(hex.slice(3, 5), 16) / 255,
                parseInt(hex.slice(5, 7), 16) / 255,
            ];
        case 4: // #XXX
        case 5: // #XXXX
            return [parseInt(hex[1], 16) / 15, parseInt(hex[2], 16) / 15, parseInt(hex[3], 16) / 15];
        default:
            throw SyntaxError("The length of hex color is invalid: ".concat(hex));
    }
};
exports.hexToRgb = hexToRgb;
//# sourceMappingURL=colorspace.js.map