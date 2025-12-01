import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Expenses() {
    const { t } = useLanguage();
    const { token, logout } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({
        daily: { total_expenses: 0 },
        monthly: { total_expenses: 0 },
        yearly: { total_expenses: 0 },
        allTime: { total_expenses: 0 }
    });
    const [isAdding, setIsAdding] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        itemName: '',
        amount: '',
        category: ''
    });

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Summary
            const summaryRes = await fetch('https://farm-management-worker.jsa-app.workers.dev/api/expenses/summary', { headers });
            if (summaryRes.status === 401) {
                logout();
                return;
            }
            const summaryData = await summaryRes.json();
            setSummary(summaryData);

            // Fetch List
            const res = await fetch('https://farm-management-worker.jsa-app.workers.dev/api/expenses', { headers });
            if (res.status === 401) {
                logout();
                return;
            }
            const data = await res.json();
            setExpenses(data);
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingExpense
                ? `https://farm-management-worker.jsa-app.workers.dev/api/expenses/${editingExpense.id}`
                : 'https://farm-management-worker.jsa-app.workers.dev/api/expenses';

            const method = editingExpense ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.status === 401) {
                logout();
                return;
            }

            if (res.ok) {
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    itemName: '',
                    amount: '',
                    category: ''
                });
                setIsAdding(false);
                setEditingExpense(null);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to save expense:', error);
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setFormData({
            date: expense.date,
            itemName: expense.item_name,
            amount: expense.amount,
            category: expense.category || ''
        });
        setIsAdding(true);
    };

    const handleDelete = async (expenseId) => {
        if (!confirm(t('delete') + '?')) return;

        try {
            const res = await fetch(`https://farm-management-worker.jsa-app.workers.dev/api/expenses/${expenseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                logout();
                return;
            }

            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to delete expense:', error);
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingExpense(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            itemName: '',
            amount: '',
            category: ''
        });
    };

    const StatCard = ({ title, amount }) => (
        <div className="card stat-card">
            <h3>{t(title)}</h3>
            <div className="stat-row">
                <span>{t('totalExpenses')}:</span>
                <span className="value" style={{ color: 'var(--accent-color)' }}>
                    ฿{amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>{t('expenses')}</h2>
                {!isAdding && (
                    <button className="btn" onClick={() => setIsAdding(true)}>
                        {t('addExpense')}
                    </button>
                )}
            </div>

            {!isAdding && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <StatCard title="daily" amount={summary.daily.total_expenses} />
                    <StatCard title="monthly" amount={summary.monthly.total_expenses} />
                    <StatCard title="yearly" amount={summary.yearly.total_expenses} />
                    <StatCard title="allTime" amount={summary.allTime.total_expenses} />
                </div>
            )}

            {isAdding && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingExpense ? t('editExpense') : t('addExpense')}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>{t('date')}</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('itemName')}</label>
                            <input
                                type="text"
                                required
                                value={formData.itemName}
                                onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                                placeholder={t('itemName')}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('amount')} (฿)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('category')}</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder={t('category')}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn">
                                {t('save')}
                            </button>
                            <button type="button" className="btn" onClick={handleCancel}
                                style={{ background: 'rgba(128, 128, 128, 0.2)' }}>
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ fontSize: '0.95rem' }}>
                        <thead>
                            <tr>
                                <th>{t('date')}</th>
                                <th>{t('itemName')}</th>
                                <th>{t('category')}</th>
                                <th>{t('amount')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        {t('noExpensesFound')}
                                    </td>
                                </tr>
                            ) : (
                                expenses.map(expense => (
                                    <tr key={expense.id}>
                                        <td>{expense.date}</td>
                                        <td>{expense.item_name}</td>
                                        <td>{expense.category || '-'}</td>
                                        <td style={{ fontWeight: 'bold' }}>
                                            ฿{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'var(--accent-color)' }}
                                                    onClick={() => handleEdit(expense)}
                                                >
                                                    {t('update')}
                                                </button>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.8)', color: '#fff' }}
                                                    onClick={() => handleDelete(expense.id)}
                                                >
                                                    {t('delete')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
