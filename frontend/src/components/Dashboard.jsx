import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard({ onEdit }) {
    const { t, locale } = useLanguage();
    const { token, logout } = useAuth();
    const [summary, setSummary] = useState({
        daily: { total_sales: 0, total_weight: 0 },
        monthly: { total_sales: 0, total_weight: 0 },
        yearly: { total_sales: 0, total_weight: 0 },
        allTime: { total_sales: 0, total_weight: 0 }
    });
    const [recentSales, setRecentSales] = useState([]);

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const summaryRes = await fetch('https://farm-management-worker.jsa-app.workers.dev/api/sales/summary', { headers });
            if (summaryRes.status === 401) {
                logout();
                return;
            }
            const summaryData = await summaryRes.json();
            setSummary(summaryData);

            const salesRes = await fetch('https://farm-management-worker.jsa-app.workers.dev/api/sales', { headers });
            if (salesRes.status === 401) {
                logout();
                return;
            }
            const salesData = await salesRes.json();
            setRecentSales(salesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const handleDelete = async (saleId) => {
        if (!confirm(t('delete') + '?')) return;

        try {
            const res = await fetch(`https://farm-management-worker.jsa-app.workers.dev/api/sales/${saleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                logout();
                return;
            }

            if (res.ok) {
                alert('Deleted successfully');
                fetchData(); // Refresh the data
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete');
        }
    };

    const StatCard = ({ title, sales, weight }) => (
        <div className="card stat-card">
            <h3>{t(title)}</h3>
            <div className="stat-row">
                <span>{t('totalSales')}:</span>
                <span className="value">฿{sales?.toLocaleString()}</span>
            </div>
            <div className="stat-row">
                <span>{t('totalWeight')}:</span>
                <span className="value">{Number(weight || 0).toFixed(2)} {locale === 'th' ? 'กก.' : 'Kg'}</span>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title="daily" sales={summary.daily.total_sales} weight={summary.daily.total_weight} />
                <StatCard title="monthly" sales={summary.monthly.total_sales} weight={summary.monthly.total_weight} />
                <StatCard title="yearly" sales={summary.yearly.total_sales} weight={summary.yearly.total_weight} />
                <StatCard title="allTime" sales={summary.allTime.total_sales} weight={summary.allTime.total_weight} />
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>{t('recentSales')}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ fontSize: '0.95rem' }}>
                        <thead>
                            <tr>
                                <th>{t('image')}</th>
                                <th>{t('date')}</th>
                                <th>{t('customer')}</th>
                                <th>{t('weight')}</th>
                                <th>{t('pricePerKg')}</th>
                                <th>{t('totalSales')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td>
                                        <img
                                            src={`https://farm-management-worker.jsa-app.workers.dev/api/images/${sale.image_key}`}
                                            alt="Sale"
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => window.open(`https://farm-management-worker.jsa-app.workers.dev/api/images/${sale.image_key}`, '_blank')}
                                        />
                                    </td>
                                    <td>{sale.date}</td>
                                    <td>{sale.customer_name}</td>
                                    <td>{Number(sale.weight_kg).toFixed(2)}</td>
                                    <td>฿{Number(sale.price_per_kg).toFixed(2)}</td>
                                    <td style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                                        ฿{sale.total_price.toLocaleString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'var(--accent-color)' }}
                                                onClick={() => onEdit(sale.id)}
                                            >
                                                {t('update')}
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.8)', color: '#fff' }}
                                                onClick={() => handleDelete(sale.id)}
                                            >
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
