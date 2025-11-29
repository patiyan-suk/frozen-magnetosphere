import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Notes() {
    const { t } = useLanguage();
    const { token } = useAuth();
    const [notes, setNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchNotes = async () => {
        try {
            const url = searchQuery
                ? `https://farm-management-worker.jsa-app.workers.dev/api/notes/search?q=${encodeURIComponent(searchQuery)}`
                : 'https://farm-management-worker.jsa-app.workers.dev/api/notes';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setNotes(data);
        } catch (error) {
            console.error('Failed to fetch notes:', error);
        }
    };

    useEffect(() => {
        if (token) fetchNotes();
    }, [token, searchQuery]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingNote
                ? `https://farm-management-worker.jsa-app.workers.dev/api/notes/${editingNote.id}`
                : 'https://farm-management-worker.jsa-app.workers.dev/api/notes';

            const method = editingNote ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
                setIsAdding(false);
                setEditingNote(null);
                fetchNotes();
            }
        } catch (error) {
            console.error('Failed to save note:', error);
        }
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setFormData({
            title: note.title,
            content: note.content,
            date: note.date
        });
        setIsAdding(true);
    };

    const handleDelete = async (noteId) => {
        if (!confirm(t('delete') + '?')) return;

        try {
            const res = await fetch(`https://farm-management-worker.jsa-app.workers.dev/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchNotes();
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingNote(null);
        setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>{t('notes')}</h2>
                {!isAdding && (
                    <button className="btn" onClick={() => setIsAdding(true)}>
                        {t('addNote')}
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingNote ? t('editNote') : t('addNote')}</h3>
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
                            <label>{t('noteTitle')}</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('noteTitle')}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('noteContent')}</label>
                            <textarea
                                required
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder={t('noteContent')}
                                rows="6"
                                style={{ resize: 'vertical' }}
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

            <div className="card" style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder={t('searchNotes')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                />
            </div>

            <div className="grid">
                {notes.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {t('noNotesFound')}
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginBottom: '0.25rem' }}>{note.title}</h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {note.date}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn"
                                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'var(--accent-color)' }}
                                        onClick={() => handleEdit(note)}
                                    >
                                        {t('update')}
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.8)', color: '#fff' }}
                                        onClick={() => handleDelete(note.id)}
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                {note.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
