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
                    columnWidths: [1400, 1600, 7000],
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T1 C1")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T1 C2")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T1 C3")], borders: tableBorders }),
                            ]
                        })
                    ]
                }),
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    columnWidths: [2000, 6500, 1500], // Misaligned from T1
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T2 C1")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T2 C2")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T2 C3")], borders: tableBorders }),
                            ]
                        })
                    ]
                }),
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    columnWidths: [7800, 2200], // Misaligned from T2
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T3 C1")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T3 C2")], borders: tableBorders }),
                            ]
                        })
                    ]
                }),
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    columnWidths: [1900, 8100], // Misaligned from T3
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T4 C1")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T4 C2")], borders: tableBorders }),
                            ]
                        })
                    ]
                }),
                new docx_1.Table({
                    width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                    columnWidths: [1500, 6000, 2500], // Misaligned from T4
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T5 C1")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T5 C2")], borders: tableBorders }),
                                new docx_1.TableCell({ children: [new docx_1.Paragraph("T5 C3")], borders: tableBorders }),
                            ]
                        })
                    ]
                }),
            ]
        }]
});
docx_1.Packer.toBuffer(doc).then(function (buffer) {
    fs.writeFileSync("test-misalign.docx", buffer);
    console.log("Done");
});
