// =====================================================
// LIVEBIRD DEPARTMENT - APPS SCRIPT BACKEND (SPEED OPTIMIZED)
//
// 1. Heavy report endpoints are cached in CacheService (gzipped).
// 2. Any save/add action clears the report caches.
// 3. keepWarm() + a 5-minute time trigger keeps the script warm
//    and pre-builds report caches.
// 4. Customer Bills (getCustomerAccounts) now reads the BillStatus
//    sheet (formulas sum BillPayments) instead of joining
//    CatchingBreakdown + BillPayments on every call.
//
// Read-only actions work over GET:
//   API_URL?payload={"action":"getOperationsReportData"}
// =====================================================

const CACHE_VERSION_ = "v2"; // bump this if sheet layouts change

const REPORT_CACHE_KEYS_ = [
  "rpt_catchingBreakdown",
  "rpt_operations",
  "rpt_defect",
  "rpt_birdCondition",
  "rpt_plantDaily",
  "rpt_vehicleExpenses",
  "rpt_user3"
].map(k => k + "_" + CACHE_VERSION_);

// =====================================================
// GET HANDLER — read-only actions via GET
// Only actions starting with "get" are allowed over GET.
// =====================================================

function doGet(e) {
  try {
    const raw = e && e.parameter && e.parameter.payload;

    if (!raw) {
      return ContentService.createTextOutput("API is running");
    }

    const request = JSON.parse(raw);

    if (!/^get/i.test(String(request.action || ""))) {
      return jsonResponse({ success: false, message: "Only read actions are allowed via GET." });
    }

    // Reuse doPost's routing without duplicating it
    return doPost({ postData: { contents: raw } });

  } catch (error) {
    return jsonResponse({ success: false, message: friendlyErrorMessage_(error) });
  }
}

function doPost(e) {
  const out = doPostInner_(e);
  try {
    const a = JSON.parse(e.postData.contents).action;
    if (/^(save|add)/i.test(String(a))) clearReportCache_();
  } catch (_) {}
  return out;
}

function doPostInner_(e) {
  try {
    const request = JSON.parse(e.postData.contents);

    const action = request.action;

    if (action === "login") {
      return loginUser(request.username, request.password);
    }

    if (action === "getDashboardLists") {
      return getDashboardLists();
    }

    if (action === "saveCatchingRecord") {
      return saveCatchingRecord(request.record);
    }

    if (action === "getBirdConditionLists") {
      return getBirdConditionLists();
    }

    if (action === "saveBirdConditionRecord") {
      return saveBirdConditionRecord(request.record);
    }

    if (action === "getOperationsReportData") {
      return getOperationsReportData();
    }

    if (action === "getBirdConditionReportData") {
      return getBirdConditionReportData();
    }

    if (action === "addFarmer") {
      return addFarmer(request.type, request.name);
    }

    if (action === "addCustomer") {
      return addCustomer(request.name);
    }

    if (action === "getUser2DashboardLists") {
      return getUser2DashboardLists();
    }

    if (action === "saveUser2DailyEntry") {
      return saveUser2DailyEntry(request.payload);
    }

    if (action === "getVehicleExpenseLists") {
      return getVehicleExpenseLists();
    }

    if (action === "saveVehicleExpense") {
      return saveVehicleExpense(request.record);
    }

    if (action === "getPlantDailyReportData") {
      return getPlantDailyReportData();
    }

    if (action === "getVehicleExpensesReportData") {
      return getVehicleExpensesReportData();
    }

    if (action === "addUser2MasterItem") {
      return addUser2MasterItem(request.type, request.value);
    }

    if (action === "saveUser3CatchingPlan") {
      return saveUser3CatchingPlan(request.rows);
    }

    if (action === "getUser3ReportData") {
      return getUser3ReportData();
    }

    if (action === "getDefectReportData") {
      return getDefectReportData();
    }

    if (action === "getCatchingRecordLookup") {
      return getCatchingRecordLookup(request.date, request.farmer, request.batch2);
    }

    // Manual cache bust. The Refresh button in the UI calls this before
    // it reloads, so a sheet edit done directly in Google Sheets shows
    // up immediately instead of waiting out the 10-minute report cache.
    if (action === "getRefreshReportCache") {
      clearReportCache_();
      return jsonResponse({ success: true, message: "Report cache cleared" });
    }

    if (action === "getKpi1Data") {
      return getKpi1Data();
    }

    if (action === "getKpi2Data") {
      return getKpi2Data();
    }

    if (action === "getKpi3Data") {
      return getKpi3Data();
    }

    if (action === "getKpi4Data") {
      return getKpi4Data();
    }

    if (action === "getKpi5Data") {
      return getKpi5Data();
    }

    if (action === "getCatchingBreakdownData") {
      return getCatchingBreakdownData();
    }

    if (action === "getCatchingRecordBySerial") {
      return getCatchingRecordBySerial(request.serialNo);
    }

    if (action === "getBillPaymentInfo") {
      return getBillPaymentInfo(request.billNo);
    }

    if (action === "saveBillPayment") {
      return saveBillPayment(request.payment);
    }

    if (action === "getBillPaymentHistory") {
      return getBillPaymentHistory(request.billNo);
    }

    if (action === "getCustomerAccounts") {
      return getCustomerAccounts();
    }

    if (action === "getDailyPaymentReportData") {
      return getDailyPaymentReportData();
    }

    if (action === "getBillPaymentStatusReportData") {
      return getBillPaymentStatusReportData();
    }

    if (action === "saveCustomerAccountPayment") {
      return saveCustomerAccountPayment(request.payment);
    }

    return jsonResponse({
      success: false,
      message: "Invalid action"
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: friendlyErrorMessage_(error)
    });
  }
}


// =====================================================
// LOGIN
// =====================================================

function loginUser(username, password) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Login sheet not found."
    });
  }

  const rows = sheet.getDataRange().getValues();

  const enteredUsername =
    String(username || "").trim().toLowerCase();

  const enteredPassword =
    String(password || "").trim();

  for (let i = 1; i < rows.length; i++) {

    const savedUsername =
      String(rows[i][0] || "").trim().toLowerCase();

    const savedPassword =
      String(rows[i][1] || "").trim();

    const employeeName =
      String(rows[i][2] || "").trim();

    if (
      savedUsername === enteredUsername &&
      savedPassword === enteredPassword
    ) {

      return jsonResponse({
        success: true,
        username: savedUsername,
        name: employeeName,
        message: "Login successful"
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "Invalid username or password."
  });
}


// =====================================================
// DASHBOARD DROPDOWN LISTS
// =====================================================

function getDashboardLists() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const ownfarmSheet = ss.getSheetByName("Ownfarm");
  const buybackSheet = ss.getSheetByName("Buyback");
  const directPurchaseSheet = ss.getSheetByName("Direct purchase");
  const customersSheet = ss.getSheetByName("Customers");

  const ownfarm = getFirstColumnValues(ownfarmSheet);
  const buyback = getFirstColumnValues(buybackSheet);
  const directPurchase = getFirstColumnValues(directPurchaseSheet);
  const customers = getFirstColumnValues(customersSheet);

  return jsonResponse({
    success: true,
    ownfarm: ownfarm,
    buyback: buyback,
    directPurchase: directPurchase,
    customers: customers
  });
}


// =====================================================
// SAVE CATCHING RECORD
// =====================================================

function saveCatchingRecord(record) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const masterSheet = ss.getSheetByName("Masterdata");
  const breakdownSheet = ss.getSheetByName("CatchingBreakdown");

  if (!masterSheet) {
    return jsonResponse({
      success: false,
      message: "Masterdata sheet not found."
    });
  }

  if (!breakdownSheet) {
    return jsonResponse({
      success: false,
      message: "CatchingBreakdown sheet not found."
    });
  }

  const recordDate = String(record.common.date || "").trim();

  // ---------------------------------------------
  // DATE CHANGE CHECK (existing record edited and
  // moved to a different day). The serial encodes
  // the original date, so it must be reissued.
  // ---------------------------------------------

  if (String(record.serialNo || "").trim()) {

    const serialParts = String(record.serialNo).trim().split("-");

    const expectedDate = dayOfYearToDate_(
      serialParts[0],
      serialParts[1]
    );

    if (recordDate && recordDate !== expectedDate) {
      return jsonResponse({
        success: false,
        message: "Date change not allowed — create a new record for the new date."
      });
    }

  }

  // ---------------------------------------------
  // LOCK — stops two saves happening at the exact
  // same time (duplicate serial numbers, rows
  // stepping on each other).
  // ---------------------------------------------

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);
  } catch (lockError) {
    return jsonResponse({
      success: false,
      message: "System is busy saving another record. Please try again in a few seconds."
    });
  }

  try {

    const common = record.common || {};
    const disable = record.disable || {};
    const healthy = record.healthy || {};
    const total = record.total || {};

    const isUpdate =
      !!String(record.serialNo || "").trim();

    const serialNo =
      isUpdate
        ? String(record.serialNo).trim()
        : generateCatchingSerialNo(breakdownSheet, 2, common.date);

    const masterRow = [
      serialNo,
      common.date || "",
      common.type || "",
      common.farmer || "",
      common.cage || "",
      common.batch || "",
      common.customer || "",
      common.loadNo || "",
      total.nob || "0",
      total.weight || "0.00",
      total.price || "0.00",
      common.bill || "",
      total.amount || "0.00",
      total.avgWeight || "0.000",
      record.addedBy || "Unknown",
      getTimestamp()
    ];

    const breakdownRow = [
      serialNo,
      common.date || "",
      common.type || "",
      common.farmer || "",
      common.cage || "",
      common.batch || "",
      common.customer || "",
      common.loadNo || "",
      common.bill || "",
      disable.nob || "0",
      disable.weight || "0.00",
      disable.avgWeight || "0.000",
      disable.price || "0.00",
      disable.amount || "0.00",
      healthy.nob || "0",
      healthy.weight || "0.00",
      healthy.avgWeight || "0.000",
      healthy.price || "0.00",
      healthy.amount || "0.00",
      total.nob || "0",
      total.weight || "0.00",
      total.avgWeight || "0.000",
      total.price || "0.00",
      total.amount || "0.00",
      record.addedBy || "Unknown",
      disable.bill || "",
      getTimestamp()
    ];


    if (isUpdate) {

      const masterRowNum = findRowBySerialNo(masterSheet, serialNo);
      const breakdownRowNum = findRowBySerialNo(breakdownSheet, serialNo);

      if (masterRowNum === -1 || breakdownRowNum === -1) {
        return jsonResponse({
          success: false,
          message: "Serial No not found — cannot update."
        });
      }

      // Backup — mehema thiyapu data restore karanna
      // ekak fail unoth.
      const masterBackup =
        masterSheet
          .getRange(masterRowNum, 1, 1, masterRow.length)
          .getValues();

      const breakdownBackup =
        breakdownSheet
          .getRange(breakdownRowNum, 1, 1, breakdownRow.length)
          .getValues();

      try {

        masterSheet
          .getRange(masterRowNum, 1, 1, masterRow.length)
          .setValues([masterRow]);

        breakdownSheet
          .getRange(breakdownRowNum, 1, 1, breakdownRow.length)
          .setValues([breakdownRow]);

      } catch (updateError) {

        // Ekak fail unoth deka rowma pahalata restore karanawa
        let restoreOk = true;

        try {

          masterSheet
            .getRange(masterRowNum, 1, 1, masterRow.length)
            .setValues(masterBackup);

          breakdownSheet
            .getRange(breakdownRowNum, 1, 1, breakdownRow.length)
            .setValues(breakdownBackup);

        } catch (restoreError) {
          restoreOk = false;
        }

        if (restoreOk) {

          return jsonResponse({
            success: false,
            message: "Update failed. Changes were rolled back — please try again."
          });

        } else {

          return jsonResponse({
            success: false,
            message: "Update failed for Serial No " + serialNo +
              ". This record may now have MISMATCHED data between " +
              "Masterdata and CatchingBreakdown sheets. Please inform " +
              "the MIS to check and fix Serial No " + serialNo + " manually."
          });

        }

      }

      return jsonResponse({
        success: true,
        message: "Record updated successfully.",
        serialNo: serialNo
      });

    }

    // ---------------------------------------------
    // NEW RECORD — deka sheet ekatama append karala,
    // verify karala, ekak fail unoth rollback.
    // ---------------------------------------------

    let masterRowNum = -1;

    try {
      masterRowNum = writeFirstBlankRow_(masterSheet, masterRow, 1);

      writeFirstBlankRow_(breakdownSheet, breakdownRow, 1);

    } catch (saveError) {

      // CatchingBreakdown save fail una — Masterdata
      // eken danapu row eka delete karala sync eka rakinawa.

      let rollbackOk = true;

      if (masterRowNum !== -1) {

        try {

          const checkValue =
            masterSheet.getRange(masterRowNum, 1).getValue();

          if (String(checkValue).trim() === serialNo) {
            masterSheet.deleteRow(masterRowNum);
          }

        } catch (rollbackError) {
          rollbackOk = false;
        }

      }

      if (rollbackOk) {

        return jsonResponse({
          success: false,
          message: "Save failed. No data was saved — please try again."
        });

      } else {

        return jsonResponse({
          success: false,
          message: "Save failed for Serial No " + serialNo +
            ". This record may be saved in only ONE of the two sheets " +
            "(Masterdata / CatchingBreakdown). Please inform the admin " +
            "to check and fix Serial No " + serialNo + " manually before saving again."
        });

      }

    }

    return jsonResponse({
      success: true,
      message: "Record saved successfully.",
      serialNo: serialNo
    });

  } finally {
    lock.releaseLock();
  }

}


// =====================================================
// BIRD CONDITION LISTS
// =====================================================

function getBirdConditionLists() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const ownfarmSheet = ss.getSheetByName("Ownfarm");
  const buybackSheet = ss.getSheetByName("Buyback");
  const reasonSheet = ss.getSheetByName("Reasons");

  const ownfarm = getFirstColumnValues(ownfarmSheet);
  const buyback = getFirstColumnValues(buybackSheet);
  const reasons = getFirstColumnValues(reasonSheet);

  const farmers = [...ownfarm, ...buyback];

  return jsonResponse({
    success: true,
    farmers: farmers,
    reasons: reasons
  });
}


// =====================================================
// SAVE BIRD CONDITION RECORD
// =====================================================

function saveBirdConditionRecord(record) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("BirdCondition");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "BirdCondition sheet not found."
    });
  }

  const weight1 = safeSheetNumber(record.weight1);
  const weight2 = safeSheetNumber(record.weight2);
  const weight3 = safeSheetNumber(record.weight3);

  const totalWeight = weight1 + weight2 + weight3;

  const row = [
    record.date || "",           // A Date
    record.farmer || "",         // B Farmer Name
    record.batch2 || "",         // C Batch No 2
    "",                          // D NOB (formula)
    "",                          // E Weight (formula)
    "",                          // F Average Weight (formula)
    record.reason1 || "",        // G Reason 1
    record.weight1 || "0",       // H Weight 1
    record.reason2 || "",        // I Reason 2
    record.weight2 || "0",       // J Weight 2
    record.reason3 || "",        // K Reason 3
    record.weight3 || "0",       // L Weight 3
    totalWeight.toFixed(2),      // M Total Weight
    record.addedBy || "Unknown", // N User
    getTimestamp()               // O Timestamp
  ];

  writeFirstBlankRow_(sheet, row, 1);

  return jsonResponse({
    success: true,
    message: "Bird Condition record saved successfully."
  });
}


// =====================================================
// HELPER: READ FIRST COLUMN (5-min dropdown cache)
// =====================================================

function getFirstColumnValues(sheet) {

  if (!sheet) {
    return [];
  }

  const cache = CacheService.getScriptCache();
  const key = "list_" + sheet.getName();

  const hit = cache.get(key);
  if (hit) {
    return JSON.parse(hit);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const result = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat()
    .map(value => String(value).trim())
    .filter(value => value !== "");

  cache.put(key, JSON.stringify(result), 300); // 5 minutes

  return result;
}


// =====================================================
// DAY-OF-YEAR → DATE (for serial date checks)
// "26-273-01" → "2026-09-30"
// =====================================================

function dayOfYearToDate_(yy, ddd) {
  try {
    const year = 2000 + Number(yy);
    const date = new Date(year, 0, Number(ddd));
    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  } catch (e) {
    return "";
  }
}

// =====================================================
// GENERATE CATCHING SERIAL NO (YY-DDD-SS)
// YY  = last 2 digits of year
// DDD = day of year (Jan 1 = 001)
// SS  = today's save count (01, 02, 03...)
// =====================================================

function generateCatchingSerialNo(sheet, dateColumnIndex, dateValue) {

  let dateStr = formatSheetDate(dateValue);

  if (!dateStr) {
    dateStr = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const yy = String(year % 100).padStart(2, "0");

  const startOfYear = new Date(year, 0, 1);
  const thisDate = new Date(year, month - 1, day);

  const dayOfYear =
    Math.round((thisDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  const ddd = String(dayOfYear).padStart(3, "0");

  const lastRow = sheet.getLastRow();
  let countForDay = 0;

  if (lastRow >= 2) {

    const dateValues =
      sheet.getRange(2, dateColumnIndex, lastRow - 1, 1).getValues();

    dateValues.forEach(row => {
      if (formatSheetDate(row[0]) === dateStr) {
        countForDay++;
      }
    });

  }

  const seq = String(countForDay + 1).padStart(2, "0");

  return `${yy}-${ddd}-${seq}`;

}


// =====================================================
// FIND ROW BY SERIAL NO
// =====================================================

function findRowBySerialNo(sheet, serialNo) {

  const target = String(serialNo || "").trim();

  if (!target) {
    return -1;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const values =
    sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {

    if (String(values[i][0] || "").trim() === target) {
      return i + 2; // actual sheet row number
    }

  }

  return -1;

}


// =====================================================
// GET CATCHING RECORD BY SERIAL NO (for edit search)
// =====================================================

function getCatchingRecordBySerial(serialNo) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const breakdownSheet = ss.getSheetByName("CatchingBreakdown");

  if (!breakdownSheet) {
    return jsonResponse({
      success: false,
      message: "CatchingBreakdown sheet not found."
    });
  }

  const rowNum = findRowBySerialNo(breakdownSheet, serialNo);

  if (rowNum === -1) {
    return jsonResponse({ success: true, found: false });
  }

  const row =
    breakdownSheet.getRange(rowNum, 1, 1, 26).getValues()[0];

  return jsonResponse({

    success: true,
    found: true,

    serialNo: String(row[0] || ""),
    date: formatSheetDate(row[1]),
    type: String(row[2] || ""),
    farmer: String(row[3] || ""),
    cage: String(row[4] || ""),
    batch: String(row[5] || ""),
    customer: String(row[6] || ""),
    loadNo: String(row[7] || ""),
    bill: String(row[8] || ""),

    disable: {
      nob: String(safeSheetNumber(row[9])),
      weight: safeSheetNumber(row[10]).toFixed(2),
      avgWeight: safeSheetNumber(row[11]).toFixed(3),
      price: safeSheetNumber(row[12]).toFixed(2),
      amount: safeSheetNumber(row[13]).toFixed(2),
      bill: String(row[25] || "")
    },

    healthy: {
      nob: String(safeSheetNumber(row[14])),
      weight: safeSheetNumber(row[15]).toFixed(2),
      avgWeight: safeSheetNumber(row[16]).toFixed(3),
      price: safeSheetNumber(row[17]).toFixed(2),
      amount: safeSheetNumber(row[18]).toFixed(2)
    },

    total: {
      nob: String(safeSheetNumber(row[19])),
      weight: safeSheetNumber(row[20]).toFixed(2),
      avgWeight: safeSheetNumber(row[21]).toFixed(3),
      price: safeSheetNumber(row[22]).toFixed(2),
      amount: safeSheetNumber(row[23]).toFixed(2)
    }

  });

}


// =====================================================
// BILL PAYMENT LOOKUP AND ENTRY
// CatchingBreakdown: I=Bill No, B=Date, D=Farmer, F=Batch,
// G=Customer, T=Total NOB, U=Total Weight, W=Total Price, X=Total Amount.
// New payment rows are stored in BillPayments.
// =====================================================

// Find the first row whose anchor column is empty. The app writes records
// starting in column A, so a value in another column does not make the row
// unusable for a new record. This also reuses gaps left by deleted rows.
function firstBlankDataRow_(sheet, anchorColumn) {
  const startRow = 2; // row 1 is the header
  const lastRow = Math.max(sheet.getLastRow(), startRow);
  const values = sheet
    .getRange(startRow, anchorColumn || 1, lastRow - startRow + 1, 1)
    .getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (!String(values[i][0] || "").trim()) return startRow + i;
  }

  return lastRow + 1;
}

function writeFirstBlankRow_(sheet, rowValues, anchorColumn) {
  const row = firstBlankDataRow_(sheet, anchorColumn || 1);
  sheet.getRange(row, 1, 1, rowValues.length).setValues([rowValues]);
  return row;
}

function writeFirstBlankRows_(sheet, rows, anchorColumn) {
  if (!rows || !rows.length) return firstBlankDataRow_(sheet, anchorColumn || 1);
  const row = firstBlankDataRow_(sheet, anchorColumn || 1);
  sheet.getRange(row, 1, rows.length, rows[0].length).setValues(rows);
  return row;
}

const BILL_PAYMENT_HEADERS_ = [
  "Timestamp", "Bill No", "Catching Date", "Expected Date", "Farmer Name",
  "Batch No", "Customer Name", "Total NOB", "Total Weight", "Total Price",
  "Total Amount", "Payment Method", "Receipt No", "Payment Amount", "Balance", "Added By", "Payment Date"
];

function getBillPaymentHistory(billNo) {
  const target = String(billNo || "").trim().toLowerCase();
  const sheet = getBillPaymentSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, history: [] });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 17).getValues(); // A:Q
  const history = [];
  rows.forEach((row, index) => {
    if (String(row[1] || "").trim().toLowerCase() !== target) return;
    const paymentDate = row[16] ? formatSheetDate(row[16]) : formatSheetDate(row[0]);
    history.push({
      rowNumber: index + 2,
      paymentDate: paymentDate,
      paymentMethod: String(row[11] || ""),
      receiptNo: String(row[12] || ""),
      paymentAmount: safeSheetNumber(row[13]),
      balance: safeSheetNumber(row[14]),
      addedBy: String(row[15] || "")
    });
  });
  return jsonResponse({ success: true, history: history });
}

function getDailyPaymentReportData() {
  const sheet = getBillPaymentSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse({ success: true, rows: [] });
  }

  const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 16).getValues(); // B:Q
  const reportRows = rows
    .map(row => ({
      billNo: String(row[0] || "").trim(),
      billDate: formatSheetDate(row[1]),
      expectedDate: formatSheetDate(row[2]),
      farmerName: String(row[3] || ""),
      batchNo: String(row[4] || ""),
      customerName: String(row[5] || ""),
      totalAmount: safeSheetNumber(row[9]),
      paymentMethod: String(row[10] || ""),
      receiptNo: String(row[11] || ""),
      paymentAmount: safeSheetNumber(row[12]),
      balance: safeSheetNumber(row[13]),
      addedBy: String(row[14] || ""),
      paymentDate: formatSheetDate(row[15])
    }))
    .filter(row => row.billNo && row.paymentAmount > 0 && row.paymentDate);

  return jsonResponse({ success: true, rows: reportRows });
}

// One row per bill, read from the BillStatus sheet (formulas already
// sum BillPayments). Includes bills with no payments at all.
// BillStatus: A Date | B Farmer | C Batch | D Customer | E Bill No | F NOB
//   G Weight | H Price | I Total Amount | J Paid | K Outstanding
// Optional: a column whose header is "Last Payment Date".
function getBillPaymentStatusReportData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BillStatus");
  if (!sheet) {
    return jsonResponse({ success: false, message: "BillStatus sheet not found." });
  }
  if (sheet.getLastRow() < 2) {
    return jsonResponse({ success: true, rows: [] });
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(h => String(h || "").trim().toLowerCase());
  const lastPaymentColumn = headers.indexOf("last payment date"); // -1 when absent

  const sourceRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues();
  const seenBills = {};
  const reportRows = [];
  sourceRows.forEach(row => {
    const billNo = String(row[4] || "").trim(); // E: Bill No
    const key = billNo.toLowerCase();
    if (!billNo || seenBills[key]) return;
    seenBills[key] = true;

    const totalAmount = safeSheetNumber(row[8]); // I: Total Amount
    const paidAmount = Math.min(totalAmount, Math.round(safeSheetNumber(row[9]) * 100) / 100); // J: Paid
    const balance = row[10] === "" || row[10] === null
      ? Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100)
      : Math.max(0, Math.round(safeSheetNumber(row[10]) * 100) / 100); // K: Outstanding
    const status = balance <= 0.000001
      ? "Paid"
      : paidAmount > 0
        ? "Partially Paid"
        : "Unpaid";

    reportRows.push({
      billDate: formatSheetDate(row[0]), // A: Date
      billNo: billNo,
      customerName: String(row[3] || ""), // D: Customer
      farmerName: String(row[1] || ""), // B: Farmer
      batchNo: String(row[2] || ""), // C: Batch
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      balance: balance,
      lastPaymentDate: lastPaymentColumn === -1 ? "" : formatSheetDate(row[lastPaymentColumn]),
      status: status
    });
  });

  return jsonResponse({ success: true, rows: reportRows });
}

function getBillPaymentInfo(billNo) {
  const bill = getBillPaymentBill_(billNo);
  if (!bill) return jsonResponse({ success: true, found: false });
  bill.paidAmount = getBillPaymentsPaid_(bill.billNo);
  bill.balance = Math.max(0, bill.totalAmount - bill.paidAmount);
  return jsonResponse({ success: true, found: true, bill: bill });
}

function getBillPaymentBill_(billNo) {
  const target = String(billNo || "").trim().toLowerCase();
  if (!target) return null;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CatchingBreakdown");
  if (!sheet) throw new Error("CatchingBreakdown sheet not found.");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, 24).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[8] || "").trim().toLowerCase() !== target) continue; // I: Bill No
    const date = formatSheetDate(row[1]);
    const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) throw new Error("The catching date for this bill is invalid.");
    const catchingDate = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    const expected = new Date(catchingDate.getFullYear(), catchingDate.getMonth(), catchingDate.getDate() + 2);
    return {
      billNo: String(row[8] || "").trim(),
      date: date,
      expectedDate: Utilities.formatDate(expected, Session.getScriptTimeZone(), "yyyy-MM-dd"),
      farmer: String(row[3] || ""),
      batch: String(row[5] || ""),
      customer: String(row[6] || ""),
      totalNob: safeSheetNumber(row[19]),
      totalWeight: safeSheetNumber(row[20]),
      totalPrice: safeSheetNumber(row[22]),
      totalAmount: safeSheetNumber(row[23])
    };
  }
  return null;
}

function getBillPaymentSheet_(createIfMissing) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("BillPayments");
  if (!sheet && createIfMissing) sheet = ss.insertSheet("BillPayments");
  if (sheet && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, BILL_PAYMENT_HEADERS_.length).setValues([BILL_PAYMENT_HEADERS_]);
    sheet.setFrozenRows(1);
  } else if (sheet && String(sheet.getRange(1, BILL_PAYMENT_HEADERS_.length).getValue() || "") !== "Payment Date") {
    // Add the new field at the end so existing payment rows keep their columns.
    sheet.getRange(1, BILL_PAYMENT_HEADERS_.length).setValue("Payment Date");
  }
  return sheet;
}

function getBillPaymentsPaid_(billNo, excludedRow) {
  const sheet = getBillPaymentSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 13).getValues(); // B:N
  const target = String(billNo || "").trim().toLowerCase();
  return rows.reduce((sum, row, index) => {
    const actualRow = index + 2;
    if (actualRow === Number(excludedRow)) return sum;
    return String(row[0] || "").trim().toLowerCase() === target &&
      String(row[10] || "").trim() !== "Cash in Advance"
      ? sum + safeSheetNumber(row[12]) : sum;
  }, 0);
}

function recalculateBillPaymentBalances_(sheet, billNo, totalAmount) {
  if (sheet.getLastRow() < 2) return totalAmount;
  const rowCount = sheet.getLastRow() - 1;
  const rows = sheet.getRange(2, 2, rowCount, 14).getValues(); // B:O
  const target = String(billNo || "").trim().toLowerCase();
  let paidSoFar = 0;
  const balances = rows.map(row => {
    if (String(row[0] || "").trim().toLowerCase() === target) {
      if (String(row[10] || "").trim() === "Cash in Advance") return [row[13]];
      paidSoFar += safeSheetNumber(row[12]); // N: Payment Amount
      return [Math.max(0, Math.round((totalAmount - paidSoFar) * 100) / 100)];
    }
    return [row[13]]; // Preserve other bills' balances.
  });
  sheet.getRange(2, 15, rowCount, 1).setValues(balances); // O: Balance after each payment
  return Math.max(0, Math.round((totalAmount - paidSoFar) * 100) / 100);
}

// =====================================================
// CUSTOMER ACCOUNTS / CUSTOMER CASH-IN-ADVANCE LEDGER
// =====================================================

const CUSTOMER_LEDGER_HEADERS_ = [
  "Timestamp", "Customer", "Payment Date", "Type",
  "Reference No", "Amount", "Added By", "Remark"
];

function customerKey_(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getCustomerLedgerSheet_(createIfMissing) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("CustomerLedger");

  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet("CustomerLedger");
  }

  if (sheet && sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, CUSTOMER_LEDGER_HEADERS_.length)
      .setValues([CUSTOMER_LEDGER_HEADERS_]);
    sheet.setFrozenRows(1);
  } else if (sheet && !String(sheet.getRange(1, 1).getValue() || "").trim()) {
    sheet
      .getRange(1, 1, 1, CUSTOMER_LEDGER_HEADERS_.length)
      .setValues([CUSTOMER_LEDGER_HEADERS_]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// =====================================================
// CUSTOMER ACCOUNTS  (reads the BillStatus sheet)
// BillStatus columns:
//   A Date | B Farmer | C Batch | D Customer | E Bill No | F NOB
//   G Weight | H Price | I Total Amount | J Paid | K Outstanding
// J and K are formulas (BillPayments SUM), so nothing is
// calculated here except the grouping per customer.
// =====================================================

function getCustomerAccounts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customersSheet = ss.getSheetByName("Customers");
  const statusSheet = ss.getSheetByName("BillStatus");

  if (!customersSheet) {
    return jsonResponse({
      success: false,
      message: "Customers sheet not found."
    });
  }

  if (!statusSheet) {
    return jsonResponse({
      success: false,
      message: "BillStatus sheet not found."
    });
  }

  const accounts = {};
  const order = [];
  getFirstColumnValues(customersSheet).forEach(value => {
    const name = String(value || "").trim();
    const key = customerKey_(name);
    if (!key || key === "imo plant" || accounts[key]) return;
    accounts[key] = {
      name: name,
      billCount: 0,
      unpaidBillCount: 0,
      outstanding: 0,
      cashAdvance: 0,
      bills: []
    };
    order.push(key);
  });

  if (statusSheet.getLastRow() >= 2) {
    const rows = statusSheet
      .getRange(2, 1, statusSheet.getLastRow() - 1, 11)
      .getValues(); // A:K
    const seenBills = {};

    rows.forEach(row => {
      const billNo = String(row[4] || "").trim();          // E Bill No
      const billKey = customerKey_(billNo);
      const account = accounts[customerKey_(row[3])];      // D Customer
      if (!account || !billNo || seenBills[billKey]) return;
      seenBills[billKey] = true;

      const amount = safeSheetNumber(row[8]);              // I Total Amount
      const paid = safeSheetNumber(row[9]);                // J Paid
      const balance = row[10] === "" || row[10] === null
        ? Math.max(0, Math.round((amount - paid) * 100) / 100)
        : Math.max(0, Math.round(safeSheetNumber(row[10]) * 100) / 100); // K Outstanding

      const date = formatSheetDate(row[0]);                // A Date
      let expectedDate = "";
      const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (parts) {
        expectedDate = Utilities.formatDate(
          new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + 2),
          Session.getScriptTimeZone(), "yyyy-MM-dd"
        );
      }

      account.billCount += 1;
      if (balance > 0.000001) account.unpaidBillCount += 1;
      account.outstanding += balance;
      account.bills.push({
        billNo: billNo,
        date: date,
        expectedDate: expectedDate,
        amount: amount,
        balance: balance
      });
    });
  }

  // Cash in advance stays on the CustomerLedger sheet.
  const ledger = getCustomerLedgerSheet_(false);
  if (ledger && ledger.getLastRow() >= 2) {
    ledger.getRange(2, 2, ledger.getLastRow() - 1, 5).getValues().forEach(row => { // B:F
      const key = customerKey_(row[0]);
      if (String(row[2] || "").trim() === "Applied to Bill") return; // Ignore legacy auto-application rows.
      if (accounts[key]) accounts[key].cashAdvance += safeSheetNumber(row[4]);
    });
  }

  const customers = order.map(key => {
    const account = accounts[key];
    account.outstanding = Math.round(Math.max(0, account.outstanding) * 100) / 100;
    account.cashAdvance = Math.round(Math.max(0, account.cashAdvance) * 100) / 100;
    account.bills.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return account;
  });

  return jsonResponse({
    success: true,
    customers: customers
  });
}

function saveCustomerAccountPayment(payment) {
  payment = payment || {};

  const customer = String(payment.customer || "").trim();
  const paymentDate = String(payment.paymentDate || "").trim();
  const method = String(payment.paymentMethod || "").trim();
  const referenceNo = String(payment.referenceNo || "").trim();
  const amount = safeSheetNumber(payment.amount);
  const addedBy = String(payment.addedBy || "Unknown").trim();
  const remark = String(payment.remark || "").trim();

  if (!customer || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || amount <= 0) {
    return jsonResponse({
      success: false,
      message: "Customer, payment date and a valid amount are required."
    });
  }

  if (method !== "Cash" && method !== "Bank Transfer") {
    return jsonResponse({
      success: false,
      message: "Payment method must be Cash or Bank Transfer."
    });
  }

  const customersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Customers");
  const allowed = customersSheet
    ? getFirstColumnValues(customersSheet).some(name => customerKey_(name) === customerKey_(customer))
    : false;
  if (!allowed || customerKey_(customer) === "imo plant") {
    return jsonResponse({
      success: false,
      message: "Select a valid customer from the Customers sheet."
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (_) {
    return jsonResponse({
      success: false,
      message: "System is busy saving another payment. Please try again."
    });
  }

  try {
    const sheet = getCustomerLedgerSheet_(true);
    writeFirstBlankRow_(sheet, [
      new Date(),
      customer,
      paymentDate,
      "Cash in Advance",
      referenceNo,
      amount,
      addedBy,
      remark
    ], 1);

    return jsonResponse({
      success: true,
      message: "Customer payment saved successfully.",
      cashAdvance: getCustomerAdvanceAmount_(customer)
    });
  } finally {
    lock.releaseLock();
  }
}

function getCustomerAdvanceAmount_(customerName) {
  const sheet = getCustomerLedgerSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const target = customerKey_(customerName);
  const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 5).getValues(); // B:F

  return Math.max(0, rows.reduce((sum, row) => {
    if (customerKey_(row[0]) !== target) return sum;
    if (String(row[2] || "").trim() === "Applied to Bill") return sum; // Ignore legacy rows.
    return sum + safeSheetNumber(row[4]); // F: Amount
  }, 0));
}

function saveBillPayment(payment) {
  payment = payment || {};

  const billNo = String(payment.billNo || "").trim();
  const paymentDate = String(payment.paymentDate || "").trim();
  const addedBy = String(payment.addedBy || "Unknown").trim();
  const editRow = Number(payment.editRow) || 0;
  const useCashAdvance = payment.useCashAdvance === true || String(payment.useCashAdvance || "").toLowerCase() === "true";
  const rawPayments = Array.isArray(payment.payments) && payment.payments.length
    ? payment.payments
    : [payment];
  const payments = rawPayments
    .map(item => ({
      paymentMethod: String(item.paymentMethod || "").trim(),
      receiptNo: String(item.receiptNo || "").trim(),
      paymentAmount: safeSheetNumber(item.paymentAmount)
    }))
    .filter(item => item.paymentAmount > 0);
  const totalPayment = payments.reduce((sum, item) => sum + item.paymentAmount, 0);

  if (!billNo || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || (!payments.length && !useCashAdvance)) {
    return jsonResponse({
      success: false,
      message: "Bill No, payment date and a valid payment amount are required."
    });
  }

  if (editRow && payments.length !== 1) {
    return jsonResponse({
      success: false,
      message: "Use one payment line when editing a payment."
    });
  }

  if (payments.some(item => item.paymentMethod !== "Cash" && item.paymentMethod !== "Bank Transfer")) {
    return jsonResponse({
      success: false,
      message: "Payment method must be Cash or Bank Transfer."
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (_) {
    return jsonResponse({
      success: false,
      message: "System is busy saving another payment. Please try again."
    });
  }

  try {
    const bill = getBillPaymentBill_(billNo);
    if (!bill) {
      return jsonResponse({
        success: false,
        message: "Bill No was not found in CatchingBreakdown column I."
      });
    }

    const sheet = getBillPaymentSheet_(true);
    let oldRow = null;

    if (editRow) {
      if (!Number.isInteger(editRow) || editRow < 2 || editRow > sheet.getLastRow()) {
        return jsonResponse({
          success: false,
          message: "The payment row to edit could not be found. Search the bill again."
        });
      }

      oldRow = sheet.getRange(editRow, 1, 1, 17).getValues()[0];
      if (customerKey_(oldRow[1]) !== customerKey_(bill.billNo)) {
        return jsonResponse({
          success: false,
          message: "The selected payment does not belong to this bill. Search the bill again."
        });
      }
      if (String(oldRow[11] || "").trim().startsWith("Cash in Advance")) {
        return jsonResponse({
          success: false,
          message: "Cash in Advance application rows cannot be edited here."
        });
      }
    }

    const paidBefore = getBillPaymentsPaid_(bill.billNo, editRow || 0);
    const billBalanceBefore = Math.max(0, bill.totalAmount - paidBefore);
    const customerAdvance = !editRow && useCashAdvance ? getCustomerAdvanceAmount_(bill.customer) : 0;
    const advanceApplied = Math.min(customerAdvance, Math.max(0, billBalanceBefore - totalPayment));

    if (totalPayment <= 0 && advanceApplied <= 0) {
      return jsonResponse({
        success: false,
        message: "Enter a payment amount or use an available Cash in Advance balance."
      });
    }

    if (totalPayment + advanceApplied > billBalanceBefore + 0.000001) {
      return jsonResponse({
        success: false,
        message: "Payment exceeds the remaining bill balance."
      });
    }

    if (!editRow && advanceApplied > 0) {
      const ledger = getCustomerLedgerSheet_(true);
      writeFirstBlankRow_(ledger, [
        new Date(), bill.customer, paymentDate, "Applied to Payment", bill.billNo,
        -advanceApplied, addedBy, "Customer advance reduced by payment amount"
      ], 1);
    }

    const remaining = Math.max(
      0,
      Math.round((billBalanceBefore - totalPayment - advanceApplied) * 100) / 100
    );

    if (editRow) {
      const item = payments[0];
      const values = [
        oldRow[0], bill.billNo, bill.date, bill.expectedDate, bill.farmer,
        bill.batch, bill.customer, bill.totalNob, bill.totalWeight,
        bill.totalPrice, bill.totalAmount, item.paymentMethod, item.receiptNo,
        item.paymentAmount, remaining, addedBy, paymentDate
      ];
      sheet.getRange(editRow, 1, 1, values.length).setValues([values]);
    } else {
      let paidInThisSave = advanceApplied;
      if (advanceApplied > 0) {
        writeFirstBlankRow_(sheet, [
          new Date(), bill.billNo, bill.date, bill.expectedDate, bill.farmer,
          bill.batch, bill.customer, bill.totalNob, bill.totalWeight,
          bill.totalPrice, bill.totalAmount, "Cash in Advance Applied", "Advance", advanceApplied,
          Math.max(0, Math.round((billBalanceBefore - advanceApplied) * 100) / 100), addedBy, paymentDate
        ], 1);
      }
      payments.forEach(item => {
        paidInThisSave += item.paymentAmount;
        const rowBalance = Math.max(
          0,
          Math.round((billBalanceBefore - paidInThisSave) * 100) / 100
        );
        writeFirstBlankRow_(sheet, [
          new Date(), bill.billNo, bill.date, bill.expectedDate, bill.farmer,
          bill.batch, bill.customer, bill.totalNob, bill.totalWeight,
          bill.totalPrice, bill.totalAmount, item.paymentMethod, item.receiptNo,
          item.paymentAmount, rowBalance, addedBy, paymentDate
        ], 1);
      });
    }

    const finalBalance = recalculateBillPaymentBalances_(sheet, bill.billNo, bill.totalAmount);
    return jsonResponse({
      success: true,
      message: editRow ? "Payment updated successfully." : "Payments saved successfully.",
      balance: finalBalance,
      advanceApplied: advanceApplied,
      updated: Boolean(editRow),
      savedRows: payments.length + (advanceApplied > 0 ? 1 : 0)
    });
  } finally {
    lock.releaseLock();
  }
}

function friendlyErrorMessage_(error) {
  const raw = String(error && error.message ? error.message : error || "");
  if (/spreadsheet service|පැතුරුම්පත් සේවාව|document.*id/i.test(raw)) {
    return "Failed to access the spreadsheet. Please check the spreadsheet ID and Google Sheet permissions.";
  }
  return raw || "Unexpected server error.";
}


// =====================================================
// JSON RESPONSE
// =====================================================

function jsonResponse(data) {

  if (
    data &&
    Array.isArray(data.data) &&
    data.data.length > 0 &&
    Object.prototype.hasOwnProperty.call(data.data[0], "date")
  ) {

    data.data.sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || ""))
    );

  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// =====================================================
// GENERIC REPORT CACHE WRAPPER
// Builds the report once, then serves the gzipped JSON
// from CacheService until a save clears it.
// =====================================================

function cachedReport_(key, builderFn) {

  const cached = cacheGetBig_(key);

  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const out = builderFn();
  const str = out.getContent();

  if (str.indexOf('"success":true') !== -1) {
    cachePutBig_(key, str, 600); // 10 min (also rebuilt by keepWarm)
  }

  return out;
}


// =====================================================
// OPERATIONS SUMMARY REPORT
// Masterdata + BirdCondition
// =====================================================

function getOperationsReportData() {
  return cachedReport_("rpt_operations_" + CACHE_VERSION_, buildOperationsReportData_);
}

function buildOperationsReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const masterSheet = ss.getSheetByName("Masterdata");
  const conditionSheet = ss.getSheetByName("BirdCondition");

  if (!masterSheet) {
    return jsonResponse({
      success: false,
      message: "Masterdata sheet not found."
    });
  }

  const masterValues = masterSheet.getDataRange().getValues();

  const conditionValues =
    conditionSheet
      ? conditionSheet.getDataRange().getValues()
      : [];

  const conditionMap = {};

  // BirdCondition lookup: A Date, B Farmer, C Batch No 2,
  // G/I/K Reasons, M Total (rejection) Weight.

  for (let i = 1; i < conditionValues.length; i++) {

    const row = conditionValues[i];

    const date = formatSheetDate(row[0]);
    const farmer = String(row[1] || "").trim();
    const batch2 = String(row[2] || "").trim();

    const key = createReportKey(date, farmer, batch2);

    const reasonList =
      [row[6], row[8], row[10]]
        .map(r => String(r || "").trim())
        .filter(r => r !== "");

    conditionMap[key] = {
      rejectionWeight: row[12] || 0,
      reason: reasonList.join(", ")
    };

  }

  const reportData = [];

  for (let i = 1; i < masterValues.length; i++) {

    const row = masterValues[i];

    // Skip completely empty rows

    if (
      row.every(cell =>
        cell === "" ||
        cell === null
      )
    ) {
      continue;
    }

    const date = formatSheetDate(row[1]);
    const farmer = String(row[3] || "").trim();
    const batch = String(row[5] || "").trim();
    const batch2 = String(row[7] || "").trim();

    // Bird Condition page uses Batch No 2.
    // First try Batch No 2.
    // If blank, try normal Batch No.

    let condition = null;

    if (batch2) {
      condition =
        conditionMap[
          createReportKey(date, farmer, batch2)
        ] || null;
    }

    if (!condition && batch) {
      condition =
        conditionMap[
          createReportKey(date, farmer, batch)
        ] || null;
    }

    // Original Masterdata weight

    const originalWeight = safeSheetNumber(row[9]);

    // Recalculate: original weight - rejection weight
    // (Rejection Weight is always fresh; never trust
    // a stored Final Weight column.)

    const rejectionWeight =
      condition
        ? safeSheetNumber(condition.rejectionWeight)
        : 0;

    const nob = safeSheetNumber(row[8]);
    const price = safeSheetNumber(row[10]);

    const metrics =
      calculateReportMetrics(
        originalWeight,
        rejectionWeight,
        nob,
        price
      );

    const finalWeight = metrics.finalWeight;
    const newAvgWeight = metrics.avgWeight;
    const newAmount = metrics.amount;

    reportData.push({

      serial_no: String(row[0] || ""),
      date: date,
      type: String(row[2] || ""),
      farmer: farmer,
      cage: String(row[4] || ""),
      batch: batch,
      customer: String(row[6] || ""),
      nob: nob,
      weight: finalWeight,
      price: price,
      bill: String(row[11] || ""),
      amount: newAmount,
      avg_weight: newAvgWeight,
      rejection_weight: rejectionWeight,
      reason:
        condition
          ? String(condition.reason || "")
          : ""

    });

  }

  return jsonResponse({
    success: true,
    data: reportData
  });
}


// =====================================================
// REPORT KEY
// =====================================================

function createReportKey(date, farmer, batch) {

  return [
    String(date || "").trim(),
    String(farmer || "")
      .trim()
      .toLowerCase(),
    String(batch || "")
      .trim()
      .toLowerCase()
  ].join("|");

}


// =====================================================
// SAFE NUMBER
// =====================================================

function safeSheetNumber(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number =
    Number(
      String(value)
        .replace(/,/g, "")
        .trim()
    );

  return Number.isFinite(number)
    ? number
    : 0;

}


// =====================================================
// COMMON REPORT CALCULATION HELPER
// Keeps report formulas in one place.
// =====================================================

function calculateReportMetrics(originalWeight, rejectionWeight, nob, price) {

  const finalWeight = Math.max(
    0,
    originalWeight - rejectionWeight
  );

  const avgWeight = nob > 0
    ? finalWeight / nob
    : 0;

  const amount = finalWeight * price;

  return {
    finalWeight: finalWeight,
    avgWeight: avgWeight,
    amount: amount
  };
}


// =====================================================
// FORMAT GOOGLE SHEET DATE
// =====================================================

function formatSheetDate(value) {

  if (!value) {
    return "";
  }

  // Actual Google Sheets date

  if (
    Object.prototype.toString.call(value)
      === "[object Date]"
  ) {

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  }

  const text = String(value).trim();

  // Already yyyy-mm-dd

  if (
    /^\d{4}-\d{2}-\d{2}/.test(text)
  ) {

    return text.substring(0, 10);

  }

  return text;

}


// =====================================================
// BIRD CONDITION ANALYSIS REPORT
// =====================================================

function getBirdConditionReportData() {
  return cachedReport_("rpt_birdCondition_" + CACHE_VERSION_, buildBirdConditionReportData_);
}

function buildBirdConditionReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conditionSheet = ss.getSheetByName("BirdCondition");
  const masterSheet = ss.getSheetByName("Masterdata");

  if (!conditionSheet) {
    return jsonResponse({
      success: false,
      message: "BirdCondition sheet not found."
    });
  }

  const masterMap = {};
  const masterDateBatchMap = {};

  if (masterSheet && masterSheet.getLastRow() > 1) {

    const masterValues = masterSheet.getDataRange().getValues();
    const masterHeaders = masterValues[0].map(h => String(h || "").trim());

    // Accommodate both the legacy headers and the current saved layout.
    const dateColumn = findColumnByNames(masterHeaders, ["Date"], 1);
    const farmerColumn = findColumnByNames(masterHeaders, ["Farmer Name", "Farmer"], 3);
    const batchColumn = findColumnByNames(masterHeaders, ["Batch No 2", "Batch2", "Batch No", "Batch"], 5);
    const nobColumn = findColumnByNames(masterHeaders, ["NOB", "No of Birds"], 8);
    const weightColumn = findColumnByNames(masterHeaders, ["Total Weight", "Weight"], 9);
    const averageColumn = findColumnByNames(masterHeaders, ["Avg Weight", "Average Weight"], 13);

    for (let i = 1; i < masterValues.length; i++) {

      const row = masterValues[i];
      const date = formatSheetDate(row[dateColumn]);
      const farmer = String(row[farmerColumn] || "").trim().toLowerCase();
      const batch = String(row[batchColumn] || "").trim().toLowerCase();

      if (!date || !batch) continue;

      const master = {
        nob: row[nobColumn],
        weight: row[weightColumn],
        avgWeight: row[averageColumn]
      };

      masterMap[`${date}|||${farmer}|||${batch}`] = master;
      masterDateBatchMap[`${date}|||${batch}`] = master;

    }

  }

  const values = conditionSheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (row.every(cell => cell === "" || cell === null)) continue;

    const date = formatSheetDate(row[0]);
    const farmer = String(row[1] || "").trim();
    const batch2 = String(row[2] || "").trim();

    const reasonPairs = [
      { reason: String(row[6] || "").trim(), weight: safeSheetNumber(row[7]) },
      { reason: String(row[8] || "").trim(), weight: safeSheetNumber(row[9]) },
      { reason: String(row[10] || "").trim(), weight: safeSheetNumber(row[11]) }
    ].filter(pair => pair.reason !== "");

    const rejectionTotalWeight = safeSheetNumber(row[12]);

    const master =
      masterMap[`${date}|||${farmer.toLowerCase()}|||${batch2.toLowerCase()}`] ||
      masterDateBatchMap[`${date}|||${batch2.toLowerCase()}`] ||
      null;

    // D:F are a fallback for records created under the older form layout.
    let nob = safeSheetNumber(row[3]);
    let weight = safeSheetNumber(row[4]);
    let avgWeight = safeSheetNumber(row[5]);

    if (master) {
      nob = safeSheetNumber(master.nob);
      weight = safeSheetNumber(master.weight);
      avgWeight = safeSheetNumber(master.avgWeight);
    }

    if (!avgWeight && nob > 0) avgWeight = weight / nob;

    const finalWeight = Math.max(0, weight - rejectionTotalWeight);
    const reason = reasonPairs.map(pair => pair.reason).join(", ");

    data.push({
      date: date,
      farmer: farmer,
      batch2: batch2,
      nob: nob,
      weight: weight.toFixed(2),
      avg_weight: avgWeight.toFixed(3),
      // The two report pages expect these legacy field names.
      reason: reason,
      rejection_weight: rejectionTotalWeight,
      reasons: reasonPairs,
      rejection_total_weight: rejectionTotalWeight,
      final_weight: finalWeight.toFixed(2)
    });

  }

  return jsonResponse({
    success: true,
    data: data
  });

}


function findColumnByNames(headers, acceptedNames, fallbackIndex) {

  const normalized = headers.map(header =>
    String(header || "").trim().toLowerCase()
  );

  for (let i = 0; i < acceptedNames.length; i++) {
    const column = normalized.indexOf(
      String(acceptedNames[i]).trim().toLowerCase()
    );

    if (column !== -1) return column;
  }

  return fallbackIndex;
}


// =====================================================
// ADD FARMER
// =====================================================

function addFarmer(type, name) {

  const cleanType = String(type || "").trim();
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return jsonResponse({
      success: false,
      message: "Farmer name is required."
    });
  }

  if (
    cleanType !== "Ownfarm" &&
    cleanType !== "Buyback" &&
    cleanType !== "Direct Purchase"
  ) {
    return jsonResponse({
      success: false,
      message: "Invalid farmer type."
    });
  }

  // Dropdown value "Direct Purchase" maps to the
  // actual sheet named "Direct purchase".

  const sheetNameMap = {
    "Ownfarm": "Ownfarm",
    "Buyback": "Buyback",
    "Direct Purchase": "Direct purchase"
  };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetNameMap[cleanType]);

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: `${sheetNameMap[cleanType]} sheet not found.`
    });
  }

  const existing =
    getFirstColumnValues(sheet)
      .map(value =>
        String(value)
          .trim()
          .toLowerCase()
      );

  if (existing.includes(cleanName.toLowerCase())) {
    return jsonResponse({
      success: false,
      message: "This farmer already exists."
    });
  }

  writeFirstBlankRow_(sheet, [cleanName], 1);

  CacheService.getScriptCache().remove("list_" + sheet.getName());

  return jsonResponse({
    success: true,
    message: "Farmer added successfully."
  });

}


// =====================================================
// ADD CUSTOMER
// =====================================================

function addCustomer(name) {

  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return jsonResponse({
      success: false,
      message: "Customer name is required."
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Customers");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Customers sheet not found."
    });
  }

  const existing =
    getFirstColumnValues(sheet)
      .map(value =>
        String(value)
          .trim()
          .toLowerCase()
      );

  if (existing.includes(cleanName.toLowerCase())) {
    return jsonResponse({
      success: false,
      message: "This customer already exists."
    });
  }

  writeFirstBlankRow_(sheet, [cleanName], 1);

  CacheService.getScriptCache().remove("list_" + sheet.getName());

  return jsonResponse({
    success: true,
    message: "Customer added successfully."
  });

}


// =====================================================
// USER 2 DASHBOARD LISTS
// =====================================================

function getUser2DashboardLists() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const vehicleSheet = ss.getSheetByName("Vehicles");
  const driverSheet = ss.getSheetByName("Drivers");
  const helperSheet = ss.getSheetByName("Helpers");

  return jsonResponse({
    success: true,
    vehicles: getFirstColumnValues(vehicleSheet),
    drivers: getFirstColumnValues(driverSheet),
    helpers: getFirstColumnValues(helperSheet)
  });

}


// =====================================================
// SAVE USER 2 DAILY ENTRY
// =====================================================

function saveUser2DailyEntry(payload) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PlantDailyBirds");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "PlantDailyBirds sheet not found."
    });
  }

  if (
    !payload ||
    !Array.isArray(payload.batches) ||
    payload.batches.length === 0
  ) {
    return jsonResponse({
      success: false,
      message: "No batch data found."
    });
  }

  const tripSerial = getNextTripSerialJS(sheet, payload.date);

  const vehicleTripNo =
    getNextVehicleTripNoJS(sheet, payload.date, payload.vehicle);

  const rows = [];

  payload.batches.forEach(batch => {

    rows.push([
      payload.date || "",
      String(tripSerial),
      String(vehicleTripNo),
      payload.vehicle || "-",
      payload.driver || "-",
      payload.helpers || "-",
      (batch.doa !== undefined && batch.doa !== "" ? batch.doa : (payload.doa || "0")),
      payload.outTime || "-",
      payload.inTime || "-",
      payload.totalTripTime || "00:00:00",
      batch.batchNo || "-",
      batch.location || "-",
      batch.age || "0",
      batch.expectedAvg || "0",
      batch.orderBirds || "0",
      batch.availableBirds || "0",
      batch.avgWeight || "0.000",
      batch.weight || "0.00",
      batch.weightDiff || "0.00",
      payload.addedBy || "Unknown",
      getTimestamp()
    ]);

  });

  writeFirstBlankRows_(sheet, rows, 1);

  return jsonResponse({
    success: true,
    message: "Trip saved successfully.",
    tripSerial: tripSerial,
    vehicleTripNo: vehicleTripNo
  });

}


// =====================================================
// NEXT TRIP SERIAL
// =====================================================

function getNextTripSerialJS(sheet, dateValue) {

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values =
    sheet
      .getRange(2, 1, lastRow - 1, 2)
      .getValues();

  let maxSerial = 0;

  values.forEach(row => {

    const rowDate = formatSheetDate(row[0]);
    const serial = safeSheetNumber(row[1]);

    if (
      rowDate === dateValue &&
      serial > maxSerial
    ) {
      maxSerial = serial;
    }

  });

  return maxSerial + 1;

}


// =====================================================
// NEXT VEHICLE TRIP NO
// =====================================================

function getNextVehicleTripNoJS(sheet, dateValue, vehicle) {

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values =
    sheet
      .getRange(2, 1, lastRow - 1, 4)
      .getValues();

  let maxTrip = 0;

  values.forEach(row => {

    const rowDate = formatSheetDate(row[0]);
    const tripNo = safeSheetNumber(row[2]);
    const rowVehicle =
      String(row[3] || "")
        .trim()
        .toLowerCase();

    if (
      rowDate === dateValue &&
      rowVehicle ===
        String(vehicle || "")
          .trim()
          .toLowerCase() &&
      tripNo > maxTrip
    ) {
      maxTrip = tripNo;
    }

  });

  return maxTrip + 1;

}


// =====================================================
// VEHICLE EXPENSE - VEHICLE LIST
// =====================================================

function getVehicleExpenseLists() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vehicleSheet = ss.getSheetByName("Vehicles");

  return jsonResponse({
    success: true,
    vehicles: getFirstColumnValues(vehicleSheet)
  });

}


// =====================================================
// SAVE VEHICLE EXPENSE
// =====================================================

function saveVehicleExpense(record) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("VehicleExpenses");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "VehicleExpenses sheet not found."
    });
  }

  const row = [
    record.date || "",
    record.vehicle || "",
    record.tea || "0.00",
    record.meal || "0.00",
    record.total || "0.00",
    record.addedBy || "Unknown",
    getTimestamp()
  ];

  writeFirstBlankRow_(sheet, row, 1);

  return jsonResponse({
    success: true,
    message: "Vehicle expense saved successfully."
  });

}


// =====================================================
// PLANT DAILY BIRDS REPORT
// =====================================================

function getPlantDailyReportData() {
  return cachedReport_("rpt_plantDaily_" + CACHE_VERSION_, buildPlantDailyReportData_);
}

function buildPlantDailyReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PlantDailyBirds");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "PlantDailyBirds sheet not found."
    });
  }

  const values = sheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (
      row.every(cell =>
        cell === "" ||
        cell === null
      )
    ) {
      continue;
    }

    data.push({

      date: formatSheetDate(row[0]),
      s_no: String(row[1] || ""),
      trip_no: String(row[2] || ""),
      vehicle: String(row[3] || ""),
      driver: String(row[4] || ""),
      helpers: String(row[5] || ""),
      doa: safeSheetNumber(row[6]),
      out_time: String(row[7] || ""),
      in_time: String(row[8] || ""),
      total_time: String(row[9] || ""),
      batch_no: String(row[10] || ""),
      location: String(row[11] || ""),
      age: safeSheetNumber(row[12]),
      expected_avg: safeSheetNumber(row[13]),
      order_birds: safeSheetNumber(row[14]),
      available_birds: safeSheetNumber(row[15]),
      avg_weight: safeSheetNumber(row[16]),
      weight: safeSheetNumber(row[17]),
      weight_diff: safeSheetNumber(row[18])

    });

  }

  return jsonResponse({
    success: true,
    data: data
  });

}


// =====================================================
// VEHICLE EXPENSES REPORT
// =====================================================

function getVehicleExpensesReportData() {
  return cachedReport_("rpt_vehicleExpenses_" + CACHE_VERSION_, buildVehicleExpensesReportData_);
}

function buildVehicleExpensesReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("VehicleExpenses");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "VehicleExpenses sheet not found."
    });
  }

  const values = sheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (
      row.every(cell =>
        cell === "" ||
        cell === null
      )
    ) {
      continue;
    }

    data.push({

      date: formatSheetDate(row[0]),
      vehicle: String(row[1] || ""),
      tea: safeSheetNumber(row[2]),
      meal: safeSheetNumber(row[3]),
      total: safeSheetNumber(row[4])

    });

  }

  return jsonResponse({
    success: true,
    data: data
  });

}


// =====================================================
// USER 2 - ADD MASTER DATA
// =====================================================

function addUser2MasterItem(type, value) {

  const cleanType = String(type || "").trim();
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return jsonResponse({
      success: false,
      message: "Value is required."
    });
  }

  // Only allow these sheets

  const allowedSheets = [
    "Drivers",
    "Helpers",
    "Vehicles"
  ];

  if (!allowedSheets.includes(cleanType)) {
    return jsonResponse({
      success: false,
      message: "Invalid master data type."
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(cleanType);

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: `${cleanType} sheet not found.`
    });
  }

  const existingValues =
    getFirstColumnValues(sheet)
      .map(item =>
        String(item || "")
          .trim()
          .toLowerCase()
      );

  if (existingValues.includes(cleanValue.toLowerCase())) {
    return jsonResponse({
      success: false,
      message: `${cleanValue} already exists in ${cleanType}.`
    });
  }

  writeFirstBlankRow_(sheet, [cleanValue], 1);

  CacheService.getScriptCache().remove("list_" + sheet.getName());

  return jsonResponse({
    success: true,
    message: `${cleanValue} added successfully.`
  });

}


// =====================================================
// USER 3 - SAVE BUYBACK CATCHING PLAN
// =====================================================

function saveUser3CatchingPlan(rows) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("BuybackCatching");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "BuybackCatching sheet not found."
    });
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return jsonResponse({
      success: false,
      message: "No catching plan data found."
    });
  }

  const values =
    rows.map(row => [

      row.date || "",
      row.buyback || "0",
      row.location || "-",
      row.cageNo || "",
      row.qty || "0",
      row.size || "",
      row.imoPlant || "0",
      row.remark || "",
      row.addedBy || "Unknown",
      getTimestamp()

    ]);

  writeFirstBlankRows_(sheet, values, 1);

  return jsonResponse({
    success: true,
    message: "Buyback catching plan saved successfully."
  });

}


// =====================================================
// USER 3 - BUYBACK CATCHING REPORT
// =====================================================

function getUser3ReportData() {
  return cachedReport_("rpt_user3_" + CACHE_VERSION_, buildUser3ReportData_);
}

function buildUser3ReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("BuybackCatching");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "BuybackCatching sheet not found."
    });
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (
      row.every(cell =>
        cell === "" ||
        cell === null
      )
    ) {
      continue;
    }

    data.push({

      date: formatSheetDate(row[0]),
      buyback: safeSheetNumber(row[1]),
      location: String(row[2] || ""),
      cage_no: String(row[3] || ""),
      qty: safeSheetNumber(row[4]),
      size: String(row[5] || ""),
      imo_plant: safeSheetNumber(row[6]),
      remark: String(row[7] || "")

    });

  }

  return jsonResponse({
    success: true,
    data: data
  });

}


// =====================================================
// COMMON DEFECT / MANAGEMENT ANALYTICS DATA
// Used by: admin analytics, Own Farm / IMO Plant / Other Plants
// reports, Forecast vs Actual (daily + monthly).
//
// Built from CatchingBreakdown (User 1's Bird Quality status
// report base), so admin reports show the SAME amounts User 1 sees.
//
// Match: Date(B)+Farmer(D)+Load No(H) with
// BirdCondition Date(A)+Farmer(B)+Batch No 2(C).
// Reason = BirdCondition G (+ I, K). Rejection = M.
//
// RESPONSE SCHEMA:
//   weight   = healthy + disable, rejection ALREADY subtracted
//   amount   = healthy_amount + disable_amount
//   avg_weight = final weight / NOB
//   rejection_weight = "-" or number-string
//   price    = "-" when no healthy price (0)
// =====================================================

function getDefectReportData() {
  return cachedReport_("rpt_defect_" + CACHE_VERSION_, buildDefectReportData_);
}

function buildDefectReportData_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const breakdownSheet = ss.getSheetByName("CatchingBreakdown");
  const conditionSheet = ss.getSheetByName("BirdCondition");

  if (!breakdownSheet) {
    return jsonResponse({
      success: false,
      message: "CatchingBreakdown sheet not found."
    });
  }

  const values = breakdownSheet.getDataRange().getValues();

  if (values.length <= 1) {
    return jsonResponse({ success: true, data: [] });
  }

  // Bird Condition lookup (rejection reason + weight).
  // Sums M across multiple BirdCondition rows with the
  // same key, and joins reasons.

  const rejectionMap = {};

  if (conditionSheet) {

    const conditionValues = conditionSheet.getDataRange().getValues();

    if (conditionValues.length > 1) {

      for (let i = 1; i < conditionValues.length; i++) {

        const row = conditionValues[i];

        const date = formatSheetDate(row[0]);        // A
        const farmer = String(row[1] || "").trim();   // B
        const batch2 = String(row[2] || "").trim();   // C

        if (!date && !batch2) continue;

        const key = createReportKey(date, farmer, batch2);

        const reasonList = [row[6], row[8], row[10]]
          .map(r => String(r || "").trim())
          .filter(r => r !== "");

        if (!rejectionMap[key]) {
          rejectionMap[key] = { weight: 0, reason: "" };
        }

        rejectionMap[key].weight += safeSheetNumber(row[12]); // M Total Weight

        if (reasonList.length) {
          rejectionMap[key].reason +=
            (rejectionMap[key].reason ? ", " : "") + reasonList.join(", ");
        }

      }

    }

  }

  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (row.every(cell => cell === "" || cell === null)) continue;

    const date = formatSheetDate(row[1]);                 // B Date
    const farmer = String(row[3] || "").trim();            // D Farmer Name
    const loadNo = String(row[7] || "").trim();            // H Load No

    const rejKey = createReportKey(date, farmer, loadNo);
    const rej = rejectionMap[rejKey] || { weight: 0, reason: "" };

    const rejectionWeight = rej.weight;
    const reasonText = String(rej.reason || "").trim();

    const disableNob = safeSheetNumber(row[9]);           // J
    const disableWeight = safeSheetNumber(row[10]);       // K
    const disableAmount = safeSheetNumber(row[13]);       // N

    const healthyNob = safeSheetNumber(row[14]);          // O
    const originalHealthyWeight = safeSheetNumber(row[15]); // P
    const healthyPrice = safeSheetNumber(row[17]);        // R

    // Final healthy weight - rejection already applied,
    // never below zero (same as the Catching Breakdown report).
    const healthyWeight = Math.max(0, originalHealthyWeight - rejectionWeight);
    const healthyAmount = healthyWeight * healthyPrice;

    // Totals across disable + healthy
    const totalNob = disableNob + healthyNob;
    const finalWeight = disableWeight + healthyWeight;
    const totalAmount = disableAmount + healthyAmount;

    const avgWeight = totalNob > 0 ? finalWeight / totalNob : 0;

    data.push({

      date: date,
      type: String(row[2] || ""),          // C Type
      farmer: farmer,
      cage: String(row[4] || ""),           // E Cage No
      batch: String(row[5] || ""),          // F Batch No
      customer: String(row[6] || ""),       // G Customer
      nob: String(totalNob || "0"),
      weight: finalWeight.toFixed(2),
      price: healthyPrice > 0 ? healthyPrice.toFixed(2) : "-",
      bill: String(row[8] || ""),           // I Bill No
      amount: totalAmount.toFixed(2),
      avg_weight: avgWeight.toFixed(3),
      rejection_weight:
        rejectionWeight > 0 ? rejectionWeight.toFixed(2) : "-",
      reason: reasonText ? reasonText : "-"

    });

  }

  return jsonResponse({ success: true, data: data });

}


// =====================================================
// CATCHING RECORD LOOKUP (Date + Farmer + Batch No 2)
// Used by Bird Condition & Defect form — display only
// =====================================================

function getCatchingRecordLookup(date, farmer, batch2) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("CatchingBreakdown");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "CatchingBreakdown sheet not found."
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({ success: true, found: false });
  }

  // A..V (22 columns) is enough: we need up to column V
  const values = sheet.getRange(2, 1, lastRow - 1, 22).getValues();

  const targetDate = String(date || "").trim();
  const targetFarmer = String(farmer || "").trim().toLowerCase();
  const targetLoad = String(batch2 || "").trim().toLowerCase();

  for (let i = 0; i < values.length; i++) {

    const row = values[i];

    const rowDate = formatSheetDate(row[1]);                     // B Date
    const rowFarmer = String(row[3] || "").trim().toLowerCase(); // D Farmer
    const rowLoad = String(row[7] || "").trim().toLowerCase();   // H Load No

    if (
      rowDate === targetDate &&
      rowFarmer === targetFarmer &&
      rowLoad === targetLoad
    ) {

      const nob = safeSheetNumber(row[19]);    // T Total NOB
      const weight = safeSheetNumber(row[20]); // U Total Weight

      let avgWeight = safeSheetNumber(row[21]); // V Total Avg Weight

      // V eka හිස් nam calculate karanawa
      if (!avgWeight && nob > 0) {
        avgWeight = weight / nob;
      }

      return jsonResponse({
        success: true,
        found: true,
        nob: nob,
        weight: weight.toFixed(2),
        avgWeight: avgWeight.toFixed(3)
      });

    }

  }

  return jsonResponse({
    success: true,
    found: false
  });

}


// =====================================================
// CATCHING BREAKDOWN REPORT (User 1)
// Sheet: CatchingBreakdown
// CACHED — this is the heaviest report.
// =====================================================

function getCatchingBreakdownData() {
  return cachedReport_("rpt_catchingBreakdown_" + CACHE_VERSION_, getCatchingBreakdownDataRaw_);
}

function getCatchingBreakdownDataRaw_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("CatchingBreakdown");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "CatchingBreakdown sheet not found."
    });
  }

  const values = sheet.getDataRange().getValues();

  const data = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (row.every(cell => cell === "" || cell === null)) {
      continue;
    }

    const disableNob = safeSheetNumber(row[9]);
    const disableWeight = safeSheetNumber(row[10]);
    const disableAmount = safeSheetNumber(row[13]);

    const healthyNob = safeSheetNumber(row[14]);
    const originalHealthyWeight = safeSheetNumber(row[15]);
    const healthyPrice = safeSheetNumber(row[17]);

    // Match: Date (B) + Farmer (D) + Load No (H)
    // with BirdCondition Date + Farmer + Batch No 2
    const rejKey = createReportKey(
      formatSheetDate(row[1]),
      String(row[3] || ""),
      String(row[7] || "")
    );

    const rej = getRejectionMap_()[rejKey] || { weight: 0, reason: "" };

    const rejectionWeight = rej.weight;

    // Healthy weight - rejection (0 ta wada adu wenne naha)
    const healthyWeight = Math.max(0, originalHealthyWeight - rejectionWeight);

    // Adu karapu weight × healthy price
    const healthyAmount = healthyWeight * healthyPrice;

    // Total = Disable + (adu karapu) Healthy
    const totalNob = disableNob + healthyNob;
    const totalWeight = disableWeight + healthyWeight;
    const totalAmount = disableAmount + healthyAmount;

    data.push({

      serial_no: String(row[0] || ""),
      date: formatSheetDate(row[1]),
      type: String(row[2] || ""),
      farmer: String(row[3] || ""),
      cage: String(row[4] || ""),
      batch: String(row[5] || ""),
      customer: String(row[6] || ""),
      // row[7] = Load No -> skip
      bill: String(row[8] || ""),
      disable_bill: String(row[25] || ""),

      disable_nob: disableNob,
      disable_weight: disableWeight,
      // row[11] = Disable Avg Weight -> skip
      disable_price: safeSheetNumber(row[12]),
      disable_amount: disableAmount,

      healthy_nob: healthyNob,
      healthy_weight: healthyWeight,
      healthy_original_weight: originalHealthyWeight,
      rejection_weight: rejectionWeight,
      rejection_reason: rej.reason,
      // row[16] = Healthy Avg Weight -> skip
      healthy_price: safeSheetNumber(row[17]),
      healthy_amount: healthyAmount,

      total_nob: totalNob,
      total_weight: totalWeight,
      total_avg_weight: safeSheetNumber(row[21]), // V - Total Avg Weight
      total_price: totalWeight > 0 ? totalAmount / totalWeight : 0,
      total_amount: totalAmount,

      added_by: String(row[24] || "")

    });

  }

  return jsonResponse({
    success: true,
    data: data
  });

}


// =====================================================
// TIMESTAMP HELPER
// =====================================================

function getTimestamp() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}


// =====================================================
// REJECTION LOOKUP FOR CATCHING BREAKDOWN REPORT
// Key = Date + Farmer + (BirdCondition Batch No 2 = Load No)
// =====================================================

let _rejectionMapCache = null;

function getRejectionMap_() {

  if (_rejectionMapCache) return _rejectionMapCache;

  const map = {};

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName("BirdCondition");

  if (sheet && sheet.getLastRow() > 1) {

    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      const date = formatSheetDate(row[0]); // A
      const farmer = String(row[1] || "");  // B
      const load = String(row[2] || "");    // C (Batch No 2)

      if (!date && !load) continue;

      const key = createReportKey(date, farmer, load);

      const reasons = [row[6], row[8], row[10]]
        .map(r => String(r || "").trim())
        .filter(r => r !== "");

      if (!map[key]) {
        map[key] = { weight: 0, reason: "" };
      }

      // Same key row godak thibunoth ekathu karanawa
      map[key].weight += safeSheetNumber(row[12]); // M Total Weight

      if (reasons.length) {
        map[key].reason +=
          (map[key].reason ? ", " : "") + reasons.join(", ");
      }

    }

  }

  _rejectionMapCache = map;
  return map;
}


// =====================================================
// KEEP WARM + PRE-BUILD REPORT CACHES
//
// IMPORTANT: In Apps Script, add a time-driven trigger:
//   Triggers > Add Trigger > keepWarm > Time-driven
//   > Every 5 minutes
// =====================================================

function keepWarm() {
  try {
    REPORT_CACHE_KEYS_.forEach(key => {
      if (!cacheGetBig_(key)) {
        buildReportCacheForKey_(key);
      }
    });
  } catch (e) {
    // Never throw — this runs on a timer.
  }
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, warm: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildReportCacheForKey_(key) {
  try {
    let out = null;

    if (key === "rpt_catchingBreakdown_" + CACHE_VERSION_) {
      out = getCatchingBreakdownDataRaw_();
    } else if (key === "rpt_operations_" + CACHE_VERSION_) {
      out = buildOperationsReportData_();
    } else if (key === "rpt_defect_" + CACHE_VERSION_) {
      out = buildDefectReportData_();
    } else if (key === "rpt_birdCondition_" + CACHE_VERSION_) {
      out = buildBirdConditionReportData_();
    } else if (key === "rpt_plantDaily_" + CACHE_VERSION_) {
      out = buildPlantDailyReportData_();
    } else if (key === "rpt_vehicleExpenses_" + CACHE_VERSION_) {
      out = buildVehicleExpensesReportData_();
    } else if (key === "rpt_user3_" + CACHE_VERSION_) {
      out = buildUser3ReportData_();
    }

    if (out) {
      const str = out.getContent();
      if (str.indexOf('"success":true') !== -1) {
        cachePutBig_(key, str, 600); // 10 min
      }
    }
  } catch (e) {
    // Ignore — rebuild happens on next request.
  }
}


// =====================================================
// BIG-JSON CACHE HELPERS
// (CacheService limit is 100KB per key, so gzip it)
// =====================================================

function cachePutBig_(key, str, seconds) {
  try {
    const gz = Utilities.gzip(Utilities.newBlob(str, "application/json"));
    const b64 = Utilities.base64Encode(gz.getBytes());
    if (b64.length < 95000) {
      CacheService.getScriptCache().put(key, b64, seconds);
    }
  } catch (e) {}
}

function cacheGetBig_(key) {
  try {
    const b64 = CacheService.getScriptCache().get(key);
    if (!b64) return null;
    const bytes = Utilities.base64Decode(b64);
    return Utilities.ungzip(
      Utilities.newBlob(bytes, "application/x-gzip")
    ).getDataAsString();
  } catch (e) { return null; }
}

// =====================================================
// CLEAR ALL REPORT CACHES
// Called automatically by doPost() after any
// save/add action, so reports always show fresh data.
// =====================================================

function clearReportCache_() {
  try {
    CacheService.getScriptCache().removeAll(REPORT_CACHE_KEYS_);
  } catch (e) {}
}

// Sheet eke edit / row insert / delete ekak unama cache clear karanawa
function onSheetChange_() {
  clearReportCache_();
  try {
    CacheService.getScriptCache().removeAll([
      "list_Ownfarm", "list_Buyback", "list_Direct purchase",
      "list_Customers", "list_Reasons",
      "list_Vehicles", "list_Drivers", "list_Helpers"
    ]);
  } catch (e) {}
}


// =====================================================
// KPI 1 - LIVE BIRD MORTALITY RATE
// Sheet: KPI1
//   Batch table   A:F -> Date, Vehicle No, DOA, Batch No, Avail Birds, Kpi1
//   Daily table   H:N -> YY, MMMM, Date, Batch Count, DOA, Birds, Kpi1
//   Monthly table P:U -> YY, MMMM, Batch No, DOA, Birds, Kpi1
// Mortality % = DOA / Birds * 100 (recalculated here so
// #DIV/0! rows never break it). Birds = Avail Birds.
// =====================================================

function getKpi1Data() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KPI1");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "KPI1 sheet not found."
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({ success: true, standard: 0.3, monthly: [], daily: [], batches: [] });
  }

  // A..V = 22 columns
  const values = sheet.getRange(2, 1, lastRow - 1, 22).getValues();

  const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const monthly = [];
  const daily = [];
  const batches = [];

  values.forEach(row => {

    // ---- Batch-wise table (A:F) ----
    const bDate = formatSheetDate(row[0]);           // A Date
    const bBirds = safeSheetNumber(row[4]);          // E Avail Birds

    if (/^\d{4}-\d{2}-\d{2}$/.test(bDate) && bBirds > 0) {

      const bDoa = safeSheetNumber(row[2]);          // C DOA

      batches.push({
        date: bDate,
        vehicle: String(row[1] || "").trim(),        // B Vehicle No
        doa: bDoa,
        batchNo: String(row[3] || "").trim(),        // D Batch No
        avail: bBirds,                               // E Avail Birds
        birds: bBirds,
        kpi: (bDoa / bBirds) * 100
      });
    }

    // ---- Daily table (H:N) ----
    const dDate = formatSheetDate(row[9]);           // J Date
    const dBirds = safeSheetNumber(row[12]);         // M Birds

    if (/^\d{4}-\d{2}-\d{2}$/.test(dDate) && dBirds > 0) {

      const dDoa = safeSheetNumber(row[11]);         // L DOA

      daily.push({
        date: dDate,
        batches: safeSheetNumber(row[10]),           // K Batch Count
        doa: dDoa,
        birds: dBirds,
        kpi: (dDoa / dBirds) * 100
      });
    }

    // ---- Monthly table (P:U) ----
    let yy = safeSheetNumber(row[15]);               // P YY
    if (yy > 0 && yy < 100) yy += 2000;

    const monthCell = row[16];                       // Q MMMM
    let monthIdx = -1;

    if (Object.prototype.toString.call(monthCell) === "[object Date]") {
      monthIdx = monthCell.getMonth();
    } else {
      const name = String(monthCell || "").trim().toLowerCase();
      if (name.length >= 3) {
        monthIdx = MONTHS.findIndex(m => m.slice(0, 3) === name.slice(0, 3));
      }
    }

    const mBirds = safeSheetNumber(row[19]);         // T Birds

    if (yy > 0 && monthIdx !== -1 && mBirds > 0) {

      const mDoa = safeSheetNumber(row[18]);         // S DOA

      monthly.push({
        month: yy + "-" + String(monthIdx + 1).padStart(2, "0"),
        batches: safeSheetNumber(row[17]),           // R Batch No
        doa: mDoa,
        birds: mBirds,
        kpi: (mDoa / mBirds) * 100
      });
    }

  });

  return jsonResponse({
    success: true,
    standard: 0.3,
    monthly: monthly,
    daily: daily,
    batches: batches
  });

}

// =====================================================
// KPI 2 - AVERAGE BIRD WEIGHT
// Sheet: KPI2
//   Batch table   A:G -> Date, DOA, Batch No, Avail Birds, Weight, NOB, Avg
//   Daily table   I:O -> YY, MMMM, Date, Batch Count, NOB, Weight, Avg
//   Monthly table R:W -> YY, MMMM, Batch Count, NOB, Weight, Avg
// Average = Weight / NOB. Achieved when 1.80 <= average <= 2.40 (kg).
// =====================================================

function getKpi2Data() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KPI2");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "KPI2 sheet not found."
    });
  }

  const KPI2_MIN = 1.8;
  const KPI2_MAX = 2.4;

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({
      success: true, min: KPI2_MIN, max: KPI2_MAX,
      monthly: [], daily: [], batches: []
    });
  }

  // A..W = 23 columns
  const values = sheet.getRange(2, 1, lastRow - 1, 23).getValues();

  const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const monthly = [];
  const daily = [];
  const batches = [];

  values.forEach(row => {

    // ---- Batch table (A:G) ----
    const bDate = formatSheetDate(row[0]);           // A Date
    const bNob = safeSheetNumber(row[5]);            // F NOB

    if (/^\d{4}-\d{2}-\d{2}$/.test(bDate) && bNob > 0) {

      const bWeight = safeSheetNumber(row[4]);       // E Weight

      batches.push({
        date: bDate,
        batchNo: String(row[2] || "").trim(),        // C Batch No
        customer: "",                                // (column removed from sheet)
        doa: safeSheetNumber(row[1]),                // B DOA
        avail: safeSheetNumber(row[3]),              // D Avail Birds
        nob: bNob,
        weight: bWeight,
        avg: bWeight / bNob
      });
    }

    // ---- Daily table (I:O) ----
    const dDate = formatSheetDate(row[10]);          // K Date
    const dNob = safeSheetNumber(row[12]);           // M NOB

    if (/^\d{4}-\d{2}-\d{2}$/.test(dDate) && dNob > 0) {

      const dWeight = safeSheetNumber(row[13]);      // N Weight

      daily.push({
        date: dDate,
        batches: safeSheetNumber(row[11]),           // L Batch Count
        nob: dNob,
        weight: dWeight,
        avg: dWeight / dNob
      });
    }

    // ---- Monthly table (R:W) ----
    let yy = safeSheetNumber(row[17]);               // R YY
    if (yy > 0 && yy < 100) yy += 2000;

    const monthCell = row[18];                       // S MMMM
    let monthIdx = -1;

    if (Object.prototype.toString.call(monthCell) === "[object Date]") {
      monthIdx = monthCell.getMonth();
    } else {
      const name = String(monthCell || "").trim().toLowerCase();
      if (name.length >= 3) {
        monthIdx = MONTHS.findIndex(m => m.slice(0, 3) === name.slice(0, 3));
      }
    }

    const mNob = safeSheetNumber(row[20]);           // U NOB

    if (yy > 0 && monthIdx !== -1 && mNob > 0) {

      const mWeight = safeSheetNumber(row[21]);      // V Weight

      monthly.push({
        month: yy + "-" + String(monthIdx + 1).padStart(2, "0"),
        batches: safeSheetNumber(row[19]),           // T Batch Count
        nob: mNob,
        weight: mWeight,
        avg: mWeight / mNob
      });
    }

  });

  return jsonResponse({
    success: true,
    min: KPI2_MIN,
    max: KPI2_MAX,
    monthly: monthly,
    daily: daily,
    batches: batches
  });

}

// =====================================================
// KPI 3 - SALES & COLLECTION   (daily + monthly)
// Source: BillStatus sheet, one row per bill
//   A Date (bill date) | E Bill No | L status
//   status text:
//     "Settle within 2 days"          -> on time          (counts as Achieved)
//     "Settle but not within 2 days"  -> late             (fail)
//     "pending" / anything else       -> not paid yet
//
// A bill is counted in the KPI only once its 2-day window is decided:
//   * settled within 2 days                       -> total + settled
//   * settled late                                -> total
//   * not paid and bill date + 2 days has passed  -> total (late)
//   * not paid but still inside the 2 days        -> not counted yet ("open")
//
// Collection % = settled within 2 days / counted bills * 100
// Grouped by BILL DATE (daily, monthly). Weekly is built by the page.
// Standard: Achieved when collection % >= 95
// =====================================================

const KPI3_STANDARD = 95;

function getKpi3Data() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BillStatus");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "BillStatus sheet not found."
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({
      success: true, standard: KPI3_STANDARD, monthly: [], daily: []
    });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues(); // A..L

  // last bill date whose 2-day window is already closed
  const tz = Session.getScriptTimeZone();
  const cutoff = Utilities.formatDate(
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), tz, "yyyy-MM-dd"
  );

  const dailyMap = {};
  const seenBills = {};

  values.forEach(row => {

    const billNo = String(row[4] || "").trim();      // E Bill No
    const date = formatSheetDate(row[0]);            // A Date

    if (!billNo || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    const billKey = billNo.toLowerCase();
    if (seenBills[billKey]) return;
    seenBills[billKey] = true;

    const status = String(row[11] || "")             // L status
      .toLowerCase().replace(/\s+/g, " ").trim();

    const late = status.indexOf("not within") !== -1;
    const onTime = !late && status.indexOf("within 2 days") !== -1;
    const settledLate = late;                        // settled, but after 2 days
    const unpaid = !onTime && !settledLate;          // pending / anything else
    const overdue = unpaid && date < cutoff;         // 2-day window already over

    if (!dailyMap[date]) {
      dailyMap[date] = { date: date, total: 0, settled: 0, late: 0, open: 0 };
    }

    const d = dailyMap[date];

    if (onTime) {
      d.total += 1;
      d.settled += 1;
    } else if (settledLate || overdue) {
      d.total += 1;
      d.late += 1;
    } else {
      d.open += 1;                                   // still inside the 2 days
    }

  });

  const daily = Object.keys(dailyMap).sort()
    .map(k => dailyMap[k])
    .filter(d => d.total > 0)
    .map(d => ({
      date: d.date,
      total: d.total,
      settled: d.settled,
      late: d.late,
      open: d.open,
      kpi: (d.settled / d.total) * 100
    }));

  const monthlyMap = {};

  Object.keys(dailyMap).forEach(k => {

    const d = dailyMap[k];
    const month = d.date.substring(0, 7);

    if (!monthlyMap[month]) {
      monthlyMap[month] = { month: month, total: 0, settled: 0, late: 0, open: 0 };
    }

    const m = monthlyMap[month];
    m.total += d.total;
    m.settled += d.settled;
    m.late += d.late;
    m.open += d.open;
  });

  const monthly = Object.keys(monthlyMap).sort()
    .map(k => monthlyMap[k])
    .filter(m => m.total > 0)
    .map(m => ({
      month: m.month,
      total: m.total,
      settled: m.settled,
      late: m.late,
      open: m.open,
      kpi: (m.settled / m.total) * 100
    }));

  return jsonResponse({
    success: true,
    standard: KPI3_STANDARD,
    monthly: monthly,
    daily: daily
  });

}


// =====================================================
// KPI 4 - BIRD RECEIVING PERFORMANCE
// Sheet: KPI4
//   A Date | B DOA | C Out Time | D In Time | E Total Time
//   F Avail Birds
//
// DAILY receiving time = gap between the FIRST lorry "Out"
// and the LAST lorry "In" of that date (may run past midnight).
// KPI4 = total birds / receiving time (hours) -> birds per hour
// MONTHLY = sum of the daily gaps, birds / that total.
//
// Midnight handling:
//   * Out time before KPI4_DAY_START_HOUR (12:00) belongs to the
//     night shift of that date -> +24h.
//   * Trip end = Out + Total Time, so AM/PM labels never matter.
//   * "12:xx" is read as 00:xx.
// =====================================================

// false -> birds = Avail Birds (col F)  [NOB column was removed from the sheet]
const KPI4_USE_NOB = false;

// Standard range (birds / hour): Achieved when MIN <= KPI <= MAX
const KPI4_MIN = 1200;
const KPI4_MAX = 2000;

// Out time before this hour = after-midnight part of the date's shift
const KPI4_DAY_START_HOUR = 12;

function getKpi4Data() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KPI4");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "KPI4 sheet not found."
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({
      success: true, min: KPI4_MIN, max: KPI4_MAX,
      monthly: [], daily: [], batches: []
    });
  }

  const range = sheet.getRange(2, 1, lastRow - 1, 6); // A..F
  const values = range.getValues();
  const display = range.getDisplayValues(); // times exactly as shown

  const batches = [];
  const dailyMap = {};

  for (let i = 0; i < values.length; i++) {

    const date = formatSheetDate(values[i][0]);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const doa = safeSheetNumber(values[i][1]);
    const avail = safeSheetNumber(values[i][5]);
    const nob = safeSheetNumber(values[i][6]);
    const birds = KPI4_USE_NOB ? nob : avail;

    if (birds <= 0) continue;

    // ---- trip start / end in minutes from 00:00 of the sheet date ----
    const outMin = kpi4ParseClock_(display[i][2], values[i][2]);   // C Out
    const inMin = kpi4ParseClock_(display[i][3], values[i][3]);    // D In
    const tripSec = kpi4ToSeconds_(display[i][4], values[i][4]);   // E Total

    let start = null;
    let end = null;

    if (outMin !== null) {
      start = outMin < KPI4_DAY_START_HOUR * 60 ? outMin + 1440 : outMin;

      if (tripSec > 0) {
        end = start + tripSec / 60;
      } else if (inMin !== null) {
        // fallback: In - Out, wrapping over midnight
        end = start + ((inMin - outMin + 1440) % 1440);
      }
    }

    batches.push({
      date: date,
      doa: doa,
      out: start === null ? "" : kpi4ClockText_(start),
      in: end === null ? "" : kpi4ClockText_(end),
      time: kpi4FormatDuration_(tripSec),
      avail: avail,
      nob: nob,
      kpi: tripSec > 0 ? birds / (tripSec / 3600) : 0
    });

    if (!dailyMap[date]) {
      dailyMap[date] = {
        date: date, trips: 0, doa: 0, avail: 0, nob: 0, birds: 0,
        first: null, last: null
      };
    }

    const d = dailyMap[date];
    d.trips += 1;
    d.doa += doa;
    d.avail += avail;
    d.nob += nob;
    d.birds += birds;

    if (start !== null && (d.first === null || start < d.first)) d.first = start;
    if (end !== null && (d.last === null || end > d.last)) d.last = end;
  }

  // ---- daily rows ----
  const daily = Object.keys(dailyMap).sort().map(k => {

    const d = dailyMap[k];

    const seconds =
      d.first !== null && d.last !== null && d.last > d.first
        ? Math.round((d.last - d.first) * 60)
        : 0;

    return {
      date: d.date,
      trips: d.trips,
      doa: d.doa,
      avail: d.avail,
      nob: d.nob,
      birds: d.birds,
      firstOut: d.first === null ? "" : kpi4ClockText_(d.first),
      lastIn: d.last === null ? "" : kpi4ClockText_(d.last),
      seconds: seconds,
      time: kpi4FormatDuration_(seconds),
      hours: Number((seconds / 3600).toFixed(3)),
      kpi: seconds > 0 ? d.birds / (seconds / 3600) : 0
    };
  });

  // ---- monthly = sum of the daily gaps ----
  const monthlyMap = {};

  daily.forEach(d => {

    const month = d.date.substring(0, 7);

    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month: month, days: 0, trips: 0, doa: 0, avail: 0, nob: 0,
        birds: 0, seconds: 0
      };
    }

    const m = monthlyMap[month];
    m.days += 1;
    m.trips += d.trips;
    m.doa += d.doa;
    m.avail += d.avail;
    m.nob += d.nob;
    m.birds += d.birds;
    m.seconds += d.seconds;
  });

  const monthly = Object.keys(monthlyMap).sort().map(k => {
    const m = monthlyMap[k];
    m.time = kpi4FormatDuration_(m.seconds);
    m.hours = Number((m.seconds / 3600).toFixed(3));
    m.kpi = m.seconds > 0 ? m.birds / (m.seconds / 3600) : 0;
    return m;
  });

  return jsonResponse({
    success: true,
    min: KPI4_MIN,
    max: KPI4_MAX,
    basis: KPI4_USE_NOB ? "NOB" : "Avail Birds",
    monthly: monthly,
    daily: daily,
    batches: batches
  });
}


// "18:12 PM" / "4:09 AM" / "12:13 AM" / "14:30" -> minutes after 00:00 (0..1439)
// Returns null when the cell is empty / unreadable.
function kpi4ParseClock_(displayText, rawValue) {

  const m = String(displayText || "").trim()
    .match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp][Mm])?$/);

  if (m) {

    let h = Number(m[1]);
    const min = Number(m[2]) + Number(m[3] || 0) / 60;
    const suffix = (m[4] || "").toUpperCase();

    if (h >= 24) return null;

    if (h === 12) h = 0;                              // 12:xx = 00:xx
    else if (suffix === "PM" && h < 12) h += 12;      // 5:30 PM = 17:30

    return h * 60 + min;
  }

  if (typeof rawValue === "number" && isFinite(rawValue)) {
    return Math.round((rawValue % 1) * 1440);
  }

  return null;
}

// minutes (may be >= 1440) -> "HH:MM" ; ">= 24h" gets "(+1)" (next calendar day)
function kpi4ClockText_(minutes) {

  const total = Math.round(minutes);
  const dayShift = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;

  const p = n => String(n).padStart(2, "0");

  return p(Math.floor(inDay / 60)) + ":" + p(inDay % 60) +
    (dayShift >= 1 ? " (+" + dayShift + ")" : "");
}

// "3:33:00" / "34:50:00" / "3:33" -> seconds.
function kpi4ToSeconds_(displayText, rawValue) {

  const m = String(displayText || "").trim()
    .match(/^(\d+)[:.](\d{1,2})(?:[:.](\d{1,2}))?$/);

  if (m) {
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
  }

  if (typeof rawValue === "number" && isFinite(rawValue)) {
    return Math.round(rawValue * 86400);
  }

  return 0;
}

// seconds -> "HH:MM:SS" (hours can go above 24)
function kpi4FormatDuration_(totalSeconds) {

  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const p = n => String(n).padStart(2, "0");

  return p(h) + ":" + p(m) + ":" + p(sec);
}


// =====================================================
// KPI 5 - TRUCK TURNAROUND TIME
// Sheet: KPI5
//   A Date | B Trip No | C Vehicle No | D Out Time | E In Time
//   F Total Time | G Batch No (not used)
//
// Turnaround (gap) = lorry's trip N "In" (back at the plant)
//                    -> the same lorry's trip N+1 "Out".
//   * Only trips of the SAME lorry on the SAME sheet date.
//   * Lorry with only one trip that date -> no gap, not counted.
//   * Several rows with the same Date + Vehicle + Trip No
//     (different batches) = ONE trip (earliest Out, latest In).
//
// DAILY   KPI = total gap time / number of gaps
// MONTHLY KPI = month total gap time / month number of gaps
//
// Midnight: Out time before KPI5_DAY_START_HOUR (12:00) belongs to
// the night part of that date (+24h). Trip end = Out + Total Time.
// "12:xx" is read as 00:xx.
// =====================================================

// Standard (minutes): <= GOOD = Achieved, <= LIMIT = Acceptable, above = Not Achieved
const KPI5_GOOD_MIN = 45;
const KPI5_LIMIT_MIN = 60;

const KPI5_DAY_START_HOUR = 12;

function getKpi5Data() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KPI5");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "KPI5 sheet not found."
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({
      success: true, good: KPI5_GOOD_MIN, limit: KPI5_LIMIT_MIN,
      monthly: [], daily: [], lorries: []
    });
  }

  const range = sheet.getRange(2, 1, lastRow - 1, 6); // A..F
  const values = range.getValues();
  const display = range.getDisplayValues(); // times exactly as shown

  // ---- 1) rows -> trips (date | vehicle | trip no) ----
  const trips = {};

  for (let i = 0; i < values.length; i++) {

    const date = formatSheetDate(values[i][0]);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const tripNo = safeSheetNumber(values[i][1]);
    const vehicle = String(values[i][2] || "").trim();

    if (!vehicle || tripNo <= 0) continue;

    const outMin = kpi5ParseClock_(display[i][3], values[i][3]);   // D Out
    const inMin = kpi5ParseClock_(display[i][4], values[i][4]);    // E In
    const tripSec = kpi5ToSeconds_(display[i][5], values[i][5]);   // F Total

    if (outMin === null) continue;

    const start = outMin < KPI5_DAY_START_HOUR * 60 ? outMin + 1440 : outMin;

    let end = null;

    if (tripSec > 0) {
      end = start + tripSec / 60;
    } else if (inMin !== null) {
      end = start + ((inMin - outMin + 1440) % 1440);
    }

    if (end === null) continue;

    const key = date + "|" + vehicle + "|" + tripNo;

    if (!trips[key]) {
      trips[key] = { date: date, vehicle: vehicle, tripNo: tripNo, start: start, end: end };
    } else {
      // same trip split in several rows (batches): earliest Out, latest In
      trips[key].start = Math.min(trips[key].start, start);
      trips[key].end = Math.max(trips[key].end, end);
    }
  }

  // ---- 2) group trips: date -> vehicle -> [trips] ----
  const byDate = {};

  Object.keys(trips).forEach(k => {
    const t = trips[k];
    if (!byDate[t.date]) byDate[t.date] = {};
    if (!byDate[t.date][t.vehicle]) byDate[t.date][t.vehicle] = [];
    byDate[t.date][t.vehicle].push(t);
  });

  // ---- 3) gaps per lorry, daily totals ----
  const lorries = [];
  const daily = [];

  Object.keys(byDate).sort().forEach(date => {

    const day = {
      date: date, lorries: 0, trips: 0, turnarounds: 0, totalSec: 0
    };

    Object.keys(byDate[date]).sort().forEach(vehicle => {

      const list = byDate[date][vehicle].sort((a, b) => a.tripNo - b.tripNo);

      const gaps = [];

      for (let i = 1; i < list.length; i++) {

        const gapSec = Math.round((list[i].start - list[i - 1].end) * 60);

        if (gapSec >= 0) gaps.push(gapSec);   // negative = bad data, ignored
      }

      const totalSec = gaps.reduce((a, b) => a + b, 0);

      // total running time of the lorry's trips that day
      const runSec = list.reduce((a, t) => a + Math.round((t.end - t.start) * 60), 0);

      // every gap with the two times it is calculated from
      // (sec = null when Out is before the previous In -> bad data)
      const gapDetails = [];

      for (let i = 1; i < list.length; i++) {
        const g = Math.round((list[i].start - list[i - 1].end) * 60);
        gapDetails.push({
          from: kpi5ClockText_(list[i - 1].end),   // trip i In
          to: kpi5ClockText_(list[i].start),       // trip i+1 Out
          sec: g >= 0 ? g : null
        });
      }

      lorries.push({
        date: date,
        vehicle: vehicle,
        trips: list.length,
        gaps: gaps,
        runSec: runSec,
        gapDetails: gapDetails,
        turnarounds: gaps.length,
        totalSec: totalSec,
        avgSec: gaps.length ? totalSec / gaps.length : 0
      });

      day.lorries += 1;
      day.trips += list.length;
      day.turnarounds += gaps.length;
      day.totalSec += totalSec;
    });

    // days without any gap (every lorry made only one trip) have no KPI
    if (day.turnarounds > 0) {
      day.avgSec = day.totalSec / day.turnarounds;
      daily.push(day);
    }
  });

  // ---- 4) monthly = sum of daily gaps / sum of daily gap counts ----
  const monthlyMap = {};

  daily.forEach(d => {

    const month = d.date.substring(0, 7);

    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month: month, days: 0, lorries: 0, trips: 0, turnarounds: 0, totalSec: 0
      };
    }

    const m = monthlyMap[month];
    m.days += 1;
    m.lorries += d.lorries;
    m.trips += d.trips;
    m.turnarounds += d.turnarounds;
    m.totalSec += d.totalSec;
  });

  const monthly = Object.keys(monthlyMap).sort().map(k => {
    const m = monthlyMap[k];
    m.avgSec = m.turnarounds ? m.totalSec / m.turnarounds : 0;
    return m;
  });

  return jsonResponse({
    success: true,
    good: KPI5_GOOD_MIN,
    limit: KPI5_LIMIT_MIN,
    monthly: monthly,
    daily: daily,
    lorries: lorries
  });
}


// "18:12 PM" / "4:09 AM" / "12:13 AM" / "14:30" -> minutes after 00:00
function kpi5ParseClock_(displayText, rawValue) {

  const m = String(displayText || "").trim()
    .match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp][Mm])?$/);

  if (m) {

    let h = Number(m[1]);
    const min = Number(m[2]) + Number(m[3] || 0) / 60;
    const suffix = (m[4] || "").toUpperCase();

    if (h >= 24) return null;

    if (h === 12) h = 0;                              // 12:xx = 00:xx
    else if (suffix === "PM" && h < 12) h += 12;      // 5:30 PM = 17:30

    return h * 60 + min;
  }

  if (typeof rawValue === "number" && isFinite(rawValue)) {
    return Math.round((rawValue % 1) * 1440);
  }

  return null;
}

// minutes (may be >= 1440) -> "HH:MM" ; after midnight gets "(+1)"
function kpi5ClockText_(minutes) {

  const total = Math.round(minutes);
  const dayShift = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;

  const p = n => String(n).padStart(2, "0");

  return p(Math.floor(inDay / 60)) + ":" + p(inDay % 60) +
    (dayShift >= 1 ? " (+" + dayShift + ")" : "");
}

// "3:33:00" / "34:50:00" / "3:33" -> seconds
function kpi5ToSeconds_(displayText, rawValue) {

  const m = String(displayText || "").trim()
    .match(/^(\d+)[:.](\d{1,2})(?:[:.](\d{1,2}))?$/);

  if (m) {
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
  }

  if (typeof rawValue === "number" && isFinite(rawValue)) {
    return Math.round(rawValue * 86400);
  }

  return 0;
}
