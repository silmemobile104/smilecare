document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    let currentUser = JSON.parse(localStorage.getItem('smilecare_staff_session'));
    let isEditMode = false;
    let currentEditData = null;
    let allRecords = []; // Global state for filtering
    const PACKAGE_PRICES = { 'Plan A': 799, 'Plan B': 1499, 'Plan C': 1699, 'Plan D': 2399, 'Plan a': 599, 'Plan b': 999, 'Plan c': 1299 };
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';

    // --- DOM ELEMENTS ---
    const views = {
        login: document.getElementById('loginView'),
        dashboard: document.getElementById('dashboardView'),
        registration: document.getElementById('registrationView'),
        staffRegister: document.getElementById('staffRegisterView')
    };

    // --- VIEW CONTROLLER ---
    function showView(viewName) {
        Object.keys(views).forEach(key => {
            if (views[key]) views[key].style.display = 'none';
        });
        if (views[viewName]) {
            views[viewName].style.display = 'block';
            if (viewName === 'dashboard') fetchWarranties();
            if (viewName === 'registration') initRegistrationForm();
        }
    }

    // --- AUTH LOGIC ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('smilecare_staff_session', JSON.stringify(currentUser));
                    updateStaffInfo();
                    showView('dashboard');
                } else {
                    document.getElementById('loginError').style.display = 'block';
                }
            } catch (err) {
                console.error('Login error:', err);
            }
        });
    }

    // --- STAFF REGISTRATION LOGIC ---
    const staffRegisterForm = document.getElementById('staffRegisterForm');
    if (staffRegisterForm) {
        staffRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const staffName = document.getElementById('regStaffName').value;
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staffName, username, password })
                });
                const data = await res.json();
                if (data.success) {
                    alert('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
                    showView('login');
                } else {
                    const errorElem = document.getElementById('regError');
                    errorElem.textContent = data.message || 'การลงทะเบียนล้มเหลว';
                    errorElem.style.display = 'block';
                }
            } catch (err) {
                console.error('Registration error:', err);
            }
        });
    }

    // --- VIEW NAVIGATION ---
    const toRegisterBtn = document.getElementById('toRegister');
    if (toRegisterBtn) toRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); showView('staffRegister'); });

    const toLoginBtn = document.getElementById('toLogin');
    if (toLoginBtn) toLoginBtn.addEventListener('click', (e) => { e.preventDefault(); showView('login'); });

    function updateStaffInfo() {
        if (!currentUser) return;
        const nameElem = document.getElementById('displayStaffName');
        const initialElem = document.getElementById('staffInitial');
        if (nameElem) nameElem.textContent = currentUser.staffName;
        if (initialElem) initialElem.textContent = currentUser.staffName.charAt(0);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('smilecare_staff_session');
            currentUser = null;
            showView('login');
        });
    }

    // --- DASHBOARD LOGIC ---
    async function fetchWarranties() {
        try {
            const res = await fetch('/api/warranties');
            const data = await res.json();
            allRecords = data; // Save to global state
            applyFilters(); // Initial render with filters
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }

    function applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const paymentFilter = document.getElementById('paymentFilter').value;

        const filtered = allRecords.filter(r => {
            // 1. Search filter
            const fullName = `${r.customer.firstName} ${r.customer.lastName}`.toLowerCase();
            const matchesSearch = !searchTerm ||
                r.memberId.toLowerCase().includes(searchTerm) ||
                fullName.includes(searchTerm) ||
                r.customer.phone.includes(searchTerm);

            if (!matchesSearch) return false;

            // 2. Status filter
            const isExpired = new Date(r.warrantyDates.end) < new Date();
            if (statusFilter === 'active' && isExpired) return false;
            if (statusFilter === 'expired' && !isExpired) return false;

            // 3. Payment filter
            if (paymentFilter !== 'all') {
                const method = r.payment.method;
                if (paymentFilter === 'full' && method !== 'Full Payment') return false;
                if (paymentFilter === 'installment' && method !== 'Installment') return false;
                if (paymentFilter === 'installment_complete') {
                    if (method !== 'Installment') return false;
                    const isComplete = r.payment.schedule.every(s => s.status === 'Paid');
                    if (!isComplete) return false;
                }
            }

            return true;
        });

        renderDashboard(filtered);
    }

    function renderDashboard(records) {
        const body = document.getElementById('recordsBody');
        const total = document.getElementById('totalRecords');
        const empty = document.getElementById('emptyState');

        total.textContent = records.length;
        if (records.length === 0) {
            empty.style.display = 'block';
            body.innerHTML = '';
            return;
        }

        empty.style.display = 'none';
        body.innerHTML = records.map(r => {
            const isExpired = new Date(r.warrantyDates.end) < new Date();
            let paymentStatus = '';
            if (r.payment.method === 'Full Payment') {
                const statusText = r.payment.status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ';
                paymentStatus = `<span class="status-badge ${r.payment.status === 'Paid' ? 'status-active' : 'status-expired'}">${statusText}</span>`;
            } else {
                const paidCount = r.payment.schedule.filter(s => s.status === 'Paid').length;
                const totalCount = 3;
                const statusClass = paidCount === totalCount ? 'status-active' : 'status-pending';
                paymentStatus = `<span class="status-badge ${statusClass}">ชำระแล้ว ${paidCount}/${totalCount}</span>`;
            }

            // Calculation for Remaining Time: X Days, Y Hours
            const now = new Date();
            const end = new Date(r.warrantyDates.end);
            const diffMs = end - now;
            let timeRemainingText = '';
            if (diffMs > 0) {
                const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
                const days = Math.floor(totalHours / 24);
                const hours = totalHours % 24;
                timeRemainingText = `${days} วัน, ${hours} ชม.`;
            } else {
                timeRemainingText = 'หมดอายุ';
            }

            const statusBadge = `<span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'หมดอายุ' : 'ปกติ'}</span>`;

            return `
                <tr>
                    <td data-label="รหัสสมาชิก" style="font-weight: 600;">${r.memberId}</td>
                    <td data-label="ชื่อลูกค้า">${r.customer.firstName} ${r.customer.lastName}</td>
                    <td data-label="เบอร์โทรศัพท์">${r.customer.phone}</td>
                    <td data-label="รุ่นอุปกรณ์">${r.device.model}</td>
                    <td data-label="แพ็กเกจ"><span style="color: var(--primary); font-weight: 500;">${r.package.plan}</span></td>
                    <td data-label="ประกันคงเหลือ">${timeRemainingText}</td>
                    <td data-label="ผู้บันทึก">${r.staffName}</td>
                    <td data-label="สถานะ">${statusBadge}</td>
                    <td data-label="การชำระเงิน">${paymentStatus}</td>
                    <td data-label="จัดการ">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="edit-btn" data-id="${r._id}" title="แก้ไขข้อมูล">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="print-btn" data-id="${r._id}" title="พิมพ์เอกสาร">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // Add listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editWarranty(btn.dataset.id));
        });

        // Add listeners to print buttons
        document.querySelectorAll('.print-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(`document.html?id=${btn.dataset.id}`, '_blank');
            });
        });
    }

    document.getElementById('addNewBtn').addEventListener('click', () => {
        isEditMode = false;
        showView('registration');
    });

    async function editWarranty(id) {
        try {
            const res = await fetch(`/api/warranties/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            isEditMode = true;
            currentEditData = data;
            document.getElementById('editRecordId').value = id;

            // Update UI
            document.getElementById('regFormTitle').textContent = 'แก้ไขข้อมูลประกันภัย';
            document.getElementById('regFormSubtitle').textContent = `กำลังแก้ไขรหัสสมาชิก: ${data.memberId}`;
            document.getElementById('memberId').readOnly = true;

            // Show view first to ensure elements are available
            showView('registration');

            // Populate Form
            document.getElementById('memberId').value = data.memberId;
            document.getElementById('firstName').value = data.customer.firstName || '';
            document.getElementById('lastName').value = data.customer.lastName || '';
            document.getElementById('phone').value = data.customer.phone || '';
            if (data.customer.dob) {
                const dob = new Date(data.customer.dob);
                document.getElementById('dobDay').value = dob.getDate();
                document.getElementById('dobMonth').value = dob.getMonth() + 1;
                document.getElementById('dobYear').value = dob.getFullYear() + 543; // To B.E.
                updateAge();
            }
            document.getElementById('address').value = data.customer.address;
            document.getElementById('productType').value = data.device.type;
            toggleIMEIField();
            document.getElementById('model').value = data.device.model;
            document.getElementById('color').value = data.device.color;
            document.getElementById('capacity').value = data.device.capacity;
            document.getElementById('serialNumber').value = data.device.serial;
            document.getElementById('imei').value = data.device.imei || '';
            document.getElementById('deviceValue').value = data.device.deviceValue || '';
            document.getElementById('officialWarrantyEnd').value = formatDate(data.device.officialWarrantyEnd);
            document.getElementById('package').value = data.package.plan;

            document.getElementById('startDate').value = data.warrantyDates.start;
            document.getElementById('endDate').value = data.warrantyDates.end;
            updateDateDisplay();

            // Set payment method
            const paymentRadio = document.querySelector(`input[name="paymentMethod"][value="${data.payment.method}"]`);
            if (paymentRadio) paymentRadio.checked = true;

            updateRemainingDays();
            updatePaymentUI();

            // Show Payment Management Section
            const pmSection = document.getElementById('paymentManagementSection');
            pmSection.style.display = 'block';
            document.getElementById('initialPaymentCheck').style.display = 'none';
            renderPaymentManagement(data);

        } catch (err) {
            console.error('Edit error:', err);
            alert('ไม่สามารถดึงข้อมูลเพื่อแก้ไขได้');
        }
    }

    // --- REGISTRATION LOGIC ---
    function initRegistrationForm() {
        if (isEditMode) return; // Don't reset if editing

        const form = document.getElementById('warrantyForm');
        form.reset();

        document.getElementById('regFormTitle').textContent = 'ลงทะเบียนประกันภัย';
        document.getElementById('regFormSubtitle').textContent = 'ประกันคุ้มครองมือถือ iPhone & iPad';
        document.getElementById('memberId').readOnly = true;
        document.getElementById('paymentManagementSection').style.display = 'none';
        document.getElementById('initialPaymentCheck').style.display = 'block';
        const initialPaidCheck = document.getElementById('initialPaidCheck');
        if (initialPaidCheck) initialPaidCheck.checked = false;

        const memberIdInput = document.getElementById('memberId');
        memberIdInput.value = 'SMC' + Math.floor(Math.random() * 900000 + 100000);

        // Auto-set dates
        const now = new Date();
        const nextYear = new Date(now);
        nextYear.setFullYear(now.getFullYear() + 1);

        document.getElementById('startDate').value = now.toISOString();
        document.getElementById('endDate').value = nextYear.toISOString();
        updateDateDisplay();

        toggleIMEIField();
        updateRemainingDays();
        updatePaymentUI();
    }

    function toggleIMEIField() {
        const productType = document.getElementById('productType').value;
        const imeiGroup = document.getElementById('imeiGroup');
        const imeiInput = document.getElementById('imei');
        if (productType === 'iPad') {
            imeiGroup.style.display = 'none';
            imeiInput.required = false;
            imeiInput.value = '';
        } else {
            imeiGroup.style.display = 'block';
            imeiInput.required = true;
        }
    }

    function updateAge() {
        const day = parseInt(document.getElementById('dobDay').value);
        const month = parseInt(document.getElementById('dobMonth').value);
        const yearBE = parseInt(document.getElementById('dobYear').value);

        if (day && month && yearBE && yearBE > 2400) {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth() + 1;
            const currentYearBE = now.getFullYear() + 543;

            let age = currentYearBE - yearBE;

            // If birthday hasn't occurred yet this year, subtract 1
            if (currentMonth < month || (currentMonth === month && currentDay < day)) {
                age--;
            }

            document.getElementById('age').value = age >= 0 ? age : 0;
        } else {
            document.getElementById('age').value = '';
        }
    }

    function updateDateDisplay() {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        if (start && end) {
            document.getElementById('startDateDisplay').value = new Date(start).toLocaleString('th-TH');
            document.getElementById('endDateDisplay').value = new Date(end).toLocaleString('th-TH');
        }
    }

    function updateRemainingDays() {
        const start = new Date(document.getElementById('startDate').value);
        const end = new Date(document.getElementById('endDate').value);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        document.getElementById('remainingDays').value = diff > 0 ? diff : 0;
    }

    function updatePaymentUI() {
        const plan = document.getElementById('package').value;
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        const price = PACKAGE_PRICES[plan] || 0;

        document.getElementById('packagePriceText').textContent = `${price.toLocaleString()} บาท`;
        document.getElementById('totalPriceText').textContent = `${price.toLocaleString()} บาท`;

        const instContainer = document.getElementById('installmentContainer');
        const instBody = document.getElementById('installmentBody');

        if (method === 'Installment' && price > 0) {
            instContainer.style.display = 'block';
            const perMonth = Math.floor(price / 3);
            const remainder = price % 3;
            const start = new Date(document.getElementById('startDate').value);

            let html = '';
            for (let i = 1; i <= 3; i++) {
                const amt = i === 1 ? perMonth + remainder : perMonth;
                const dueDate = new Date(start); dueDate.setMonth(start.getMonth() + (i - 1));
                const graceDate = new Date(dueDate); graceDate.setDate(dueDate.getDate() + 5);
                html += `<tr><td>#${i}</td><td>${amt.toLocaleString()}</td><td>${dueDate.toLocaleDateString('th-TH')}</td><td><span class="late-deadline">⚠️ ${graceDate.toLocaleDateString('th-TH')}</span></td></tr>`;
            }
            instBody.innerHTML = html;
        } else {
            instContainer.style.display = 'none';
        }
    }

    function renderPaymentManagement(data) {
        const fullSec = document.getElementById('fullPaymentStatus');
        const instSec = document.getElementById('installmentStatus');

        if (data.payment.method === 'Full Payment') {
            fullSec.style.display = 'block';
            instSec.style.display = 'none';
            document.getElementById('fullPaymentAmount').textContent = `${data.package.price.toLocaleString()} บาท`;
            const statusText = document.getElementById('fullPaymentStatusText');
            const confirmBtn = document.getElementById('confirmFullPaymentBtn');

            if (data.payment.status === 'Paid') {
                statusText.innerHTML = `<span class="status-paid">ชำระแล้วเมื่อ ${new Date(data.payment.paidDate).toLocaleDateString('th-TH')}</span>`;
                confirmBtn.style.display = 'none';
            } else {
                statusText.innerHTML = `<span class="status-pending">ค้างชำระ</span>`;
                confirmBtn.style.display = 'block';
                confirmBtn.onclick = () => receivePayment(data._id, null, data.package.price);
            }
        } else {
            fullSec.style.display = 'none';
            instSec.style.display = 'block';
            const body = document.getElementById('paymentStatusBody');
            body.innerHTML = data.payment.schedule.map(s => {
                const isPaid = s.status === 'Paid';
                const isOverdue = !isPaid && new Date(s.dueDate) < new Date();
                const rowClass = isPaid ? 'paid-row' : (isOverdue ? 'overdue-row' : '');

                return `
                    <tr class="${rowClass}">
                        <td>#${s.installmentNo}</td>
                        <td>${s.amount.toLocaleString()}</td>
                        <td>${new Date(s.dueDate).toLocaleDateString('th-TH')}</td>
                        <td>
                            ${isPaid
                        ? `<span class="status-paid">ชำระแล้ว<br><small>${new Date(s.paidDate).toLocaleDateString('th-TH')}</small></span>`
                        : `<span class="status-pending">${isOverdue ? 'เกินกำหนด' : 'ค้างชำระ'}</span>`}
                        </td>
                        <td>
                            ${isPaid ? '-' : `<button type="button" class="receive-btn" data-id="${data._id}" data-no="${s.installmentNo}" data-amt="${s.amount}">รับชำระเงิน</button>`}
                        </td>
                    </tr>
                `;
            }).join('');

            // Add listeners to individual installment buttons
            body.querySelectorAll('.receive-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    receivePayment(btn.dataset.id, parseInt(btn.dataset.no), parseInt(btn.dataset.amt));
                });
            });
        }
    }

    async function receivePayment(id, installmentNo, amount) {
        if (!confirm(`ยืนยันการรับชำระเงินจำนวน ${amount.toLocaleString()} บาท?`)) return;

        try {
            const res = await fetch(`/api/warranties/${id}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installmentNo })
            });
            const data = await res.json();
            if (res.ok) {
                // Refresh modal data
                const updatedRes = await fetch(`/api/warranties/${id}`);
                const updatedData = await updatedRes.json();
                currentEditData = updatedData; // CRITICAL: Update app state
                renderPaymentManagement(updatedData);
                fetchWarranties(); // Refresh dashboard list background
            } else {
                alert(data.message || 'เกิดข้อผิดพลาดในการอัปเดตการชำระเงิน');
            }
        } catch (err) {
            console.error('Payment error:', err);
        }
    }

    // Listeners for form updates
    document.getElementById('productType').addEventListener('change', toggleIMEIField);
    document.getElementById('dobDay').addEventListener('input', updateAge);
    document.getElementById('dobMonth').addEventListener('input', updateAge);
    document.getElementById('dobYear').addEventListener('input', updateAge);
    document.getElementById('package').addEventListener('change', updatePaymentUI);
    document.getElementsByName('paymentMethod').forEach(r => r.addEventListener('change', updatePaymentUI));

    document.getElementById('backToDashBtn').addEventListener('click', () => showView('dashboard'));

    document.getElementById('warrantyForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const plan = document.getElementById('package').value;
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        const price = PACKAGE_PRICES[plan];

        // Auto-generate coverage dates strictly at submission
        const start = isEditMode ? new Date(document.getElementById('startDate').value) : new Date();
        const end = isEditMode ? new Date(document.getElementById('endDate').value) : new Date(start);
        if (!isEditMode) end.setFullYear(start.getFullYear() + 1);

        const schedule = [];
        if (method === 'Installment') {
            const perMonth = Math.floor(price / 3);
            const remainder = price % 3;
            for (let i = 1; i <= 3; i++) {
                const dueDate = new Date(start); dueDate.setMonth(start.getMonth() + (i - 1));
                const graceDate = new Date(dueDate); graceDate.setDate(dueDate.getDate() + 5);

                // Merge status and paidDate if editing and settings match
                let status = 'Pending';
                let paidDate = undefined;

                if (isEditMode && currentEditData && currentEditData.payment.method === 'Installment') {
                    const existing = currentEditData.payment.schedule.find(s => s.installmentNo === i);
                    // Only preserve if the installment number exists
                    // We can be more strict (checking amount/dueDate), but usually user just wants to keep "Paid"
                    if (existing && existing.status === 'Paid') {
                        status = 'Paid';
                        paidDate = existing.paidDate;
                    }
                }

                schedule.push({
                    installmentNo: i,
                    amount: i === 1 ? perMonth + remainder : perMonth,
                    dueDate: dueDate,
                    graceDate: graceDate,
                    status: status,
                    paidDate: paidDate
                });
            }
        }

        const payment = {
            method,
            schedule,
            status: 'Pending',
            paidDate: undefined
        };

        if (isEditMode && currentEditData) {
            if (method === 'Full Payment' && currentEditData.payment.method === 'Full Payment') {
                payment.status = currentEditData.payment.status;
                payment.paidDate = currentEditData.payment.paidDate;
            }
        } else {
            // New Registration - Check for "Mark as Paid"
            const markPaid = document.getElementById('initialPaidCheck')?.checked;
            if (markPaid) {
                if (method === 'Full Payment') {
                    payment.status = 'Paid';
                    payment.paidDate = new Date();
                } else if (method === 'Installment') {
                    payment.schedule[0].status = 'Paid';
                    payment.schedule[0].paidDate = new Date();
                }
            }
        }

        // Create DOB date object
        const dobDay = parseInt(document.getElementById('dobDay').value);
        const dobMonth = parseInt(document.getElementById('dobMonth').value);
        const dobYearBE = parseInt(document.getElementById('dobYear').value);
        const dob = new Date(dobYearBE - 543, dobMonth - 1, dobDay);

        const payload = {
            memberId: document.getElementById('memberId').value,
            staffName: currentUser.staffName,
            customer: {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                phone: document.getElementById('phone').value,
                dob: dob.toISOString(),
                age: parseInt(document.getElementById('age').value),
                address: document.getElementById('address').value
            },
            device: {
                type: document.getElementById('productType').value,
                model: document.getElementById('model').value,
                color: document.getElementById('color').value,
                capacity: document.getElementById('capacity').value,
                serial: document.getElementById('serialNumber').value,
                imei: document.getElementById('imei').value || undefined,
                deviceValue: parseFloat(document.getElementById('deviceValue').value) || 0,
                officialWarrantyEnd: document.getElementById('officialWarrantyEnd').value
            },
            package: { plan, price },
            warrantyDates: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            payment: payment
        };

        try {
            const url = isEditMode ? `/api/warranties/${document.getElementById('editRecordId').value}` : '/api/warranties';
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                const modalTitle = document.querySelector('#successModal h2');
                const modalText = document.querySelector('#successModal p');
                if (isEditMode) {
                    modalTitle.textContent = 'อัปเดตข้อมูลสำเร็จ!';
                    modalText.textContent = 'ข้อมูลประกันภัยได้ถูกอัปเดตลงในระบบเรียบร้อยแล้ว';
                } else {
                    modalTitle.textContent = 'ลงทะเบียนสำเร็จ!';
                    modalText.textContent = 'ข้อมูลการลงทะเบียนประกันภัยของคุณถูกบันทึกเรียบร้อยแล้ว';
                }
                document.getElementById('successModal').style.display = 'flex';
            } else {
                alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } catch (err) {
            console.error('Submit error:', err);
        }
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('successModal').style.display = 'none';
        showView('dashboard');
    });

    // Dashboard Filters listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('paymentFilter').addEventListener('change', applyFilters);

    // --- MOBILE MENU LOGIC ---
    const menuToggle = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        };

        menuToggle.addEventListener('click', toggleMenu);
        sidebarOverlay.addEventListener('click', toggleMenu);

        // Close menu when navigation links are clicked (on mobile)
        sidebar.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    toggleMenu();
                }
            });
        });
    }

    // --- INITIALIZATION ---
    if (currentUser) {
        updateStaffInfo();
        showView('dashboard');
    } else {
        showView('login');
    }
});
