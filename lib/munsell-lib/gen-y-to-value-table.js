"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// This is a script file to generate y-to-value-table.ts
var convert_1 = require("./convert");
var fs_1 = __importDefault(require("fs"));
var findRoot = function (func, rhs, min, max, eps) {
    // bisection method
    var mid = (min + max) * 0.5;
    var lhs = func(mid);
    if (Math.abs(lhs - rhs) <= eps) {
        return mid;
    }
    else {
        return lhs > rhs ? findRoot(func, rhs, min, mid, eps) : findRoot(func, rhs, mid, max, eps);
    }
};
var partitions = 2000;
var yToMunsellValueTable = Array(1 + partitions)
    .fill(0)
    .map(function (_, i) {
    return findRoot(convert_1.munsellValueToY, i / partitions, 0, 10, 1e-8);
});
yToMunsellValueTable[0] = 0;
yToMunsellValueTable[partitions] = 10;
fs_1.default.writeFileSync("".concat(__dirname, "/y-to-value-table.ts"), "export const yToMunsellValueTable =\n".concat(JSON.stringify(yToMunsellValueTable, function (_, val) {
    return val.toFixed ? Number(val.toFixed(6)) : val;
}), ";\n"));
//# sourceMappingURL=gen-y-to-value-table.js.map