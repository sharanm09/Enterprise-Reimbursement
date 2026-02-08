# Testing Guide - Dummy Users & Dynamic Users

## Overview
The system supports **both dummy test users AND dynamic real users** seamlessly. You can test the entire approval workflow using either approach.

---

## 🎭 Testing Approaches

### **Option 1: Using Dummy Test Users** (Recommended for Quick Testing)

**Test Users Created:**
- 👤 **Employee**: `employee@test.com` → Role: Employee → Manager: manager@test.com
- 👔 **Manager**: `manager@test.com` → Role: Manager
- 👥 **HR**: `hr@test.com` → Role: HR
- 💰 **Finance**: `finance@test.com` → Role: Finance

**How to Use:**
1. **Create Reimbursement as Employee:**
   - Login as `employee@test.com` (or change your role to Employee)
   - Create a reimbursement request
   - Submit it

2. **Approve as Manager:**
   - Login as `manager@test.com` (or change your role to Manager)
   - Go to "Manager Approvals"
   - Approve the items

3. **Approve as HR:**
   - Login as `hr@test.com` (or change your role to HR)
   - Go to "HR Approvals"
   - Approve the items

4. **Approve as Finance:**
   - Login as `finance@test.com` (or change your role to Finance)
   - Go to "Finance Approvals"
   - Approve and mark as paid

**Note:** These dummy users don't require Azure login - they're database-only users for testing.

---

### **Option 2: Using One User with Role Changes** (For Single User Testing)

**Setup:**
- Your superadmin account has `manager_id` set to itself (self-referencing)
- You can change roles dynamically via User Management

**How to Use:**
1. **Create as Employee:**
   - Change your role to `Employee`
   - Create reimbursement
   - Submit it

2. **Approve as Manager:**
   - Change your role to `Manager`
   - Go to "Manager Approvals"
   - You'll see your own items (because manager_id = your ID)
   - Approve them

3. **Approve as HR:**
   - Change your role to `HR`
   - Go to "HR Approvals"
   - Approve items approved by Manager

4. **Approve as Finance:**
   - Change your role to `Finance`
   - Go to "Finance Approvals"
   - Approve and mark as paid

---

### **Option 3: Mixed Approach** (Flexible Testing)

- Create reimbursements as `employee@test.com`
- Approve as your superadmin account (changing roles)
- Or vice versa - create as superadmin, approve as dummy users

---

## 🔄 How It Works Dynamically

### **Manager Approval Flow:**
```
Employee creates reimbursement
  ↓
System checks: employee.manager_id = manager.id
  ↓
Manager sees items where: u.manager_id = logged_in_manager.id
  ↓
Manager approves → Status: approved_by_manager
```

**Works with:**
- ✅ Dummy users (employee@test.com → manager@test.com)
- ✅ Real users (any employee → their assigned manager)
- ✅ Self-reference (your account → yourself when role = Manager)

---

### **HR Approval Flow:**
```
Manager approves item
  ↓
System checks: item.status = 'approved_by_manager'
  ↓
Any user with HR role can see and approve
  ↓
HR approves → Status: approved_by_hr
```

**Works with:**
- ✅ Dummy users (hr@test.com)
- ✅ Real users (any user with HR role)
- ✅ Role changes (your account when role = HR)

**No hr_id needed** - HR role is sufficient!

---

### **Finance Approval Flow:**
```
HR approves item
  ↓
System checks: item.status = 'approved_by_hr'
  ↓
Any user with Finance role can see and approve
  ↓
Finance approves → Status: approved_by_finance
  ↓
Finance marks as paid → Status: paid + Invoice generated
```

**Works with:**
- ✅ Dummy users (finance@test.com)
- ✅ Real users (any user with Finance role)
- ✅ Role changes (your account when role = Finance)

**No finance_id needed** - Finance role is sufficient!

---

## 📋 Key Points

1. **Manager Relationship:**
   - Uses `manager_id` foreign key
   - Must be set for Employee → Manager flow
   - Can be self-referencing for testing

2. **HR & Finance:**
   - **No specific IDs needed**
   - Works based on **role** only
   - Any user with HR/Finance role can approve

3. **Dynamic Nature:**
   - System automatically checks roles and relationships
   - Works with any combination of users
   - No hardcoded user IDs

---

## 🛠️ Scripts Available

1. **`create-test-users.js`** - Creates dummy users for all roles
2. **`setup-test-user.js`** - Sets up self-referencing for single user testing
3. **`update-admin-role.js`** - Changes user role to Superadmin

---

## ✅ Testing Checklist

- [ ] Create reimbursement as Employee
- [ ] See it in Manager Approvals
- [ ] Approve as Manager
- [ ] See it in HR Approvals
- [ ] Approve as HR
- [ ] See it in Finance Approvals
- [ ] Approve as Finance
- [ ] Mark as Paid
- [ ] Verify Invoice generated
- [ ] Check Dashboard stats updated

---

## 🚀 Production Ready

The system is **production-ready** and will work with:
- Real Azure AD users
- Proper manager hierarchies
- Multiple HR and Finance team members
- Dynamic role assignments

All approval flows are **role-based** and **relationship-based**, making it flexible for any organizational structure!


