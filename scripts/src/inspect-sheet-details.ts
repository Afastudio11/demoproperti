import pkg from "xlsx";
const { readFile, utils } = pkg;

const excelPath = "/Users/fathanahasad/Documents/Laptop/project/laongweb/attached_assets/Copy_of_DASHBOARD_MONITOR_HR_1781933597333.xlsx";

try {
  const workbook = readFile(excelPath);
  console.log("Raw Sheet Names in Workbook:", workbook.SheetNames.map(s => JSON.stringify(s)));
  
  // Find sheets dynamically with clean regex matching
  const absensiSheetName = workbook.SheetNames.find(s => {
    const clean = s.replace(/[\s\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g, " ").trim().toUpperCase();
    return clean === "DATA ABSEN" || clean === "DATA ABSENSI";
  });
  
  const lemburSheetName = workbook.SheetNames.find(s => {
    const clean = s.replace(/[\s\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g, " ").trim().toUpperCase();
    return clean === "DATA LEMBUR";
  });
  
  if (!absensiSheetName) {
    console.error("DATA ABSEN/ABSENSI sheet not found! SheetNames were:", workbook.SheetNames);
    process.exit(1);
  }
  
  // Inspect DATA ABSEN
  const absensiSheet = workbook.Sheets[absensiSheetName];
  const absensiData: any[] = utils.sheet_to_json(absensiSheet);
  
  console.log(`\n=== DATA ABSENSI INSPECTION (WITH FORWARD FILL) from sheet "${absensiSheetName}" ===`);
  
  let currentProject = "";
  let currentMonth = "";
  let currentYear = 0;
  
  const projects = new Set<string>();
  const sekalaRows: any[] = [];
  
  for (const row of absensiData) {
    const rawName = row.__EMPTY;
    const rawProj = row.__EMPTY_1;
    const rawMonth = row.__EMPTY_2;
    const rawYear = row.__EMPTY_3;
    
    if (rawProj && String(rawProj).trim() !== "") {
      currentProject = String(rawProj).trim();
    }
    if (rawMonth && String(rawMonth).trim() !== "") {
      currentMonth = String(rawMonth).trim();
    }
    if (rawYear) {
      currentYear = Number(rawYear);
    }
    
    if (currentProject) {
      projects.add(currentProject);
    }
    
    // If we have a name, this is an employee row
    if (rawName && String(rawName).trim() !== "" && String(rawName).toUpperCase() !== "KETERANGAN" && !String(rawName).includes("NAMA KARYAWAN")) {
      const nameClean = String(rawName).trim();
      if (currentProject.toUpperCase().includes("SEKALA")) {
        sekalaRows.push({ name: nameClean, proj: currentProject, month: currentMonth, year: currentYear });
      }
    }
  }
  
  console.log("Distinct projects/divisions in DATA ABSENSI:", Array.from(projects));
  console.log(`\nFound ${sekalaRows.length} rows matching "SEKALA" in DATA ABSENSI:`);
  sekalaRows.forEach(sr => {
    console.log(`- Name: "${sr.name}", Project: "${sr.proj}", Period: ${sr.month} ${sr.year}`);
  });

  // Inspect DATA LEMBUR
  if (lemburSheetName) {
    const lemburSheet = workbook.Sheets[lemburSheetName];
    const lemburData: any[] = utils.sheet_to_json(lemburSheet);
    console.log(`\n=== DATA LEMBUR INSPECTION (WITH FORWARD FILL) from sheet "${lemburSheetName}" ===`);
    
    let currentLemburProj = "";
    let currentLemburMonth = "";
    let currentLemburYear = 0;
    
    const lemburProjects = new Set<string>();
    const sekalaLembur: any[] = [];
    
    for (const row of lemburData) {
      const rawName = row["NAMA KARYAWAN"] || row.__EMPTY;
      const rawProj = row.PROJECT || row.__EMPTY_1;
      const rawMonth = row.BULAN || row.__EMPTY_2;
      const rawYear = row.TAHUN || row.__EMPTY_3;
      
      if (rawProj && String(rawProj).trim() !== "" && String(rawProj).trim() !== "PROJECT" && String(rawProj).trim() !== "LEMBUR") {
        currentLemburProj = String(rawProj).trim();
      }
      if (rawMonth && String(rawMonth).trim() !== "") {
        currentLemburMonth = String(rawMonth).trim();
      }
      if (rawYear) {
        currentLemburYear = Number(rawYear);
      }
      
      if (currentLemburProj) {
        lemburProjects.add(currentLemburProj);
      }
      
      if (rawName && String(rawName).trim() !== "" && String(rawName).toUpperCase() !== "KETERANGAN" && !String(rawName).includes("NAMA KARYAWAN")) {
        const nameClean = String(rawName).trim();
        if (currentLemburProj.toUpperCase().includes("SEKALA")) {
          sekalaLembur.push({ name: nameClean, proj: currentLemburProj, month: currentLemburMonth, year: currentLemburYear });
        }
      }
    }
    
    console.log("Distinct projects/divisions in DATA LEMBUR:", Array.from(lemburProjects));
    console.log(`\nFound ${sekalaLembur.length} rows matching "SEKALA" in DATA LEMBUR:`);
    sekalaLembur.forEach(sr => {
      console.log(`- Name: "${sr.name}", Project: "${sr.proj}", Period: ${sr.month} ${sr.year}`);
    });
  }

} catch (error) {
  console.error("Error:", error);
}
