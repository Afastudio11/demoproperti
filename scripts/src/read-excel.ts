import pkg from "xlsx";
import * as path from "path";
import * as fs from "fs";

const { readFile, utils } = pkg;

const excelPath = "/Users/fathanahasad/Documents/Laptop/project/laongweb/attached_assets/Copy_of_DASHBOARD_MONITOR_HR_1781933597333.xlsx";

try {
  const workbook = readFile(excelPath);
  console.log("Sheet names in workbook:", workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = utils.sheet_to_json(sheet);
    console.log(`\nSheet: "${sheetName}" - Total rows: ${data.length}`);
    if (data.length > 0) {
      console.log("First row keys:", Object.keys(data[0]));
      // Print first 5 rows
      console.log("Sample rows:", data.slice(0, 5));
    }
  }
} catch (error) {
  console.error("Error reading excel file:", error);
}
