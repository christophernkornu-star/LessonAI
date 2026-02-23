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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var docx_1 = require("docx");
var fs = __importStar(require("fs"));
var tableBorders = {
    top: { style: docx_1.BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: docx_1.BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: docx_1.BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: docx_1.BorderStyle.SINGLE, size: 4, color: "000000" },
};
var doc = new docx_1.Document({
    sections: [{
            children: [
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("Row 1, Col 1")], borders: tableBorders, width: { size: 30, type: docx_1.WidthType.PERCENTAGE } }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("Row 1, Col 2")], borders: tableBorders, width: { size: 70, type: docx_1.WidthType.PERCENTAGE } }),
                            ]
                        })
                    ]
                }),
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("Row 2, Col 1")], borders: tableBorders, width: { size: 50, type: docx_1.WidthType.PERCENTAGE } }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("Row 2, Col 2")], borders: tableBorders, width: { size: 50, type: docx_1.WidthType.PERCENTAGE } }),
                            ]
                        })
                    ]
                }),
                new docx_1.Paragraph("")
            ]
        }]
});
docx_1.Packer.toBuffer(doc).then(function (buffer) {
    fs.writeFileSync("test-tables.docx", buffer);
    console.log("Done");
});
