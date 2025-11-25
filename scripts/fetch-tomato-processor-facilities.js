"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var googleapis_1 = require("googleapis");
var google_auth_library_1 = require("google-auth-library");
var dotenv = require("dotenv");
var fs = require("fs");
dotenv.config();
var TOMATO_PROCESSOR_SPREADSHEET_ID = process.env.TOMATO_PROCESSOR_SPREADSHEET_ID;
var TOMATO_PROCESSOR_SHEET1_NAME = process.env.TOMATO_PROCESSOR_SHEET1_NAME || 'Facility List and Location';
var TOMATO_PROCESSOR_SHEET2_NAME = process.env.TOMATO_PROCESSOR_SHEET2_NAME || 'Capacity Information';
var OUTPUT_FILE = 'src/data/google-sheet-data.json'; // Define the output file path
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var auth, sheets, sheet1Response, sheet1Values, sheet2Response, sheet2Values, facilitiesHeader_1, facilitiesData, numRowsToRead, headerCandidates, attributesHeaderIndex, i, row, attributesHeader_1, attributesData, attributesMap_1, facilitiesObjects, mergedData, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    auth = new google_auth_library_1.JWT({
                        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                        key: (_a = process.env.GOOGLE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
                        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
                    });
                    sheets = googleapis_1.google.sheets({ version: 'v4', auth: auth });
                    return [4 /*yield*/, sheets.spreadsheets.values.get({
                            spreadsheetId: TOMATO_PROCESSOR_SPREADSHEET_ID,
                            range: "".concat(TOMATO_PROCESSOR_SHEET1_NAME, "!A:Z"),
                        })];
                case 1:
                    sheet1Response = _b.sent();
                    sheet1Values = sheet1Response.data.values;
                    return [4 /*yield*/, sheets.spreadsheets.values.get({
                            spreadsheetId: TOMATO_PROCESSOR_SPREADSHEET_ID,
                            range: "".concat(TOMATO_PROCESSOR_SHEET2_NAME, "!A:Z"),
                        })];
                case 2:
                    sheet2Response = _b.sent();
                    sheet2Values = sheet2Response.data.values;
                    if (!sheet1Values || sheet1Values.length === 0 || !sheet2Values || sheet2Values.length === 0) {
                        console.log('No data found.');
                        return [2 /*return*/];
                    }
                    facilitiesHeader_1 = sheet1Values[0];
                    console.log("Facilities Header:", facilitiesHeader_1);
                    console.log("Facilities Header (JSON):", JSON.stringify(facilitiesHeader_1));
                    facilitiesData = sheet1Values.slice(1);
                    numRowsToRead = 10;
                    headerCandidates = sheet2Values.slice(0, numRowsToRead);
                    attributesHeaderIndex = -1;
                    for (i = 0; i < headerCandidates.length; i++) {
                        row = headerCandidates[i];
                        if (row && row[0] === 'Name') {
                            attributesHeaderIndex = i;
                            break;
                        }
                    }
                    if (attributesHeaderIndex === -1) {
                        console.warn("Could not find header row in Capacity Information sheet. Using first row as header.");
                        attributesHeaderIndex = 0;
                    }
                    attributesHeader_1 = sheet2Values[attributesHeaderIndex];
                    console.log("Attributes Header:", attributesHeader_1);
                    console.log("Attributes Header (JSON):", JSON.stringify(attributesHeader_1));
                    attributesData = sheet2Values.slice(attributesHeaderIndex + 1);
                    attributesMap_1 = new Map();
                    attributesData.forEach(function (row) {
                        var facilityName = row[0]; // Assuming the first column is the Facility Name
                        if (!facilityName) {
                            console.warn("Skipping row in Capacity Information sheet due to missing Facility Name.");
                            return;
                        }
                        var attribute = Object.fromEntries(attributesHeader_1.map(function (header, index) { return [header, row[index]]; }));
                        attributesMap_1.set(facilityName, attribute);
                    });
                    facilitiesObjects = facilitiesData.map(function (facility) {
                        return Object.fromEntries(facilitiesHeader_1.map(function (header, index) { return [header, facility[index]]; }));
                    });
                    mergedData = facilitiesObjects.map(function (facility) {
                        var facilityName = facility["Name"];
                        // Perform case-insensitive comparison
                        var attributeData = attributesMap_1.get(facilityName) || {};
                        if (Object.keys(attributeData).length === 0) {
                            if (facilityName) {
                                for (var _i = 0, _a = attributesMap_1.entries(); _i < _a.length; _i++) {
                                    var _b = _a[_i], key = _b[0], value = _b[1];
                                    if (key.toLowerCase() === facilityName.toLowerCase()) {
                                        attributeData = value;
                                        break;
                                    }
                                }
                            }
                        }
                        var merged = __assign(__assign({}, facility), attributeData);
                        return merged;
                    });
                    // Write the merged data to the output file
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedData, null, 2));
                    console.log("Data written to ".concat(OUTPUT_FILE));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching or processing data:', error_1.message);
                    if (error_1.stack) {
                        console.error('Stack trace:', error_1.stack);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
main();
