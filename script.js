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

        // Sub-view logic for dashboard/members
        const shopsMain = document.getElementById('shopsMain');
        const dashNavLink = document.getElementById('dashNavLink');
        const membersNavLink = document.getElementById('membersNavLink');
        const shopsNavLink = document.getElementById('shopsNavLink');

        if (viewName === 'dashboard' || viewName === 'members' || viewName === 'shops') {
            views.dashboard.style.display = 'block';

            // Hide all sub-views first
            dashMain.style.display = 'none';
            membersMain.style.display = 'none';
            shopsMain.style.display = 'none';

            // Remove active class from all nav links
            if (dashNavLink) dashNavLink.classList.remove('active');
            if (membersNavLink) membersNavLink.classList.remove('active');
            if (shopsNavLink) shopsNavLink.classList.remove('active');

            if (viewName === 'dashboard') {
                dashMain.style.display = 'block';
                if (dashNavLink) dashNavLink.classList.add('active');
                fetchWarranties();
            } else if (viewName === 'members') {
                membersMain.style.display = 'block';
                if (membersNavLink) membersNavLink.classList.add('active');
                fetchMembers();
            } else if (viewName === 'shops') {
                shopsMain.style.display = 'block';
                if (shopsNavLink) shopsNavLink.classList.add('active');
                fetchShops();
            }
        } else if (views[viewName]) {
            views[viewName].style.display = 'block';
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('smilecare_staff_session');
            currentUser = null;
            showView('login');
        });
    }

    // --- NAVIGATION LINKS ---
    const dashNavLink = document.getElementById('dashNavLink');
    if (dashNavLink) dashNavLink.addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); });

    const membersNavLink = document.getElementById('membersNavLink');
    if (membersNavLink) membersNavLink.addEventListener('click', (e) => { e.preventDefault(); showView('members'); });

    const shopsNavLink = document.getElementById('shopsNavLink');
    if (shopsNavLink) shopsNavLink.addEventListener('click', (e) => { e.preventDefault(); showView('shops'); });

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
                (r.policyNumber && r.policyNumber.includes(searchTerm)) ||
                (r.memberId && r.memberId.toLowerCase().includes(searchTerm)) ||
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
                const statusClass = r.payment.status === 'Paid' ? 'status-paid' : 'status-pending';
                paymentStatus = `<span class="status-badge ${statusClass}">${statusText}</span>`;
            } else {
                const paidCount = r.payment.schedule.filter(s => s.status === 'Paid').length;
                const totalCount = 3;
                const statusClass = paidCount === totalCount ? 'status-paid' : 'status-pending';
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
                    <td data-label="เลขกรมธรรม์" style="font-weight: 600; color: var(--primary);">${r.policyNumber || '-'}</td>
                    <td data-label="รหัสสมาชิก">${r.memberId || '-'}</td>
                    <td data-label="ชื่อลูกค้า">${r.customer.firstName} ${r.customer.lastName}</td>
                    <td data-label="เบอร์โทรศัพท์">${r.customer.phone}</td>
                    <td data-label="รุ่นอุปกรณ์">${r.device.model}</td>
                    <td data-label="แพ็กเกจ"><span style="color: var(--primary); font-weight: 500;">${r.package.plan}</span></td>
                    <td data-label="ประกันคงเหลือ">${timeRemainingText}</td>
                    <td data-label="ร้านค้า">${r.shopName || '-'}</td>
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

        // Add listeners to print buttons (Contract Document)
        document.querySelectorAll('.print-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(`document.html?id=${btn.dataset.id}`, '_blank');
            });
        });
    }

    function openReceipt(data) {
        localStorage.setItem('smilecare_receipt_data', JSON.stringify(data));
        window.open('vat.html', '_blank');
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
            document.getElementById('policyNumber').value = data.policyNumber || '';
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
            populateShopsDropdown(data.shopName);

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
        document.getElementById('policyNumber').value = '';
        document.getElementById('memberId').readOnly = false;
        document.getElementById('memberId').value = ''; // Will be populated by lookup or manual entry
        document.getElementById('paymentManagementSection').style.display = 'none';
        document.getElementById('initialPaymentCheck').style.display = 'block';
        const initialPaidCheck = document.getElementById('initialPaidCheck');
        if (initialPaidCheck) initialPaidCheck.checked = false;

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
        populateShopsDropdown();
    }

    async function populateShopsDropdown(selectedShop = '') {
        const shopSelect = document.getElementById('shopName');
        if (!shopSelect) return;

        try {
            const res = await fetch('/api/shops');
            const shops = await res.json();

            shopSelect.innerHTML = '<option value="" disabled selected>เลือกสรรร้านค้า</option>';
            shops.forEach(shop => {
                const option = document.createElement('option');
                option.value = shop.shopName;
                option.textContent = shop.shopName;
                if (selectedShop && shop.shopName === selectedShop) {
                    option.selected = true;
                }
                shopSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Populate shops error:', err);
            shopSelect.innerHTML = '<option value="" disabled selected>ไม่สามารถโหลดข้อมูลร้านค้าได้</option>';
        }
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

                // Add Print button for full payment
                const printBtn = document.createElement('button');
                printBtn.type = 'button';
                printBtn.className = 'receive-btn';
                printBtn.style.background = 'var(--secondary)';
                printBtn.style.marginTop = '0.5rem';
                printBtn.textContent = 'พิมพ์ใบเสร็จ';
                printBtn.onclick = () => openReceipt({
                    policyNumber: data.policyNumber,
                    receiptNo: 'RC-' + data.policyNumber + '-F',
                    paidDate: new Date(data.payment.paidDate).toLocaleString('th-TH'),
                    shopName: data.shopName,
                    staffName: currentUser ? currentUser.staffName : (data.staffName || '-'),
                    customerName: `${data.customer.firstName} ${data.customer.lastName}`,
                    customerPhone: data.customer.phone,
                    customerAddress: data.customer.address,
                    amount: data.package.price,
                    description: `ชำระเต็มจำนวน แพ็กเกจ ${data.package.plan}`
                });
                statusText.appendChild(document.createElement('br'));
                statusText.appendChild(printBtn);
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
                        <td>
                            ${isPaid ? `<button type="button" class="print-receipt-btn receive-btn" style="background: var(--secondary); padding: 4px 8px;" data-no="${s.installmentNo}" data-amt="${s.amount}" data-date="${s.paidDate}">พิมพ์</button>` : '-'}
                        </td>
                    </tr>
                `;
            }).join('');

            // Add listeners to individual installment buttons
            body.querySelectorAll('.receive-btn:not(.print-receipt-btn)').forEach(btn => {
                btn.addEventListener('click', () => {
                    receivePayment(btn.dataset.id, parseInt(btn.dataset.no), parseInt(btn.dataset.amt));
                });
            });

            // Add listeners to individual print buttons
            body.querySelectorAll('.print-receipt-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openReceipt({
                        policyNumber: data.policyNumber,
                        receiptNo: 'RC-' + data.policyNumber + '-' + btn.dataset.no,
                        paidDate: new Date(btn.dataset.date).toLocaleString('th-TH'),
                        shopName: data.shopName,
                        staffName: currentUser ? currentUser.staffName : (data.staffName || '-'),
                        customerName: `${data.customer.firstName} ${data.customer.lastName}`,
                        customerPhone: data.customer.phone,
                        customerAddress: data.customer.address,
                        amount: parseInt(btn.dataset.amt),
                        description: `ชำระค่าเบี้ยประกัน งวดที่ ${btn.dataset.no}`
                    });
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

                // Show Success Modal with Print Option
                const modalTitle = document.querySelector('#successModal h2');
                const modalText = document.querySelector('#successModal p');
                const printBtn = document.getElementById('printReceiptBtn');

                modalTitle.textContent = 'รับชำระเงินสำเร็จ!';
                modalText.textContent = `บันทึกการชำระเงินจำนวน ${amount.toLocaleString()} บาท เรียบร้อยแล้ว`;

                printBtn.style.display = 'block';
                printBtn.onclick = () => {
                    openReceipt({
                        policyNumber: updatedData.policyNumber,
                        receiptNo: 'RC-' + updatedData.policyNumber + '-' + (installmentNo || 'F'),
                        paidDate: new Date().toLocaleString('th-TH'),
                        shopName: updatedData.shopName,
                        staffName: currentUser ? currentUser.staffName : (updatedData.staffName || '-'),
                        customerName: `${updatedData.customer.firstName} ${updatedData.customer.lastName}`,
                        customerPhone: updatedData.customer.phone,
                        customerAddress: updatedData.customer.address,
                        amount: amount,
                        description: installmentNo ? `ชำระค่าเบี้ยประกัน งวดที่ ${installmentNo}` : `ชำระเต็มจำนวน แพ็กเกจ ${updatedData.package.plan}`
                    });
                };

                document.getElementById('successModal').style.display = 'flex';
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

    async function searchMembers(query) {
        const resultsBox = document.getElementById('memberSearchResults');
        if (!query || query.length < 2) {
            resultsBox.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`/api/members/lookup?query=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.success && data.members && data.members.length > 0) {
                resultsBox.innerHTML = data.members.map(m => `
                    <div class="search-result-item" onclick="selectMember(${JSON.stringify(m).replace(/"/g, '&quot;')})">
                        <div class="search-result-info">
                            <span class="search-result-name">${m.firstName} ${m.lastName}</span>
                            <span class="search-result-sub">${m.phone}</span>
                        </div>
                        <span class="search-result-tag">${m.memberId}</span>
                    </div>
                `).join('');
                resultsBox.style.display = 'block';
            } else {
                resultsBox.innerHTML = '<div class="search-result-item" style="cursor: default; color: #94a3b8;">ไม่พบข้อมูลสมาชิก</div>';
                resultsBox.style.display = 'block';
            }
        } catch (err) {
            console.error('Member search error:', err);
        }
    }

    window.selectMember = function (member) {
        document.getElementById('memberId').value = member.memberId;
        document.getElementById('firstName').value = member.firstName;
        document.getElementById('lastName').value = member.lastName;
        document.getElementById('phone').value = member.phone;
        document.getElementById('address').value = member.shippingAddress || member.idCardAddress || '';

        if (member.birthdate) {
            const dob = new Date(member.birthdate);
            document.getElementById('dobDay').value = dob.getDate();
            document.getElementById('dobMonth').value = dob.getMonth() + 1;
            document.getElementById('dobYear').value = dob.getFullYear() + 543;
            updateAge();
        }

        document.getElementById('memberSearchResults').style.display = 'none';
        document.getElementById('memberSearchInput').value = `${member.firstName} ${member.lastName} (${member.memberId})`;
    };

    // Member Search Event Listener
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => searchMembers(e.target.value.trim()), 300);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !document.getElementById('memberSearchResults').contains(e.target)) {
                document.getElementById('memberSearchResults').style.display = 'none';
            }
        });
    }

    async function checkDuplicate(field, value) {
        const input = document.getElementById(field === 'serialNumber' ? 'serialNumber' : 'imei');
        const label = input.parentNode.querySelector('label');
        const baseLabel = field === 'serialNumber' ? 'เลขซีเรียล (Serial Number)' : 'เลข IMEI';

        if (!value) {
            input.classList.remove('input-error');
            label.innerHTML = baseLabel;
            label.style.color = '';
            updateSubmitButtonState();
            return false;
        }

        const excludeId = isEditMode ? document.getElementById('editRecordId').value : null;
        const type = field === 'serialNumber' ? 'serial' : 'imei';

        try {
            const url = `/api/warranties/check-duplicate?type=${type}&value=${encodeURIComponent(value)}${excludeId ? `&excludeId=${excludeId}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.exists) {
                input.classList.add('input-error');
                label.innerHTML = `${baseLabel} <span style="color: #ef4444;">*เลขนี้เคยลงทะเบียนแล้ว</span>`;
                label.style.color = '#ef4444';
                updateSubmitButtonState();
                return true;
            } else {
                input.classList.remove('input-error');
                label.innerHTML = baseLabel;
                label.style.color = '';
                updateSubmitButtonState();
                return false;
            }
        } catch (err) {
            console.error('Duplicate check error:', err);
            return false;
        }
    }

    function updateSubmitButtonState() {
        const submitBtn = document.querySelector('#warrantyForm button[type="submit"]');
        const hasErrors = document.querySelectorAll('#warrantyForm .input-error').length > 0;

        if (hasErrors) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }

    // Duplicate Check Event Listeners
    const serialInput = document.getElementById('serialNumber');
    if (serialInput) {
        serialInput.addEventListener('blur', () => {
            checkDuplicate('serialNumber', serialInput.value.trim());
        });
    }

    const imeiInputReg = document.getElementById('imei');
    if (imeiInputReg) {
        imeiInputReg.addEventListener('blur', () => {
            checkDuplicate('imei', imeiInputReg.value.trim());
        });
    }

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
            shopName: document.getElementById('shopName').value,
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
                const printBtn = document.getElementById('printReceiptBtn');

                if (isEditMode) {
                    modalTitle.textContent = 'อัปเดตข้อมูลสำเร็จ!';
                    modalText.textContent = 'ข้อมูลประกันภัยได้ถูกอัปเดตลงในระบบเรียบร้อยแล้ว';
                } else {
                    modalTitle.textContent = 'ลงทะเบียนสำเร็จ!';
                    modalText.textContent = 'ข้อมูลการลงทะเบียนประกันภัยของคุณถูกบันทึกเรียบร้อยแล้ว';

                    // If marked as paid, show print button
                    const markPaid = document.getElementById('initialPaidCheck')?.checked;
                    if (markPaid) {
                        printBtn.style.display = 'block';
                        printBtn.onclick = () => {
                            openReceipt({
                                policyNumber: data.policyNumber,
                                receiptNo: 'RC-' + data.policyNumber + '-1',
                                paidDate: new Date().toLocaleString('th-TH'),
                                shopName: data.shopName,
                                staffName: currentUser ? currentUser.staffName : (payload.staffName || '-'),
                                customerName: `${data.customer.firstName} ${data.customer.lastName}`,
                                customerPhone: data.customer.phone,
                                customerAddress: data.customer.address,
                                amount: payload.payment.method === 'Full Payment' ? payload.package.price : payload.payment.schedule[0].amount,
                                description: payload.payment.method === 'Full Payment' ? `ชำระเต็มจำนวน แพ็กเกจ ${payload.package.plan}` : `ชำระค่าเบี้ยประกัน งวดที่ 1`
                            });
                        };
                    }
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
        document.getElementById('printReceiptBtn').style.display = 'none'; // Reset button
        showView('dashboard');
    });

    // Dashboard Filters listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('paymentFilter').addEventListener('change', applyFilters);

    // --- MEMBERS LOGIC ---
    async function fetchMembers() {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            renderMembers(data);
        } catch (err) {
            console.error('Fetch members error:', err);
        }
    }

    function renderMembers(members) {
        const body = document.getElementById('membersBody');
        const empty = document.getElementById('membersEmptyState');

        if (members.length === 0) {
            empty.style.display = 'block';
            body.innerHTML = '';
            return;
        }

        empty.style.display = 'none';
        body.innerHTML = members.map(m => `
            <tr>
                <td data-label="รหัสสมาชิก" style="font-weight: 600;">${m.memberId || '-'}</td>
                <td data-label="ชื่อ-นามสกุล">${m.firstName} ${m.lastName}</td>
                <td data-label="เบอร์โทรศัพท์">${m.phone}</td>
                <td data-label="ที่อยู่ตามบัตร">${m.idCardAddress || '-'}</td>
                <td data-label="จัดการ">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="edit-member-btn edit-btn" data-id="${m._id}" title="แก้ไข">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for edit buttons
        body.querySelectorAll('.edit-member-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                editMember(id);
            });
        });
    }

    async function editMember(id) {
        try {
            const res = await fetch(`/api/members/${id}`);
            const member = await res.json();

            document.getElementById('memberModalTitle').textContent = 'แก้ไขข้อมูลสมาชิก';
            document.getElementById('editMemberId').value = member._id;
            document.getElementById('memberIdDisplay').value = member.memberId;
            document.getElementById('memberFirstName').value = member.firstName;
            document.getElementById('memberLastName').value = member.lastName;
            document.getElementById('memberPhone').value = member.phone;
            document.getElementById('memberBirthdate').value = member.birthdate ? member.birthdate.split('T')[0] : '';
            document.getElementById('memberIdCardAddress').value = member.idCardAddress || '';
            document.getElementById('memberShippingAddress').value = member.shippingAddress || '';

            // New Thai ID fields
            document.getElementById('memberPrefix').value = member.prefix || '';
            document.getElementById('memberGender').value = member.gender || '';
            document.getElementById('memberFirstNameEn').value = member.firstNameEn || '';
            document.getElementById('memberLastNameEn').value = member.lastNameEn || '';
            document.getElementById('memberCitizenId').value = member.citizenId || '';
            document.getElementById('memberIssueDate').value = member.issueDate ? member.issueDate.split('T')[0] : '';
            document.getElementById('memberExpiryDate').value = member.expiryDate ? member.expiryDate.split('T')[0] : '';

            const photoContainer = document.getElementById('smartCardPhotoContainer');
            const photoImg = document.getElementById('smartCardPhoto');
            if (member.photo) {
                photoImg.src = member.photo;
                photoContainer.style.display = 'block';
            } else {
                photoContainer.style.display = 'none';
            }

            document.getElementById('memberModal').style.display = 'flex';
        } catch (err) {
            console.error('Fetch member error:', err);
            alert('ไม่สามารถดึงข้อมูลสมาชิกได้');
        }
    }

    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            document.getElementById('memberModalTitle').textContent = 'เพิ่มข้อมูลสมาชิก';
            document.getElementById('memberForm').reset();
            document.getElementById('editMemberId').value = '';
            document.getElementById('memberIdDisplay').value = ''; // Clear display
            document.getElementById('memberCitizenId').value = '';
            document.getElementById('memberPrefix').value = '';
            document.getElementById('memberGender').value = '';
            document.getElementById('memberFirstNameEn').value = '';
            document.getElementById('memberLastNameEn').value = '';
            document.getElementById('memberIssueDate').value = '';
            document.getElementById('memberExpiryDate').value = '';
            document.getElementById('smartCardPhotoContainer').style.display = 'none';
            document.getElementById('smartCardPhoto').src = '';

            // Re-enable fields if they were disabled (though we keep them readonly for SC integration)
            document.getElementById('memberFirstName').readOnly = true;
            document.getElementById('memberLastName').readOnly = true;
            document.getElementById('memberBirthdate').readOnly = true;
            document.getElementById('memberIdCardAddress').readOnly = true;

            document.getElementById('memberModal').style.display = 'flex';
        });
    }

    const closeMemberModal = document.getElementById('closeMemberModal');
    if (closeMemberModal) {
        closeMemberModal.addEventListener('click', () => {
            document.getElementById('memberModal').style.display = 'none';
        });
    }

    const copyAddressBtn = document.getElementById('copyAddressBtn');
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', () => {
            const idAddress = document.getElementById('memberIdCardAddress').value;
            document.getElementById('memberShippingAddress').value = idAddress;
        });
    }

    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editMemberId').value;
            const payload = {
                firstName: document.getElementById('memberFirstName').value,
                lastName: document.getElementById('memberLastName').value,
                phone: document.getElementById('memberPhone').value,
                birthdate: document.getElementById('memberBirthdate').value,
                idCardAddress: document.getElementById('memberIdCardAddress').value,
                address: document.getElementById('memberIdCardAddress').value,
                shippingAddress: document.getElementById('memberShippingAddress').value,
                citizenId: document.getElementById('memberCitizenId').value,
                prefix: document.getElementById('memberPrefix').value,
                firstNameEn: document.getElementById('memberFirstNameEn').value,
                lastNameEn: document.getElementById('memberLastNameEn').value,
                gender: document.getElementById('memberGender').value,
                issueDate: document.getElementById('memberIssueDate').value,
                expiryDate: document.getElementById('memberExpiryDate').value,
                photo: document.getElementById('smartCardPhoto').src.startsWith('data:image') ? document.getElementById('smartCardPhoto').src : undefined
            };

            try {
                const url = editId ? `/api/members/${editId}` : '/api/members';
                const method = editId ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('memberModal').style.display = 'none';
                    fetchMembers();
                } else {
                    alert(data.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                console.error('Submit member error:', err);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        });
    }

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

    // --- SHOPS LOGIC ---
    async function fetchShops() {
        try {
            const res = await fetch('/api/shops');
            const data = await res.json();
            renderShops(data);
        } catch (err) {
            console.error('Fetch shops error:', err);
        }
    }

    function renderShops(shops) {
        const body = document.getElementById('shopsBody');
        const empty = document.getElementById('shopsEmptyState');

        if (shops.length === 0) {
            if (empty) empty.style.display = 'block';
            body.innerHTML = '';
            return;
        }

        if (empty) empty.style.display = 'none';
        body.innerHTML = shops.map(s => `
            <tr>
                <td data-label="รหัสร้านค้า" style="font-weight: 600;">${s.shopId}</td>
                <td data-label="ชื่อร้านค้า">${s.shopName}</td>
                <td data-label="สถานที่ตั้ง">${s.location || '-'}</td>
                <td data-label="จัดการ">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="edit-shop-btn edit-btn" data-id="${s._id}" title="แก้ไข">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for edit buttons
        document.querySelectorAll('.edit-shop-btn').forEach(btn => {
            btn.addEventListener('click', () => editShop(btn.dataset.id));
        });
    }

    const shopModal = document.getElementById('shopModal');
    const shopForm = document.getElementById('shopForm');

    const addShopBtn = document.getElementById('addShopBtn');
    if (addShopBtn) {
        addShopBtn.addEventListener('click', () => {
            isEditMode = false;
            shopForm.reset();
            document.getElementById('editShopId').value = '';
            document.getElementById('shopModalTitle').textContent = 'เพิ่มข้อมูลร้านค้า';
            document.getElementById('shopIdDisplay').value = 'ออกโดยระบบอัตโนมัติ';
            shopModal.style.display = 'flex';
        });
    }

    const closeShopModal = document.getElementById('closeShopModal');
    if (closeShopModal) {
        closeShopModal.addEventListener('click', () => {
            shopModal.style.display = 'none';
        });
    }

    if (shopForm) {
        shopForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editShopId').value;
            const payload = {
                shopName: document.getElementById('shopName').value,
                location: document.getElementById('shopLocation').value
            };

            try {
                const url = editId ? `/api/shops/${editId}` : '/api/shops';
                const method = editId ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    shopModal.style.display = 'none';
                    fetchShops();
                } else {
                    alert('ข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกข้อมูลได้'));
                }
            } catch (err) {
                console.error('Shop save error:', err);
            }
        });
    }

    async function editShop(id) {
        try {
            const res = await fetch('/api/shops');
            const shops = await res.json();
            const shop = shops.find(s => s._id === id);

            if (shop) {
                isEditMode = true;
                const editIdElem = document.getElementById('editShopId');
                const titleElem = document.getElementById('shopModalTitle');
                const idDisplayElem = document.getElementById('shopIdDisplay');
                const nameElem = document.getElementById('shopName');
                const locElem = document.getElementById('shopLocation');

                if (editIdElem) editIdElem.value = shop._id;
                if (titleElem) titleElem.textContent = 'แก้ไขข้อมูลร้านค้า';
                if (idDisplayElem) idDisplayElem.value = shop.shopId;
                if (nameElem) nameElem.value = shop.shopName;
                // Update to match new ID
                const modalNameElem = document.getElementById('shopModalName');
                if (modalNameElem) modalNameElem.value = shop.shopName;
                if (locElem) locElem.value = shop.location || '';

                shopModal.style.display = 'flex';
            }
        } catch (err) {
            console.error('Edit shop error:', err);
        }
    }

    // --- SMART CARD INTEGRATION ---
    async function connectSmartCard() {
        const btn = document.getElementById('readSmartCardBtn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '⌛ กำลังเรียกอ่านข้อมูลจาก Smart Card Agent...';

            const response = await fetch('http://localhost:3001/api/read-card');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'ไม่สามารถอ่านข้อมูลจากบัตรได้');
            }

            const result = await response.json();

            if (result.success && result.data) {
                populateMemberFormFromCard(result.data);
                alert('อ่านข้อมูลจากบัตรเรียบร้อยแล้ว');
            } else {
                throw new Error(result.message || 'ข้อมูลไม่สมบูรณ์');
            }

        } catch (err) {
            console.error('Smart Card Error:', err);
            // Specific error message if agent is not running
            if (err.name === 'TypeError' && err.message.toLowerCase().includes('failed to fetch')) {
                alert('⚠️ ไม่สามารถเชื่อมต่อกับ Smart Card Agent ได้\n\n1. ตรวจสอบว่ารันคำสั่ง "npm start" ในโฟลเดอร์ smartcard-agent\n2. เข้าไปที่ http://localhost:3001 เพื่อเช็คสถานะ');
            } else {
                alert('ข้อผิดพลาด: ' + err.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    function populateMemberFormFromCard(data) {
        document.getElementById('memberCitizenId').value = data.citizenId;
        document.getElementById('memberPrefix').value = data.prefix;
        document.getElementById('memberFirstName').value = data.firstName;
        document.getElementById('memberLastName').value = data.lastName;
        document.getElementById('memberFirstNameEn').value = data.firstNameEn;
        document.getElementById('memberLastNameEn').value = data.lastNameEn;
        document.getElementById('memberBirthdate').value = data.birthdate;
        document.getElementById('memberGender').value = data.gender;
        document.getElementById('memberIdCardAddress').value = data.address;
        document.getElementById('memberIssueDate').value = data.issueDate;
        document.getElementById('memberExpiryDate').value = data.expiryDate;

        const photoContainer = document.getElementById('smartCardPhotoContainer');
        const photoImg = document.getElementById('smartCardPhoto');
        if (data.photo) {
            photoImg.src = data.photo;
            photoContainer.style.display = 'block';
        } else {
            photoContainer.style.display = 'none';
        }
    }

    // Helper to decode TIS-620 to UTF-8 (Common for Thai ID Card reading)
    function decodeThai(buffer) {
        const decoder = new TextDecoder('tis-620');
        return decoder.decode(buffer).trim();
    }

    const readSmartCardBtn = document.getElementById('readSmartCardBtn');
    if (readSmartCardBtn) {
        readSmartCardBtn.addEventListener('click', connectSmartCard);
    }

    // --- INITIALIZATION ---
    if (currentUser) {
        updateStaffInfo();
        showView('dashboard');
    } else {
        showView('login');
    }
    console.log('SmileCare script initialized successfully.');
});
