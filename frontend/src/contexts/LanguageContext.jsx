import React, { createContext, useState, useContext } from 'react';

const translations = {
    en: {
        appTitle: 'Farm Management',
        addSale: 'Add Sale',
        dashboard: 'Dashboard',
        date: 'Date',
        weight: 'Weight (Kg)',
        pricePerKg: 'Price per Kg',
        customer: 'Customer',
        image: 'Image',
        submit: 'Record Sale',
        recentSales: 'Recent Sales',
        daily: 'Daily',
        monthly: 'Monthly',
        yearly: 'Yearly',
        allTime: 'All Time',
        totalSales: 'Total Sales',
        totalWeight: 'Total Weight',
        saleRecorded: 'Sale recorded successfully!',
        login: 'Login',
        register: 'Register',
        username: 'Username',
        password: 'Password',
        welcome: 'Welcome',
        logout: 'Logout',
        delete: 'Delete',
        update: 'Update',
        editSale: 'Edit Sale',
        actions: 'Actions',
        notes: 'Notes',
        addNote: 'Add Note',
        editNote: 'Edit Note',
        searchNotes: 'Search notes...',
        noteTitle: 'Title',
        noteContent: 'Content',
        noNotesFound: 'No notes found',
        save: 'Save',
        cancel: 'Cancel',
        expenses: 'Expenses',
        addExpense: 'Add Expense',
        editExpense: 'Edit Expense',
        itemName: 'Item Name',
        amount: 'Amount',
        category: 'Category',
        totalExpenses: 'Total Expenses',
        total: 'Total',
        noExpensesFound: 'No expenses found',
        insertImage: 'Insert Image'
    },
    th: {
        appTitle: 'ระบบจัดการสวน',
        addSale: 'บันทึกการขาย',
        dashboard: 'แดชบอร์ด',
        date: 'วันที่',
        weight: 'น้ำหนัก (กก.)',
        pricePerKg: 'ราคาต่อ กก.',
        customer: 'ลูกค้า',
        image: 'รูปภาพ',
        submit: 'บันทึก',
        recentSales: 'รายการขายล่าสุด',
        daily: 'รายวัน',
        monthly: 'รายเดือน',
        yearly: 'รายปี',
        allTime: 'ทั้งหมด',
        totalSales: 'ยอดขายรวม',
        totalWeight: 'น้ำหนักรวม',
        saleRecorded: 'บันทึกข้อมูลเรียบร้อยแล้ว!',
        login: 'เข้าสู่ระบบ',
        register: 'ลงทะเบียน',
        username: 'ชื่อผู้ใช้',
        password: 'รหัสผ่าน',
        welcome: 'ยินดีต้อนรับ',
        logout: 'ออกจากระบบ',
        delete: 'ลบ',
        update: 'แก้ไข',
        editSale: 'แก้ไขการขาย',
        actions: 'การดำเนินการ',
        notes: 'บันทึก',
        addNote: 'เพิ่มบันทึก',
        editNote: 'แก้ไขบันทึก',
        searchNotes: 'ค้นหาบันทึก...',
        noteTitle: 'หัวข้อ',
        noteContent: 'เนื้อหา',
        noNotesFound: 'ไม่พบบันทึก',
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        expenses: 'รายจ่าย',
        addExpense: 'เพิ่มรายจ่าย',
        editExpense: 'แก้ไขรายจ่าย',
        itemName: 'รายการ',
        amount: 'จำนวนเงิน',
        category: 'หมวดหมู่',
        totalExpenses: 'รวมรายจ่าย',
        total: 'รวม',
        noExpensesFound: 'ไม่พบรายการรายจ่าย',
        insertImage: 'แทรกรูปภาพ'
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [locale, setLocale] = useState('th'); // Default to Thai

    const t = (key) => {
        return translations[locale][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
