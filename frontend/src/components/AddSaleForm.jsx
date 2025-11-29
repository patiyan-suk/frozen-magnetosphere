import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function AddSaleForm({ onSaleAdded, editingSaleId, onCancelEdit }) {
    const { t } = useLanguage();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        pricePerKg: '',
        customer: '',
        image: null
    });

    // Fetch existing sale data when editing
    useEffect(() => {
        if (editingSaleId) {
            const fetchSale = async () => {
                try {
                    const res = await fetch(`https://farm-management-worker.jsa-app.workers.dev/api/sales/${editingSaleId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const sale = await res.json();
                        setFormData({
                            date: sale.date,
                            weight: sale.weight_kg,
                            pricePerKg: sale.price_per_kg,
                            customer: sale.customer_name,
                            image: null // Don't pre-populate image
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch sale:', error);
                }
            };
            fetchSale();
        } else {
            // Reset form when not editing
            setFormData({
                date: new Date().toISOString().split('T')[0],
                weight: '',
                pricePerKg: '',
                customer: '',
                image: null
            });
        }
    }, [editingSaleId, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('date', formData.date);
            data.append('weight', formData.weight);
            data.append('pricePerKg', formData.pricePerKg);
            data.append('customer', formData.customer);
            if (formData.image) {
                data.append('image', formData.image);
            }

            const url = editingSaleId
                ? `https://farm-management-worker.jsa-app.workers.dev/api/sales/${editingSaleId}`
                : 'https://farm-management-worker.jsa-app.workers.dev/api/sales';

            const method = editingSaleId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                body: data,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to save sale');

            const result = await res.json();
            console.log('Sale saved:', result);

            alert(t('saleRecorded'));
            setFormData({
                date: new Date().toISOString().split('T')[0],
                weight: '',
                pricePerKg: '',
                customer: '',
                image: null
            });
            if (onSaleAdded) onSaleAdded();
        } catch (error) {
            console.error(error);
            alert('Failed to save sale');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {editingSaleId ? t('editSale') : t('addSale')}
            </h2>
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
                    <label>{t('weight')}</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    />
                </div>

                <div className="input-group">
                    <label>{t('pricePerKg')}</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={formData.pricePerKg}
                        onChange={e => setFormData({ ...formData, pricePerKg: e.target.value })}
                    />
                </div>

                <div className="input-group">
                    <label>{t('customer')}</label>
                    <input
                        type="text"
                        placeholder={t('customer')}
                        required
                        value={formData.customer}
                        onChange={e => setFormData({ ...formData, customer: e.target.value })}
                    />
                </div>

                <div className="input-group">
                    <label>{t('image')}</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setFormData({ ...formData, image: e.target.files[0] })}
                        style={{ padding: '0.5rem' }}
                    />
                </div>

                <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    {loading ? '...' : t('submit')}
                </button>
            </form>
        </div>
    );
}
