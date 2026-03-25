import { useState, useEffect } from 'react';
import { 
    Users, 
    Plus, 
    Trash2, 
    Search, 
    Loader2, 
    ShieldAlert, 
    Phone, 
    Building, 
    RefreshCw, 
    CheckCircle, 
    X 
} from 'lucide-react';
import { getWorkers, addWorker, removeWorker } from '../../services/api';
import './AdminWorkers.css';

const AdminWorkers = () => {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newWorker, setNewWorker] = useState({ name: '', phone: '', department: 'PWD' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const res = await getWorkers();
            setWorkers(res.workers || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        if (!newWorker.name || newWorker.phone.length < 10) {
            showToast('Please provide a valid name and 10-digit phone', 'error');
            return;
        }
        setAdding(true);
        try {
            const res = await addWorker(newWorker);
            if (res.success) {
                showToast('Worker registered successfully!');
                setShowAddModal(false);
                setNewWorker({ name: '', phone: '', department: 'PWD' });
                fetchWorkers();
            } else {
                showToast(res.message || 'Error adding worker', 'error');
            }
        } catch (err) {
            showToast('Failed to connect to server', 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteWorker = async (phone, name) => {
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
        try {
            const res = await removeWorker(phone);
            if (res.success) {
                showToast(`Worker ${name} removed`);
                fetchWorkers();
            }
        } catch (err) {
            showToast('Failed to remove worker', 'error');
        }
    };

    const filteredWorkers = workers.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        w.phone.includes(searchQuery) ||
        w.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const departmentsCount = new Set(workers.map(w => w.department)).size;

    return (
        <div className="admin-workers-page">
            <div className="container">
                <div className="aw-header">
                    <div>
                        <h1 className="section-title">Field Worker Management</h1>
                        <p className="text-muted text-sm">Register and manage municipal field staff</p>
                    </div>
                    <div className="aw-actions">
                        <button className="btn btn-secondary btn-sm" onClick={fetchWorkers} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} /> Refresh
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                            <Plus size={14} /> Add Worker
                        </button>
                    </div>
                </div>

                <div className="stats-mini-grid">
                    <div className="mini-stat-card">
                        <div className="mstat-val">{workers.length}</div>
                        <div className="mstat-label">Total Workers</div>
                    </div>
                    <div className="mini-stat-card">
                        <div className="mstat-val">{departmentsCount}</div>
                        <div className="mstat-label">Active Departments</div>
                    </div>
                </div>

                <div className="aw-toolbar card">
                    <div className="aw-search">
                        <Search size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by name, phone or department..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="aw-results-count">
                        {filteredWorkers.length} workers found
                    </div>
                </div>

                <div className="card aw-table-card">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={32} className="spin-anim text-muted" />
                            <p style={{ marginTop: '12px' }}>Gathering worker registry...</p>
                        </div>
                    ) : (
                        <div className="table-overflow">
                            <table className="aw-table">
                                <thead>
                                    <tr>
                                        <th>Worker Information</th>
                                        <th>Department</th>
                                        <th>Joined On</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredWorkers.length > 0 ? (
                                        filteredWorkers.map(w => (
                                            <tr key={w.phone} className="worker-row">
                                                <td>
                                                    <div className="worker-info-cell">
                                                        <div className="worker-avatar">{w.name.charAt(0)}</div>
                                                        <div>
                                                            <div className="worker-name">{w.name}</div>
                                                            <div className="worker-phone"><Phone size={10} /> {w.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="dept-tag">
                                                        <Building size={11} /> {w.department}
                                                    </span>
                                                </td>
                                                <td className="text-sm text-muted">
                                                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="text-right">
                                                    <button className="btn-delete" onClick={() => handleDeleteWorker(w.phone, w.name)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                                                <ShieldAlert size={32} className="text-muted" style={{ opacity: 0.3, marginBottom: '8px' }} />
                                                <p className="text-muted">No field workers found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="worker-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="worker-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Register New Worker</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddWorker} className="modal-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Rajesh Kumar"
                                    value={newWorker.name}
                                    onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mobile Number</label>
                                    <input 
                                        type="tel" 
                                        placeholder="10-digit number"
                                        maxLength={10}
                                        value={newWorker.phone}
                                        onChange={e => setNewWorker({...newWorker, phone: e.target.value.replace(/\D/g, '')})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Department</label>
                                    <select 
                                        value={newWorker.department}
                                        onChange={e => setNewWorker({...newWorker, department: e.target.value})}
                                    >
                                        <option value="PWD">PWD (Roads)</option>
                                        <option value="Sanitation">Sanitation</option>
                                        <option value="Water Supply">Water Supply</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Parks">Parks & Gardens</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={adding}>
                                    {adding ? <Loader2 size={14} className="spin-anim" /> : <Plus size={14} />} 
                                    {adding ? 'Registering...' : 'Add Worker'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`aw-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <ShieldAlert size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default AdminWorkers;
