document.addEventListener("DOMContentLoaded", () => {
    const userText = document.getElementById("loggedUser");
    const sessionRaw = sessionStorage.getItem("livebirdUser");
    if (!sessionRaw) { window.location.href = "../index.html"; return; }
    let user;
    try { user = JSON.parse(sessionRaw); } catch (_) { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; return; }
    if (!user.username || user.username.toLowerCase() !== "user1") { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; return; }
    userText.textContent = `Logged in as: ${user.name || user.username}`;
    document.getElementById("logoutBtn").addEventListener("click", () => { sessionStorage.removeItem("livebirdUser"); window.location.href = "../index.html"; });

    const searchForm = document.getElementById("billSearchForm");
    const billInput = document.getElementById("billSearch");
    const details = document.getElementById("billDetailsCard");
    const message = document.getElementById("paymentMessage");
    const amountInput = document.getElementById("paymentAmount");
    const saveButton = document.getElementById("savePaymentBtn");
    const paymentDateInput = document.getElementById("paymentDate");
    const today = new Date();
    paymentDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let currentBill = null;
    let paymentHistoryRows = [];
    let editingPayment = null;
    const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const showMessage = (text, type = "") => { message.textContent = text; message.className = `payment-message ${type}`.trim(); };
    const fill = (id, value) => { document.getElementById(id).textContent = value ?? ""; };
    const historySection = document.getElementById("paymentHistorySection");
    const historyBody = document.getElementById("paymentHistoryBody");
    const historyEmpty = document.getElementById("paymentHistoryEmpty");
    const refreshPaymentHistory = async billNo => {
        historySection.hidden = false;
        historyBody.replaceChildren();
        historyEmpty.hidden = true;
        try {
            const result = await getBillPaymentHistory(billNo);
            if (!result.success) throw new Error(result.message || "Could not load payment history.");
            const rows = result.history || [];
            paymentHistoryRows = rows;
            rows.forEach((item, index) => {
                const tr = document.createElement("tr");
                const actionCell = document.createElement("td");
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "history-edit-btn";
                editButton.dataset.editRow = String(item.rowNumber);
                editButton.textContent = "Edit";
                actionCell.appendChild(editButton);
                tr.appendChild(actionCell);
                [index + 1, item.paymentDate, item.paymentMethod, item.receiptNo || "—", money(item.paymentAmount), money(item.balance), item.addedBy || ""].forEach(value => {
                    const td = document.createElement("td");
                    td.textContent = value;
                    tr.appendChild(td);
                });
                historyBody.appendChild(tr);
            });
            historyEmpty.textContent = rows.length ? "" : "No previous payments for this bill.";
            historyEmpty.hidden = rows.length > 0;
        } catch (_) {
            historyEmpty.textContent = "Could not load payment history.";
            historyEmpty.hidden = false;
        }
    };
    const refreshBalance = () => {
        if (!currentBill) return;
        const entered = Math.max(0, Number(amountInput.value) || 0);
        const editableAmount = editingPayment ? Number(editingPayment.paymentAmount || 0) : 0;
        const projectedBalance = Math.max(0, Number(currentBill.balance) + editableAmount - entered);
        fill("detailBalance", money(projectedBalance));
        fill("detailPaid", money(Number(currentBill.totalAmount) - projectedBalance));
    };
    amountInput.addEventListener("input", refreshBalance);

    searchForm.addEventListener("submit", async event => {
        event.preventDefault();
        details.hidden = true;
        currentBill = null;
        showMessage("Searching…");
        const button = document.getElementById("searchBillBtn"); button.disabled = true;
        try {
            const result = await getBillPaymentInfo(billInput.value.trim());
            if (!result.success) throw new Error(result.message || "Could not search this bill.");
            if (!result.found) { showMessage("No matching Bill No was found in the database.", "error"); return; }
            currentBill = result.bill;
            fill("detailBill", currentBill.billNo);
            fill("detailDate", currentBill.date);
            fill("detailExpectedDate", currentBill.expectedDate);
            fill("detailFarmer", currentBill.farmer);
            fill("detailBatch", currentBill.batch);
            fill("detailCustomer", currentBill.customer);
            fill("detailNob", Number(currentBill.totalNob || 0).toLocaleString());
            fill("detailWeight", money(currentBill.totalWeight));
            fill("detailPrice", money(currentBill.totalPrice));
            fill("detailAmount", money(currentBill.totalAmount));
            fill("detailPaid", money(currentBill.paidAmount));
            fill("detailBalance", money(currentBill.balance));
            amountInput.max = Number(currentBill.balance || 0).toFixed(2);
            details.hidden = false;
            await refreshPaymentHistory(currentBill.billNo);
            showMessage(Number(currentBill.balance) <= 0 ? "This bill is fully paid." : "Bill found. Enter the payment details below.", Number(currentBill.balance) <= 0 ? "success" : "");
        } catch (error) { showMessage(error.message || "Unable to search the bill.", "error"); }
        finally { button.disabled = false; }
    });

    document.getElementById("paymentForm").addEventListener("submit", async event => {
        event.preventDefault();
        if (!currentBill) return;
        const paymentAmount = Number(amountInput.value);
        const maxPayment = Number(currentBill.balance) + (editingPayment ? Number(editingPayment.paymentAmount || 0) : 0);
        if (!(paymentAmount > 0) || paymentAmount > maxPayment + 0.000001) { showMessage("Payment amount must be greater than zero and no more than the available bill balance.", "error"); return; }
        saveButton.disabled = true; saveButton.textContent = editingPayment ? "Updating…" : "Saving…";
        try {
            const result = await saveBillPayment({ billNo: currentBill.billNo, editRow: editingPayment ? editingPayment.rowNumber : undefined, paymentDate: paymentDateInput.value, paymentMethod: document.getElementById("paymentMethod").value, receiptNo: document.getElementById("receiptNo").value.trim(), paymentAmount, addedBy: user.name || user.username });
            if (!result.success) throw new Error(result.message || "Payment could not be saved.");
            currentBill.balance = Number(result.balance);
            currentBill.paidAmount = Math.max(0, Number(currentBill.totalAmount) - currentBill.balance);
            fill("detailPaid", money(currentBill.paidAmount));
            fill("detailBalance", money(currentBill.balance));
            amountInput.max = currentBill.balance.toFixed(2);
            const wasEditing = Boolean(editingPayment);
            showMessage(`${wasEditing ? "Payment updated" : "Payment saved"}. Remaining balance: ${money(result.balance)}.`, "success");
            editingPayment = null;
            saveButton.textContent = "Save Payment";
            document.getElementById("clearBillBtn").textContent = "Clear";
            await refreshPaymentHistory(currentBill.billNo);
            document.getElementById("paymentForm").reset();
            paymentDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        } catch (error) { showMessage(error.message || "Unable to save payment.", "error"); }
        finally { saveButton.disabled = false; if (!editingPayment) saveButton.textContent = "Save Payment"; else saveButton.textContent = "Update Payment"; }
    });

    historyBody.addEventListener("click", event => {
        const button = event.target.closest("[data-edit-row]");
        if (!button) return;
        const rowNumber = Number(button.dataset.editRow);
        const item = paymentHistoryRows.find(row => Number(row.rowNumber) === rowNumber);
        if (!item) return;
        editingPayment = item;
        button.closest("tr").remove();
        paymentDateInput.value = item.paymentDate || "";
        document.getElementById("paymentMethod").value = item.paymentMethod || "";
        document.getElementById("receiptNo").value = item.receiptNo || "";
        amountInput.value = Number(item.paymentAmount || 0).toFixed(2);
        amountInput.max = (Number(currentBill.balance) + Number(item.paymentAmount || 0)).toFixed(2);
        saveButton.textContent = "Update Payment";
        document.getElementById("clearBillBtn").textContent = "Cancel Edit";
        refreshBalance();
        showMessage("Payment loaded for editing. Save to replace the existing row.");
        document.getElementById("paymentForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });

    document.getElementById("clearBillBtn").addEventListener("click", async () => {
        if (editingPayment) {
            editingPayment = null;
            document.getElementById("paymentForm").reset();
            paymentDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            amountInput.max = Number(currentBill.balance).toFixed(2);
            fill("detailPaid", money(currentBill.paidAmount));
            fill("detailBalance", money(currentBill.balance));
            saveButton.textContent = "Save Payment";
            document.getElementById("clearBillBtn").textContent = "Clear";
            showMessage("Editing cancelled.");
            await refreshPaymentHistory(currentBill.billNo);
            return;
        }
        details.hidden = true; historySection.hidden = true; currentBill = null; billInput.value = ""; document.getElementById("paymentForm").reset(); showMessage(""); billInput.focus();
    });
});
