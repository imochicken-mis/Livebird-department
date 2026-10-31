/* Compatibility fallback for an older cached api.js. */
if (typeof window.getCustomerAccounts !== "function") {
    window.getCustomerAccounts = () =>
        window.sendRequest({ action: "getCustomerAccounts" });
}

if (typeof window.saveCustomerAccountPayment !== "function") {
    window.saveCustomerAccountPayment = payment =>
        window.sendRequest({
            action: "saveCustomerAccountPayment",
            payment: payment
        });
}
document.addEventListener("DOMContentLoaded", () => {
    const byId = id => document.getElementById(id);
    const sessionRaw = sessionStorage.getItem("livebirdUser");
    if (!sessionRaw) { window.location.href = "../index.html"; return; }
    let user;
    try { user = JSON.parse(sessionRaw); } catch (_) { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; return; }
    if (!user.username || user.username.toLowerCase() !== "user1") { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; return; }
    byId("loggedUser").textContent = `Logged in as: ${user.name || user.username}`;
    byId("logoutBtn").addEventListener("click", () => { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; });

    const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const showBillMessage = (text, type = "") => { const el = byId("paymentMessage"); el.textContent = text; el.className = `payment-message ${type}`.trim(); };
    const showCustomerMessage = (text, type = "") => { const el = byId("customerAccountsMessage"); el.textContent = text; el.className = `payment-message ${type}`.trim(); };
    const showBalanceMessage = (text, type = "") => { const el = byId("customerBalanceMessage"); el.textContent = text; el.className = `payment-message ${type}`.trim(); };
    const fill = (id, value) => { byId(id).textContent = value ?? ""; };

    const balancePanel = byId("customerBalancePanel");
    const billsPanel = byId("customerBillsPanel");
    const billsSummaryCard = byId("customerBillsSummaryCard");
        const reportPanel = byId("dailyReportPanel");
    const dailyReportBody = byId("dailyReportBody");
    const dailyReportEmpty = byId("dailyReportEmpty");
    const dailyReportMessage = byId("dailyReportMessage");
const customerBillsListCard = byId("customerBillsListCard");
    const customerBillsListBody = byId("customerBillsListBody");
    const customerBillsListEmpty = byId("customerBillsListEmpty");
    const selectedCustomerTitle = byId("selectedCustomerTitle");
    const billPanel = byId("billPaymentsPanel");
    const tabButtons = [...document.querySelectorAll("[data-payment-tab]")];
    const amountInput = byId("paymentAmount");
    const paymentMethod2 = byId("paymentMethod2");
    const receiptNo2 = byId("receiptNo2");
    const amountInput2 = byId("paymentAmount2");
    const secondaryPaymentFields = byId("secondaryPaymentFields");
        const useCashAdvance = byId("useCashAdvance");
    const toggleSecondPaymentBtn = byId("toggleSecondPaymentBtn");
    const saveButton = byId("savePaymentBtn");
    const paymentDateInput = byId("paymentDate");
    const historySection = byId("paymentHistorySection");
    const historyBody = byId("paymentHistoryBody");
    const historyEmpty = byId("paymentHistoryEmpty");
    paymentDateInput.value = isoToday();
    byId("customerPaymentDate").value = isoToday();

    let currentBill = null;
    let paymentHistoryRows = [];
    let editingPayment = null;
    let customerAccountsLoaded = false;
    let customerAccountsData = [];
    let selectedCustomerName = "";
    let dailyReportRows = [];
    let dailyReportLoaded = false;

    const setActiveTab = name => {
        tabButtons.forEach(tab => {
            const active = tab.dataset.paymentTab === name;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        balancePanel.hidden = name !== "customer-balance";
        billsPanel.hidden = name !== "customer-bills";
                reportPanel.hidden = name !== "daily-report";
        document.querySelector(".payment-tabs").hidden = name === "daily-report";
        byId("collectionsNavLink").classList.toggle("active", name !== "daily-report");
        byId("dailyReportNavLink").classList.toggle("active", name === "daily-report");
if (name !== "customer-bills") {
            billPanel.hidden = true;
            billsSummaryCard.hidden = true;
            customerBillsListCard.hidden = true;
        } else if (!currentBill) {
            billsSummaryCard.hidden = Boolean(selectedCustomerName);
            customerBillsListCard.hidden = !selectedCustomerName;
        }
    };
        const setDailyReportMessage = (text, type = "") => { dailyReportMessage.textContent = text; dailyReportMessage.className = `save-message ${type}`.trim(); };
        const renderDailyReport = () => {
        const fromDate = byId("fromDate").value;
        const toDate = byId("toDate").value;
        const customer = byId("dailyReportCustomer").value.trim().toLowerCase();
        const status = byId("dailyReportMethod").value;
        const rows = dailyReportRows.filter(row =>
            (!fromDate || row.billDate >= fromDate) &&
            (!toDate || row.billDate <= toDate) &&
            (!customer || String(row.customerName || "").toLowerCase().includes(customer)) &&
            (status === "all" || row.status === status)
        ).sort((a, b) => String(b.billDate).localeCompare(String(a.billDate)) || String(a.billNo).localeCompare(String(b.billNo)));
        const totalValue = rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
        const totalPaid = rows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
        const outstanding = rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
        fill("dailyReportTotal", String(rows.length));
        fill("dailyReportCash", money(totalValue));
        fill("dailyReportBank", money(totalPaid));
        fill("dailyReportAdvance", money(outstanding));
        dailyReportBody.replaceChildren();
        rows.forEach(row => {
            const tr = document.createElement("tr");
            tr.className = "bill-status-" + String(row.status || "").toLowerCase().replace(/\s+/g, "-");
            [row.billDate, row.billNo, row.customerName, row.farmerName, money(row.totalAmount), money(row.paidAmount), money(row.balance), row.lastPaymentDate || "-", ({ "Paid": "Settled", "Unpaid": "Not Settled", "Partially Paid": "Partially Settled" })[row.status] || row.status].forEach(value => {
                const td = document.createElement("td"); td.textContent = value; tr.appendChild(td);
            });
            dailyReportBody.appendChild(tr);
        });
        if (!rows.length) {
            const emptyRow = document.createElement("tr"); emptyRow.className = "report-empty-row";
            const emptyCell = document.createElement("td"); emptyCell.colSpan = 9; emptyCell.textContent = "No bills match the selected filters."; emptyRow.appendChild(emptyCell);
            dailyReportBody.appendChild(emptyRow);
        }
    };
    const loadDailyReport = async () => {
        setDailyReportMessage("Loading bill payment status report…");
        try {
            const result = await window.sendRequest({ action: "getBillPaymentStatusReportData" });
            if (!result.success) throw new Error(result.message || "Could not load the bill payment status report.");
            dailyReportRows = result.rows || [];
            dailyReportLoaded = true;
            renderDailyReport();
            setDailyReportMessage("Showing " + dailyReportRows.length + " bills.");
        } catch (error) {
            setDailyReportMessage(error.message || "Unable to load the bill payment status report.", "error");
        }
    };
const currentCustomerAccount = () => customerAccountsData.find(item => String(item.name || "").trim().toLowerCase() === String(currentBill ? currentBill.customer : "").trim().toLowerCase());
    const billBalanceBeforeEdit = () => Number(currentBill ? currentBill.balance : 0) + (editingPayment ? Number(editingPayment.paymentAmount || 0) : 0);
        const cashAdvanceAmount = () => Math.max(0, Number((currentCustomerAccount() || {}).cashAdvance || 0));
    const refreshBalance = () => {
        if (!currentBill) return;
        const directAmount = Math.max(0, Number(amountInput.value) || 0) + Math.max(0, Number(amountInput2.value) || 0);
        const advanceAmount = useCashAdvance.checked ? Math.min(cashAdvanceAmount(), Math.max(0, billBalanceBeforeEdit() - directAmount)) : 0;
        const projectedBalance = Math.max(0, billBalanceBeforeEdit() - directAmount - advanceAmount);
        fill("detailBalance", money(projectedBalance));
        fill("detailPaid", money(Number(currentBill.totalAmount) - projectedBalance));
    };
    const updatePaymentLimits = () => {
        if (!currentBill) return;
        const advanceAmount = useCashAdvance.checked ? Math.min(cashAdvanceAmount(), billBalanceBeforeEdit()) : 0;
        const max = Math.max(0, billBalanceBeforeEdit() - advanceAmount).toFixed(2);
        amountInput.max = max;
        amountInput2.max = max;
        refreshBalance();
    };
    amountInput.addEventListener("input", refreshBalance);
    amountInput2.addEventListener("input", refreshBalance);
    useCashAdvance.addEventListener("change", updatePaymentLimits);const setSecondPaymentVisible = visible => {
        secondaryPaymentFields.hidden = !visible;
        toggleSecondPaymentBtn.setAttribute("aria-expanded", String(visible));
        toggleSecondPaymentBtn.textContent = visible ? "− Hide second payment" : "+ Add another payment";
    };
    toggleSecondPaymentBtn.addEventListener("click", () => setSecondPaymentVisible(secondaryPaymentFields.hidden));
    const refreshPaymentHistory = async billNo => {
        historySection.hidden = false;
        historyBody.replaceChildren();
        historyEmpty.hidden = true;
        try {
            const result = await getBillPaymentHistory(billNo);
            if (!result.success) throw new Error(result.message || "Could not load payment history.");
            paymentHistoryRows = result.history || [];
            paymentHistoryRows.forEach((item, index) => {
                const tr = document.createElement("tr");
                const actionCell = document.createElement("td");
                const editButton = document.createElement("button");
                editButton.type = "button"; editButton.className = "history-edit-btn"; editButton.dataset.editRow = String(item.rowNumber); editButton.textContent = "Edit";
                actionCell.appendChild(editButton); tr.appendChild(actionCell);
                [index + 1, item.paymentDate, item.paymentMethod, item.receiptNo || "-", money(item.paymentAmount), money(item.balance), item.addedBy || ""].forEach(value => { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); });
                historyBody.appendChild(tr);
            });
            historyEmpty.textContent = paymentHistoryRows.length ? "" : "No previous payments for this bill.";
            historyEmpty.hidden = paymentHistoryRows.length > 0;
        } catch (_) { historyEmpty.textContent = "Could not load payment history."; historyEmpty.hidden = false; }
    };

    const openBill = async billNo => {
        setActiveTab("customer-bills");
        billsSummaryCard.hidden = true;
        billPanel.hidden = false;
        customerBillsListCard.hidden = true;
        showBillMessage("Loading bill…");
        try {
                                const result = await getBillPaymentInfo(billNo);
            if (!result.success) throw new Error(result.message || "Could not load this bill.");
            if (!result.found) { showBillMessage("Bill No not found.", "error"); return; }
            currentBill = result.bill;
             byId("paymentForm").reset(); paymentDateInput.value = isoToday(); paymentMethod2.disabled = false; receiptNo2.disabled = false; amountInput2.disabled = false; setSecondPaymentVisible(false);
            const account = customerAccountsData.find(item => String(item.name || "").trim().toLowerCase() === String(currentBill.customer || "").trim().toLowerCase());
            fill("detailCashAdvance", money(account ? account.cashAdvance : 0));
            fill("detailBill", currentBill.billNo); fill("detailDate", currentBill.date); fill("detailExpectedDate", currentBill.expectedDate); fill("detailFarmer", currentBill.farmer); fill("detailBatch", currentBill.batch); fill("detailCustomer", currentBill.customer); fill("detailNob", Number(currentBill.totalNob || 0).toLocaleString()); fill("detailWeight", money(currentBill.totalWeight)); fill("detailPrice", money(currentBill.totalPrice)); fill("detailAmount", money(currentBill.totalAmount)); fill("detailPaid", money(currentBill.paidAmount)); fill("detailBalance", money(currentBill.balance));
            updatePaymentLimits();
            await refreshPaymentHistory(currentBill.billNo);
            showBillMessage(Number(currentBill.balance) <= 0 ? "This bill is fully paid." : "Bill loaded. Enter the payment details below.", Number(currentBill.balance) <= 0 ? "success" : "");
        } catch (error) { showBillMessage(error.message || "Unable to load the bill.", "error"); }
    };

    byId("customerSummaryBody").addEventListener("click", event => {
        const button = event.target.closest("[data-customer]");
        if (button) selectCustomer(button.dataset.customer);
    });
    customerBillsListBody.addEventListener("click", event => {
        const button = event.target.closest("[data-bill]");
        if (button) openBill(button.dataset.bill);
    });

    byId("backToCustomerBillsBtn").addEventListener("click", () => {
        billPanel.hidden = true; billsSummaryCard.hidden = true; customerBillsListCard.hidden = !selectedCustomerName; currentBill = null; showBillMessage("");
    });
    byId("paymentForm").addEventListener("submit", async event => {
        event.preventDefault();
        if (!currentBill) return;
        const amount1 = Math.max(0, Number(amountInput.value) || 0);
        const amount2 = Math.max(0, Number(amountInput2.value) || 0);
                const totalPayment = amount1 + amount2;
        const useAdvance = useCashAdvance.checked;
        const wasEditing = Boolean(editingPayment);
        const billBalanceBefore = billBalanceBeforeEdit();
        const availableAdvance = useAdvance ? Math.min(cashAdvanceAmount(), billBalanceBefore) : 0;
        if (totalPayment <= 0 && availableAdvance <= 0) { showBillMessage("Enter a payment amount or use an available Cash in Advance balance.", "error"); return; }
                if (totalPayment + availableAdvance > billBalanceBefore + 0.000001) { showBillMessage("Payment exceeds the remaining bill balance.", "error"); return; }
        if (amount1 > 0 && byId("paymentMethod").value !== "Cash" && byId("paymentMethod").value !== "Bank Transfer") { showBillMessage("Select a method for the first payment.", "error"); return; }
        if (amount2 > 0 && paymentMethod2.value !== "Cash" && paymentMethod2.value !== "Bank Transfer") { showBillMessage("Select a method for the second payment.", "error"); return; }
        if (wasEditing && amount2 > 0) { showBillMessage("Use one payment line when editing a payment.", "error"); return; }
        const payments = [];
        if (amount1 > 0) payments.push({ paymentMethod: byId("paymentMethod").value, receiptNo: byId("receiptNo").value.trim(), paymentAmount: amount1 });
        if (amount2 > 0) payments.push({ paymentMethod: paymentMethod2.value, receiptNo: receiptNo2.value.trim(), paymentAmount: amount2 });
        saveButton.disabled = true; saveButton.textContent = wasEditing ? "Updating…" : "Saving…";
        try {
                                    const result = await saveBillPayment({ billNo: currentBill.billNo, editRow: editingPayment ? editingPayment.rowNumber : undefined, paymentDate: paymentDateInput.value, payments: payments, useCashAdvance: useCashAdvance.checked, paymentMethod: payments[0]?.paymentMethod || "", receiptNo: payments[0]?.receiptNo || "", paymentAmount: payments[0]?.paymentAmount || 0, addedBy: user.name || user.username });
            if (!result.success) throw new Error(result.message || "Payment could not be saved.");
            currentBill.balance = Number(result.balance); currentBill.paidAmount = Math.max(0, Number(currentBill.totalAmount) - currentBill.balance); fill("detailPaid", money(currentBill.paidAmount)); fill("detailBalance", money(currentBill.balance)); editingPayment = null;
            showBillMessage(`${wasEditing ? "Payment updated" : "Payments saved"}. Remaining balance: ${money(result.balance)}.`, "success");
            byId("paymentForm").reset(); paymentDateInput.value = isoToday(); paymentMethod2.disabled = false; receiptNo2.disabled = false; amountInput2.disabled = false; setSecondPaymentVisible(false);
            await refreshPaymentHistory(currentBill.billNo);
            await loadCustomerAccounts();
            const updatedAccount = currentCustomerAccount();
            fill("detailCashAdvance", money(updatedAccount ? updatedAccount.cashAdvance : 0));
            updatePaymentLimits();
        } catch (error) { showBillMessage(error.message || "Unable to save payment.", "error"); }
        finally { saveButton.disabled = false; saveButton.textContent = "Save Payment"; byId("clearBillBtn").textContent = "Clear"; }
    });
    historyBody.addEventListener("click", event => {
        const button = event.target.closest("[data-edit-row]"); if (!button) return;
        const item = paymentHistoryRows.find(row => Number(row.rowNumber) === Number(button.dataset.editRow)); if (!item) return;
                if (item.paymentMethod && String(item.paymentMethod).trim().startsWith("Cash in Advance")) { showBillMessage("Cash in Advance application rows cannot be edited here.", "error"); return; } editingPayment = item; paymentDateInput.value = item.paymentDate || ""; byId("paymentMethod").value = item.paymentMethod || ""; byId("receiptNo").value = item.receiptNo || ""; amountInput.value = Number(item.paymentAmount || 0).toFixed(2); paymentMethod2.value = ""; receiptNo2.value = ""; amountInput2.value = ""; paymentMethod2.disabled = true; receiptNo2.disabled = true; amountInput2.disabled = true; setSecondPaymentVisible(false); updatePaymentLimits(); saveButton.textContent = "Update Payment"; byId("clearBillBtn").textContent = "Cancel Edit"; showBillMessage("Payment loaded for editing. Save to replace the existing row.");
    });

    byId("clearBillBtn").addEventListener("click", async () => {
        if (editingPayment) { editingPayment = null; byId("paymentForm").reset(); paymentDateInput.value = isoToday(); paymentMethod2.disabled = false; receiptNo2.disabled = false; amountInput2.disabled = false; setSecondPaymentVisible(false); updatePaymentLimits(); fill("detailPaid", money(currentBill.paidAmount)); fill("detailBalance", money(currentBill.balance)); saveButton.textContent = "Save Payment"; byId("clearBillBtn").textContent = "Clear"; showBillMessage("Editing cancelled."); await refreshPaymentHistory(currentBill.billNo); return; }
        billPanel.hidden = true; billsSummaryCard.hidden = true; customerBillsListCard.hidden = !selectedCustomerName; currentBill = null; showBillMessage("");
    });

    const renderCustomerBills = () => {
        const customer = customerAccountsData.find(item => String(item.name || "").trim().toLowerCase() === selectedCustomerName.trim().toLowerCase());
        const search = byId("customerBillSearch").value.trim().toLowerCase();
        const status = byId("customerBillStatus").value;
        const sort = byId("customerBillSort").value;
        let bills = customer ? [...(customer.bills || [])] : [];
        bills = bills.filter(bill => {
            const matchesSearch = !search || String(bill.billNo || "").toLowerCase().includes(search);
            const isOutstanding = Number(bill.balance || 0) > 0.000001;
            const matchesStatus = status === "all" || (status === "outstanding" && isOutstanding) || (status === "paid" && !isOutstanding);
            return matchesSearch && matchesStatus;
        });
                bills.sort((a, b) => {
            const outstandingDifference = (Number(b.balance || 0) > 0.000001 ? 1 : 0) - (Number(a.balance || 0) > 0.000001 ? 1 : 0);
            if (outstandingDifference !== 0) return outstandingDifference;
            if (sort === "bill-asc") return String(a.billNo).localeCompare(String(b.billNo), undefined, { numeric: true });
            const direction = sort === "date-asc" ? 1 : -1;
            return direction * String(a.date || "").localeCompare(String(b.date || ""));
        });customerBillsListBody.replaceChildren();
        customerBillsListEmpty.hidden = bills.length > 0;
        bills.forEach(bill => {
            const tr = document.createElement("tr");
            const billCell = document.createElement("td");
            const billButton = document.createElement("button");
            billButton.type = "button"; billButton.className = "customer-bill-link"; billButton.dataset.bill = bill.billNo; billButton.textContent = bill.billNo;
            billCell.appendChild(billButton); tr.appendChild(billCell);
            [bill.date || "", money(bill.amount), money(Number(bill.amount || 0) - Number(bill.balance || 0)), money(bill.balance)].forEach(value => { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); });
            const statusCell = document.createElement("td"); statusCell.textContent = Number(bill.balance || 0) > 0.000001 ? "Outstanding" : "Settled"; statusCell.className = Number(bill.balance || 0) > 0.000001 ? "bill-status-outstanding" : "bill-status-paid"; tr.appendChild(statusCell);
            const actionCell = document.createElement("td"); const openButton = document.createElement("button"); openButton.type = "button"; openButton.className = "history-edit-btn"; openButton.dataset.bill = bill.billNo; openButton.textContent = "Open"; actionCell.appendChild(openButton); tr.appendChild(actionCell);
                                        customerBillsListBody.appendChild(tr);
        });
    };

    const selectCustomer = name => {
        selectedCustomerName = String(name || "").trim();
        selectedCustomerTitle.textContent = `${selectedCustomerName} - Bills`;
        billsSummaryCard.hidden = true;
        customerBillsListCard.hidden = !selectedCustomerName;
        renderCustomerBills();
    };
    const renderCustomerAccounts = data => {
        const body = byId("customerSummaryBody"); body.replaceChildren();
        const customers = data.customers || [];
        customerAccountsData = customers;
        const search = byId("customerSummarySearch").value.trim().toLowerCase();
        const visibleCustomers = customers
            .filter(customer => !search || String(customer.name || "").toLowerCase().includes(search))
            .sort((a, b) => {
                const outstandingDifference = Number(b.outstanding || 0) - Number(a.outstanding || 0);
                if (Math.abs(outstandingDifference) > 0.000001) return outstandingDifference;
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
        byId("customerSummaryEmpty").hidden = visibleCustomers.length > 0;
        byId("customerSummaryEmpty").textContent = search ? "No customers match the search." : "No customer accounts found.";
        visibleCustomers.forEach(customer => {
            const tr = document.createElement("tr");
            [customer.name, customer.billCount, customer.unpaidBillCount, money(customer.outstanding), money(customer.cashAdvance)].forEach(value => { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); });
            const actionCell = document.createElement("td"); const viewButton = document.createElement("button"); viewButton.type = "button"; viewButton.className = "history-edit-btn"; viewButton.dataset.customer = customer.name; viewButton.textContent = "View Bills"; actionCell.appendChild(viewButton); tr.appendChild(actionCell);
            body.appendChild(tr);
        });
        const select = byId("customerAccountSelect"); const selected = select.value; select.replaceChildren(new Option("Select customer", "")); customers.forEach(customer => select.add(new Option(customer.name, customer.name))); select.value = selected;
        if (selectedCustomerName) {
            const stillExists = customers.some(customer => String(customer.name || "").trim().toLowerCase() === selectedCustomerName.toLowerCase());
            if (stillExists) renderCustomerBills(); else { selectedCustomerName = ""; customerBillsListCard.hidden = true; }
        }
    };const loadCustomerAccounts = async () => {
        showCustomerMessage("Loading customer accounts…");
        try { const result = await getCustomerAccounts(); if (!result.success) throw new Error(result.message || "Could not load customer accounts."); renderCustomerAccounts(result); customerAccountsLoaded = true; showCustomerMessage(""); }
        catch (error) { showCustomerMessage(error.message || "Unable to load customer accounts.", "error"); }
    };

    byId("refreshCustomerAccountsBtn").addEventListener("click", loadCustomerAccounts);
        byId("customerSummarySearch").addEventListener("input", () => renderCustomerAccounts({ customers: customerAccountsData }));
    byId("clearSelectedCustomerBtn").addEventListener("click", () => { selectedCustomerName = ""; customerBillsListCard.hidden = true; billsSummaryCard.hidden = false; selectedCustomerTitle.textContent = "Customer Bills"; });
    ["customerBillSearch", "customerBillStatus", "customerBillSort"].forEach(id => byId(id).addEventListener("input", renderCustomerBills));
        ["fromDate", "toDate", "dailyReportCustomer", "dailyReportMethod"].forEach(id => byId(id).addEventListener("input", renderDailyReport));
    byId("dailyReportFilterBtn").addEventListener("click", renderDailyReport);
    byId("dailyReportClearBtn").addEventListener("click", () => { byId("fromDate").value = ""; byId("toDate").value = ""; byId("dailyReportCustomer").value = ""; byId("dailyReportMethod").value = "all"; renderDailyReport(); });
    byId("dailyReportRefreshBtn").addEventListener("click", loadDailyReport);
byId("customerPaymentForm").addEventListener("submit", async event => {
        event.preventDefault(); const button = byId("saveCustomerPaymentBtn"); const amount = Number(byId("customerPaymentAmount").value);
        if (!(amount > 0)) { showBalanceMessage("Enter a valid payment amount.", "error"); return; }
        button.disabled = true; button.textContent = "Saving…";
        try { const result = await saveCustomerAccountPayment({ customer: byId("customerAccountSelect").value, paymentDate: byId("customerPaymentDate").value, paymentMethod: byId("customerPaymentMethod").value, referenceNo: byId("customerReferenceNo").value.trim(), amount, remark: byId("customerPaymentRemark").value.trim(), addedBy: user.name || user.username }); if (!result.success) throw new Error(result.message || "Customer payment could not be saved."); byId("customerPaymentForm").reset(); byId("customerPaymentDate").value = isoToday(); showBalanceMessage("Customer payment saved successfully.", "success"); await loadCustomerAccounts(); }
        catch (error) { showBalanceMessage(error.message || "Unable to save customer payment.", "error"); }
        finally { button.disabled = false; button.textContent = "Save Payment"; }
    });
    byId("clearCustomerPaymentBtn").addEventListener("click", () => { byId("customerPaymentForm").reset(); byId("customerPaymentDate").value = isoToday(); showBalanceMessage(""); });

    tabButtons.forEach(tab => tab.addEventListener("click", async () => {
        setActiveTab(tab.dataset.paymentTab);
                if (tab.dataset.paymentTab === "customer-bills" && !customerAccountsLoaded) await loadCustomerAccounts();
        if (tab.dataset.paymentTab === "daily-report" && !dailyReportLoaded) await loadDailyReport();
    }));


        const initialPaymentTab = window.location.hash === "#daily-report" ? "daily-report" : "customer-balance";
    setActiveTab(initialPaymentTab);
    loadCustomerAccounts();
    if (initialPaymentTab === "daily-report") loadDailyReport();

    window.addEventListener("hashchange", async () => {
        const showReport = window.location.hash === "#daily-report";
        setActiveTab(showReport ? "daily-report" : "customer-balance");
        if (showReport && !dailyReportLoaded) await loadDailyReport();
    });
});