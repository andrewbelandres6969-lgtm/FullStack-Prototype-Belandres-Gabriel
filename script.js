// Full-Stack Web App Guide Implementation (Frontend-only SPA)

// Phase 4: Storage
const STORAGE_KEY = 'ipt_demo_v1';

// In-memory DB representation
window.db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

let currentUser = null;
let editAccountEmail = null;
let editEmployeeId = null;

// Utilities -------------------------------------------------------------
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      seedInitialData();
      saveToStorage();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid data');
    }
    window.db = {
      accounts: parsed.accounts || [],
      departments: parsed.departments || [],
      employees: parsed.employees || [],
      requests: parsed.requests || []
    };
  } catch (e) {
    console.warn('Storage corrupted or missing, seeding fresh data.', e);
    seedInitialData();
    saveToStorage();
  }
}

function seedInitialData() {
  window.db = {
    accounts: [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'admin',
        verified: true
      }
    ],
    departments: [
      { id: 'dept-eng', name: 'Engineering', description: 'Engineering department' },
      { id: 'dept-hr', name: 'HR', description: 'Human Resources' }
    ],
    employees: [],
    requests: []
  };
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function showToast(message, type = 'primary') {
  const toastEl = document.getElementById('app-toast');
  const bodyEl = document.getElementById('app-toast-body');
  if (!toastEl || !bodyEl) return;

  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  bodyEl.textContent = message;
  const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl);
  bsToast.show();
}

function findAccountByEmail(email) {
  return window.db.accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
}

// Phase 3: Auth State ---------------------------------------------------
function setAuthState(isAuth, user) {
  currentUser = isAuth ? user : null;
  const body = document.body;
  body.classList.toggle('authenticated', !!isAuth);
  body.classList.toggle('not-authenticated', !isAuth);
  body.classList.toggle('is-admin', !!(isAuth && user && user.role === 'admin'));

  const navUsername = document.getElementById('nav-username');
  if (navUsername) {
    if (isAuth && user) {
      navUsername.textContent = `${user.firstName} ${user.lastName}`;
    } else {
      navUsername.textContent = 'User';
    }
  }
}

function initAuthFromToken() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    setAuthState(false);
    return;
  }
  const acc = findAccountByEmail(token);
  if (acc && acc.verified) {
    setAuthState(true, acc);
  } else {
    localStorage.removeItem('auth_token');
    setAuthState(false);
  }
}

function logout() {
  localStorage.removeItem('auth_token');
  setAuthState(false);
  navigateTo('#/');
  showToast('Logged out successfully', 'secondary');
}

// Phase 2: Routing ------------------------------------------------------
const ROUTES = {
  '#/': 'home-page',
  '': 'home-page',
  '#/register': 'register-page',
  '#/verify-email': 'verify-email-page',
  '#/login': 'login-page',
  '#/profile': 'profile-page',
  '#/accounts': 'accounts-page',
  '#/departments': 'departments-page',
  '#/employees': 'employees-page',
  '#/my-requests': 'my-requests-page'
};

const AUTH_PROTECTED_ROUTES = ['#/profile', '#/accounts', '#/departments', '#/employees', '#/my-requests'];
const ADMIN_ROUTES = ['#/accounts', '#/departments', '#/employees'];

function navigateTo(hash) {
  if (window.location.hash === hash) {
    handleRouting();
  } else {
    window.location.hash = hash;
  }
}

function handleRouting() {
  let hash = window.location.hash || '#/';
  if (!ROUTES[hash]) {
    hash = '#/';
  }

  // Auth guard
  const isAuth = !!currentUser;
  const isAdmin = isAuth && currentUser.role === 'admin';

  if (!isAuth && AUTH_PROTECTED_ROUTES.includes(hash)) {
    showToast('Please log in to continue', 'warning');
    navigateTo('#/login');
    return;
  }

  if (!isAdmin && ADMIN_ROUTES.includes(hash)) {
    showToast('Admin access required', 'danger');
    navigateTo('#/');
    return;
  }

  const pageId = ROUTES[hash];
  document.querySelectorAll('.page').forEach(sec => {
    sec.classList.toggle('active', sec.id === pageId);
  });

  // Route-specific render hooks
  switch (hash) {
    case '#/profile':
      renderProfile();
      break;
    case '#/accounts':
      renderAccountsList();
      break;
    case '#/departments':
      renderDepartments();
      break;
    case '#/employees':
      populateEmployeeDepartmentOptions();
      renderEmployeesTable();
      break;
    case '#/my-requests':
      renderRequestsTable();
      break;
    case '#/verify-email':
      renderVerifyEmail();
      break;
    default:
      break;
  }
}

// Phase 5: Profile ------------------------------------------------------
function renderProfile() {
  const container = document.getElementById('profile-content');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = '<p class="text-muted">No user loaded.</p>';
    return;
  }

  const roleBadge = currentUser.role === 'admin'
    ? '<span class="badge bg-danger ms-2">Admin</span>'
    : '<span class="badge bg-secondary ms-2">Employee</span>';

  container.innerHTML = `
    <dl class="row">
      <dt class="col-sm-3">Name</dt>
      <dd class="col-sm-9">${currentUser.firstName} ${currentUser.lastName}</dd>
      <dt class="col-sm-3">Email</dt>
      <dd class="col-sm-9">${currentUser.email}</dd>
      <dt class="col-sm-3">Role</dt>
      <dd class="col-sm-9 text-capitalize">${currentUser.role}${roleBadge}</dd>
      <dt class="col-sm-3">Verified</dt>
      <dd class="col-sm-9">${currentUser.verified ? 'Yes' : 'No'}</dd>
    </dl>
  `;
}

// Phase 3: Registration / Verification / Login --------------------------
function setupAuthHandlers() {
  // Registration
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const firstName = document.getElementById('reg-first-name').value.trim();
      const lastName = document.getElementById('reg-last-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorEl = document.getElementById('register-error');
      errorEl.textContent = '';

      if (!firstName || !lastName || !email || !password) {
        errorEl.textContent = 'All fields are required.';
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
      }
      if (findAccountByEmail(email)) {
        errorEl.textContent = 'An account with that email already exists.';
        return;
      }

      window.db.accounts.push({
        firstName,
        lastName,
        email,
        password,
        role: 'employee',
        verified: false
      });
      saveToStorage();

      localStorage.setItem('unverified_email', email);
      showToast('Registration successful. Please verify your email.', 'success');
      navigateTo('#/verify-email');
    });
  }

  // Verify email
  const verifyBtn = document.getElementById('verify-email-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      const email = localStorage.getItem('unverified_email');
      if (!email) {
        showToast('No pending verification.', 'warning');
        return;
      }
      const acc = findAccountByEmail(email);
      if (!acc) {
        showToast('Account not found for verification.', 'danger');
        return;
      }
      acc.verified = true;
      saveToStorage();
      localStorage.removeItem('unverified_email');
      showToast('Email verified! You can now log in.', 'success');
      navigateTo('#/login');
    });
  }

  // Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      errorEl.textContent = '';

      const acc = findAccountByEmail(email);
      if (!acc || acc.password !== password || !acc.verified) {
        errorEl.textContent = 'Invalid credentials or email not verified.';
        return;
      }

      localStorage.setItem('auth_token', acc.email);
      setAuthState(true, acc);
      showToast('Logged in successfully', 'success');
      navigateTo('#/profile');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  // Edit Profile (simple alert per guide)
  const editProfileBtn = document.getElementById('edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      alert('Edit Profile is not implemented in this prototype.');
    });
  }
}

function renderVerifyEmail() {
  const email = localStorage.getItem('unverified_email');
  const el = document.getElementById('verify-email-text');
  if (!el) return;
  if (email) {
    el.textContent = `Verification email sent to ${email}. Click the button below to simulate verification.`;
  } else {
    el.textContent = 'No email to verify at the moment.';
  }
}

// Phase 6: Admin Features -----------------------------------------------
// Accounts
function renderAccountsList() {
  const tbody = document.getElementById('accounts-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  window.db.accounts.forEach(acc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${acc.firstName} ${acc.lastName}</td>
      <td>${acc.email}</td>
      <td class="text-capitalize">${acc.role}</td>
      <td>${acc.verified ? '✔️' : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-email="${acc.email}">Edit</button>
        <button class="btn btn-sm btn-outline-warning me-1" data-action="reset" data-email="${acc.email}">Reset PW</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-email="${acc.email}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setupAccountsHandlers() {
  const addBtn = document.getElementById('add-account-btn');
  const formWrapper = document.getElementById('account-form-wrapper');
  const cancelBtn = document.getElementById('cancel-account-edit-btn');
  const form = document.getElementById('account-form');
  const formTitle = document.getElementById('account-form-title');
  const errorEl = document.getElementById('account-form-error');
  const tbody = document.getElementById('accounts-tbody');

  if (addBtn && formWrapper && form && formTitle && errorEl) {
    addBtn.addEventListener('click', () => {
      editAccountEmail = null;
      form.reset();
      document.getElementById('acc-role').value = 'employee';
      document.getElementById('acc-verified').checked = false;
      errorEl.textContent = '';
      formTitle.textContent = 'Add Account';
      formWrapper.classList.remove('d-none');
    });
  }

  if (cancelBtn && formWrapper) {
    cancelBtn.addEventListener('click', () => {
      formWrapper.classList.add('d-none');
      errorEl.textContent = '';
    });
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const firstName = document.getElementById('acc-first-name').value.trim();
      const lastName = document.getElementById('acc-last-name').value.trim();
      const email = document.getElementById('acc-email').value.trim();
      const password = document.getElementById('acc-password').value;
      const role = document.getElementById('acc-role').value;
      const verified = document.getElementById('acc-verified').checked;
      errorEl.textContent = '';

      if (!firstName || !lastName || !email || (!editAccountEmail && !password)) {
        errorEl.textContent = 'Please fill all required fields.';
        return;
      }
      if (password && password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
      }

      if (!editAccountEmail) {
        if (findAccountByEmail(email)) {
          errorEl.textContent = 'Email already in use.';
          return;
        }
        window.db.accounts.push({
          firstName,
          lastName,
          email,
          password,
          role,
          verified
        });
        showToast('Account created', 'success');
      } else {
        const acc = findAccountByEmail(editAccountEmail);
        if (!acc) {
          errorEl.textContent = 'Account not found.';
          return;
        }
        acc.firstName = firstName;
        acc.lastName = lastName;
        acc.email = email;
        if (password) acc.password = password;
        acc.role = role;
        acc.verified = verified;

        // If we edited the currently logged-in account, refresh auth token and state.
        if (currentUser && currentUser.email === editAccountEmail) {
          localStorage.setItem('auth_token', acc.email);
          setAuthState(true, acc);
        }
        showToast('Account updated', 'success');
      }

      saveToStorage();
      formWrapper.classList.add('d-none');
      renderAccountsList();
    });
  }

  if (tbody) {
    tbody.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const email = btn.getAttribute('data-email');
      const acc = findAccountByEmail(email);
      if (!acc) return;

      if (action === 'edit') {
        editAccountEmail = email;
        document.getElementById('acc-first-name').value = acc.firstName;
        document.getElementById('acc-last-name').value = acc.lastName;
        document.getElementById('acc-email').value = acc.email;
        document.getElementById('acc-password').value = '';
        document.getElementById('acc-role').value = acc.role;
        document.getElementById('acc-verified').checked = acc.verified;
        errorEl.textContent = '';
        formTitle.textContent = 'Edit Account';
        formWrapper.classList.remove('d-none');
      } else if (action === 'reset') {
        const pw = prompt('Enter new password (min 6 chars):');
        if (!pw) return;
        if (pw.length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }
        acc.password = pw;
        saveToStorage();
        showToast('Password reset successfully', 'success');
      } else if (action === 'delete') {
        if (currentUser && currentUser.email === acc.email) {
          alert('You cannot delete your own account while logged in.');
          return;
        }
        if (!confirm(`Delete account for ${acc.email}?`)) return;
        window.db.accounts = window.db.accounts.filter(a => a.email !== acc.email);
        saveToStorage();
        renderAccountsList();
        showToast('Account deleted', 'secondary');
      }
    });
  }
}

// Departments
function renderDepartments() {
  const tbody = document.getElementById('departments-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  window.db.departments.forEach(dep => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dep.name}</td>
      <td>${dep.description}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setupDepartmentsHandlers() {
  const addBtn = document.getElementById('add-department-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      alert('Adding departments is not implemented in this prototype.');
    });
  }
}

// Employees
function populateEmployeeDepartmentOptions() {
  const select = document.getElementById('emp-department');
  if (!select) return;
  select.innerHTML = '';
  window.db.departments.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep.id;
    opt.textContent = dep.name;
    select.appendChild(opt);
  });
}

function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.db.employees.forEach(emp => {
    const dep = window.db.departments.find(d => d.id === emp.departmentId);
    const depName = dep ? dep.name : 'Unknown';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.id}</td>
      <td>${emp.userEmail}</td>
      <td>${emp.position}</td>
      <td>${depName}</td>
      <td>${emp.hireDate}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit-emp" data-id="${emp.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete-emp" data-id="${emp.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setupEmployeesHandlers() {
  const addBtn = document.getElementById('add-employee-btn');
  const wrapper = document.getElementById('employee-form-wrapper');
  const cancelBtn = document.getElementById('cancel-employee-edit-btn');
  const form = document.getElementById('employee-form');
  const formTitle = document.getElementById('employee-form-title');
  const errorEl = document.getElementById('employee-form-error');
  const tbody = document.getElementById('employees-tbody');

  if (addBtn && wrapper && form && formTitle && errorEl) {
    addBtn.addEventListener('click', () => {
      editEmployeeId = null;
      form.reset();
      populateEmployeeDepartmentOptions();
      errorEl.textContent = '';
      formTitle.textContent = 'Add Employee';
      wrapper.classList.remove('d-none');
    });
  }

  if (cancelBtn && wrapper) {
    cancelBtn.addEventListener('click', () => {
      wrapper.classList.add('d-none');
      errorEl.textContent = '';
    });
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('emp-id').value.trim();
      const userEmail = document.getElementById('emp-email').value.trim();
      const position = document.getElementById('emp-position').value.trim();
      const departmentId = document.getElementById('emp-department').value;
      const hireDate = document.getElementById('emp-hire-date').value;
      errorEl.textContent = '';

      if (!id || !userEmail || !position || !departmentId || !hireDate) {
        errorEl.textContent = 'All fields are required.';
        return;
      }

      if (!findAccountByEmail(userEmail)) {
        errorEl.textContent = 'User email must match an existing account.';
        return;
      }

      if (!editEmployeeId) {
        if (window.db.employees.some(e => e.id === id)) {
          errorEl.textContent = 'Employee ID already exists.';
          return;
        }
        window.db.employees.push({
          id,
          userEmail,
          position,
          departmentId,
          hireDate
        });
        showToast('Employee added', 'success');
      } else {
        const emp = window.db.employees.find(e => e.id === editEmployeeId);
        if (!emp) {
          errorEl.textContent = 'Employee not found.';
          return;
        }
        emp.id = id;
        emp.userEmail = userEmail;
        emp.position = position;
        emp.departmentId = departmentId;
        emp.hireDate = hireDate;
        showToast('Employee updated', 'success');
      }

      saveToStorage();
      wrapper.classList.add('d-none');
      renderEmployeesTable();
    });
  }

  if (tbody) {
    tbody.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const emp = window.db.employees.find(e => e.id === id);
      if (!emp) return;

      if (action === 'edit-emp') {
        editEmployeeId = id;
        document.getElementById('emp-id').value = emp.id;
        document.getElementById('emp-email').value = emp.userEmail;
        document.getElementById('emp-position').value = emp.position;
        populateEmployeeDepartmentOptions();
        document.getElementById('emp-department').value = emp.departmentId;
        document.getElementById('emp-hire-date').value = emp.hireDate;
        errorEl.textContent = '';
        formTitle.textContent = 'Edit Employee';
        wrapper.classList.remove('d-none');
      } else if (action === 'delete-emp') {
        if (!confirm(`Delete employee ${emp.id}?`)) return;
        window.db.employees = window.db.employees.filter(e2 => e2.id !== emp.id);
        saveToStorage();
        renderEmployeesTable();
        showToast('Employee deleted', 'secondary');
      }
    });
  }
}

// Phase 7: User Requests -----------------------------------------------
function createRequestItemRow(name = '', qty = '') {
  const row = document.createElement('div');
  row.className = 'request-item-row';
  row.innerHTML = `
    <input type="text" class="form-control" placeholder="Item name" value="${name}">
    <input type="number" class="form-control" placeholder="Qty" min="1" value="${qty}">
    <button type="button" class="btn btn-outline-danger btn-sm">&times;</button>
  `;
  const removeBtn = row.querySelector('button');
  removeBtn.addEventListener('click', () => {
    row.remove();
  });
  return row;
}

function renderRequestsTable() {
  const tbody = document.getElementById('requests-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!currentUser) return;

  const requests = window.db.requests.filter(r => r.employeeEmail.toLowerCase() === currentUser.email.toLowerCase());
  requests.forEach(req => {
    const itemsSummary = req.items.map(i => `${i.name} (x${i.qty})`).join(', ');
    let badgeClass = 'bg-warning text-dark';
    if (req.status === 'Approved') badgeClass = 'bg-success';
    if (req.status === 'Rejected') badgeClass = 'bg-danger';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.date}</td>
      <td>${req.type}</td>
      <td>${itemsSummary}</td>
      <td><span class="badge ${badgeClass}">${req.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function setupRequestsHandlers() {
  const addBtn = document.getElementById('add-request-btn');
  const wrapper = document.getElementById('request-form-wrapper');
  const cancelBtn = document.getElementById('cancel-request-btn');
  const form = document.getElementById('request-form');
  const itemsContainer = document.getElementById('request-items-container');
  const addItemBtn = document.getElementById('add-request-item-btn');
  const errorEl = document.getElementById('request-form-error');

  if (addBtn && wrapper && itemsContainer && addItemBtn && errorEl) {
    addBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Please log in to create requests.', 'warning');
        return;
      }
      wrapper.classList.remove('d-none');
      errorEl.textContent = '';
      itemsContainer.innerHTML = '';
      itemsContainer.appendChild(createRequestItemRow());
    });
  }

  if (cancelBtn && wrapper) {
    cancelBtn.addEventListener('click', () => {
      wrapper.classList.add('d-none');
      errorEl.textContent = '';
    });
  }

  if (addItemBtn && itemsContainer) {
    addItemBtn.addEventListener('click', () => {
      itemsContainer.appendChild(createRequestItemRow());
    });
  }

  if (form && itemsContainer) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentUser) {
        errorEl.textContent = 'You must be logged in.';
        return;
      }
      const type = document.getElementById('req-type').value;
      const rows = Array.from(itemsContainer.querySelectorAll('.request-item-row'));
      const items = [];
      rows.forEach(row => {
        const [nameInput, qtyInput] = row.querySelectorAll('input');
        const name = nameInput.value.trim();
        const qty = parseInt(qtyInput.value, 10);
        if (name && !isNaN(qty) && qty > 0) {
          items.push({ name, qty });
        }
      });

      if (items.length === 0) {
        errorEl.textContent = 'Please add at least one item with a quantity.';
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString();

      window.db.requests.push({
        id: `req-${Date.now()}`,
        type,
        items,
        status: 'Pending',
        date: dateStr,
        employeeEmail: currentUser.email
      });
      saveToStorage();
      wrapper.classList.add('d-none');
      renderRequestsTable();
      showToast('Request submitted', 'success');
    });
  }
}

// Initialization --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initAuthFromToken();

  setupAuthHandlers();
  setupAccountsHandlers();
  setupDepartmentsHandlers();
  setupEmployeesHandlers();
  setupRequestsHandlers();

  window.addEventListener('hashchange', handleRouting);

  if (!window.location.hash) {
    navigateTo('#/');
  } else {
    handleRouting();
  }
});

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret';

// Allow frontend connection
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}));

// Parse JSON
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Server is running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
