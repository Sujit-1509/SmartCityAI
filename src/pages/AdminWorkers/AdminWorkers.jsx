import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, UserPlus, ShieldAlert, Loader2, Phone, User, Briefcase, Building2, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getWorkers, addWorker, removeWorker } from '../../services/api';
import './AdminWorkers.css';

const AdminWorkers = () => {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWorker, setNewWorker] = useState({ name: '', phone: '', department: 'PWD' });
    const [adding, setAdding] = useState(false);
    
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    // CSV import state
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvRows, setCsvRows] = useState([]);        // parsed rows: { name, phone, department, status }
    const [csvImporting, setCsvImporting] = useState(false);
    const [csvProgress, setCsvProgress] = useState(0);  // 0-100
    const csvFileRef = useRef(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
    };

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const res = await getWorkers();
            if (res.success) {
                setWorkers(res.workers || []);
            } else {
                showToast('Failed to load workers', 'error');
            }
        } catch (err) {
            console.error('Fetch workers failed:', err);
            showToast('Error loading workers roster', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        if (!newWorker.name || !newWorker.phone) return;
        
        setAdding(true);
        try {
            const adminUser = JSON.parse(localStorage.getItem('jansevaai_user') || '{}');
            const data = {
                ...newWorker,
                added_by: adminUser.name || 'Admin'
            };
            const res = await addWorker(data);
            if (res.success) {
                showToast('Worker added successfully', 'success');
                setShowAddModal(false);
                setNewWorker({ name: '', phone: '', department: 'PWD' });
                fetchWorkers(); // reload list
            } else {
                showToast(res.error || 'Failed to add worker', 'error');
            }
        } catch (err) {
            showToast('Error adding worker', 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteWorker = async (phone, name) => {
        if (!window.confirm(`Are you sure you want to remove ${name}? They will lose access.`)) return;
        
        try {
            const res = await removeWorker(phone);
            if (res.success) {
                showToast('Worker removed', 'success');
                setWorkers(prev => prev.filter(w => w.phone !== phone));
            } else {
                showToast(res.error || 'Failed to remove worker', 'error');
            }
        } catch (err) {
            showToast('Error removing worker', 'error');
        }
    };

    const filteredWorkers = workers.filter(w => 
        w.name?.toLowerCase().includes(search.toLowerCase()) || 
        w.phone?.includes(search) ||
        w.department?.toLowerCase().includes(search.toLowerCase())
    );

    // ── CSV Import Logic ──────────────────────────────────────────────────────
    const VALID_DEPARTMENTS = ['PWD', 'Sanitation', 'Water Supply', 'Electricity', 'Parks & Rec'];

    const handleCsvFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) {
                showToast('CSV must have a header row and at least one data row', 'error');
                return;
            }
            // Parse header
            const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
            const nameIdx = header.findIndex(h => h.includes('name'));
            const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number'));
            const deptIdx = header.findIndex(h => h.includes('dept') || h.includes('department'));

            if (nameIdx === -1 || phoneIdx === -1) {
                showToast('CSV must contain "name" and "phone" columns', 'error');
                return;
            }

            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                const name = cols[nameIdx] || '';
                const rawPhone = (cols[phoneIdx] || '').replace(/\D/g, '');
                const phone = rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;
                const deptRaw = deptIdx !== -1 ? (cols[deptIdx] || '') : '';
                const department = VALID_DEPARTMENTS.find(d => d.toLowerCase() === deptRaw.toLowerCase()) || 'PWD';

                if (!name || phone.length !== 10) {
                    rows.push({ name: name || '(empty)', phone: rawPhone || '(empty)', department, status: 'invalid', error: phone.length !== 10 ? 'Invalid phone' : 'Missing name' });
                } else {
                    rows.push({ name, phone, department, status: 'pending' });
                }
            }
            setCsvRows(rows);
            setCsvProgress(0);
        };
        reader.readAsText(file);
        // Reset file input so same file can be re-selected
        e.target.value = '';
    };

    const handleCsvImport = async () => {
        const validRows = csvRows.filter(r => r.status === 'pending');
        if (validRows.length === 0) {
            showToast('No valid rows to import', 'error');
            return;
        }
        setCsvImporting(true);
        const adminUser = JSON.parse(localStorage.getItem('jansevaai_user') || '{}');
        let done = 0;

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            if (row.status !== 'pending') continue;

            try {
                const res = await addWorker({
                    name: row.name,
                    phone: row.phone,
                    department: row.department,
                    added_by: adminUser.name || 'Admin',
                });
                setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: res.success ? 'success' : 'failed', error: res.error } : r));
            } catch (err) {
                setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed', error: err.message } : r));
            }
            done++;
            setCsvProgress(Math.round((done / validRows.length) * 100));
        }

        setCsvImporting(false);
        fetchWorkers();
        const successCount = csvRows.filter(r => r.status === 'success').length;
        showToast(`Imported ${successCount} of ${validRows.length} workers`, successCount > 0 ? 'success' : 'error');
    };

    const csvValidCount = csvRows.filter(r => r.status === 'pending').length;
    const csvInvalidCount = csvRows.filter(r => r.status === 'invalid').length;
    const csvSuccessCount = csvRows.filter(r => r.status === 'success').length;
    const csvFailedCount = csvRows.filter(r => r.status === 'failed').length;

    return (
        <div className="admin-workers animate-fade-in">
            <div className="page-header">
                <div>
                    <h1>Worker Management</h1>
                    <p className="text-muted">Manage field workers and permissions</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => { setCsvRows([]); setCsvProgress(0); setShowCsvModal(true); }}>
                        <FileSpreadsheet size={18} /> Import CSV
                    </button>
                    <button className="btn btn-primary premium-btn" onClick={() => setShowAddModal(true)}>
                        <UserPlus size={18} /> Add Worker
                    </button>
                </div>
            </div>

            <div className="workers-glass-panel">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or department..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="worker-stats-mini mb-2" style={{ marginTop: '16px', padding: '0 20px' }}>
                    <div className="wstat">
                        <span className="wstat-val">{workers.length}</span>
                        <span className="wstat-lbl">Active Workers</span>
                    </div>
                    <div className="wstat">
                        <span className="wstat-val">{new Set(workers.map(w => w.department)).size}</span>
                        <span className="wstat-lbl">Departments</span>
                    </div>
                </div>

                <div className="workers-table-wrapper">
                    <table className="workers-table">
                        <thead>
                            <tr>
                                <th>Worker Info</th>
                                <th>Department</th>
                                <th>Added Date</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5">
                                        <Loader2 size={24} className="spin-icon mx-auto text-muted" />
                                        <p className="mt-2 text-muted">Loading workers...</p>
                                    </td>
                                </tr>
                            ) : filteredWorkers.length > 0 ? (
                                filteredWorkers.map((worker) => (
                                    <tr key={worker.phone} className="worker-row">
                                        <td>
                                            <div className="worker-name-cell">
                                                <div className="worker-avatar">{worker.name.charAt(0)}</div>
                                                <div>
                                                    <div className="worker-name">{worker.name}</div>
                                                    <div className="worker-phone">{worker.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="dept-pill badge" style={{background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)'}}>{worker.department}</span></td>
                                        <td className="text-muted text-sm">
                                            {worker.created_at ? new Date(worker.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td><span className="status-dot active">Active</span></td>
                                        <td className="text-right">
                                            <div className="action-cell" style={{justifyContent: 'flex-end'}}>
                                                <button 
                                                    className="btn btn-icon danger" 
                                                    onClick={() => handleDeleteWorker(worker.phone, worker.name)}
                                                    title="Remove Worker"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-5">
                                        <ShieldAlert size={32} className="text-muted mx-auto mb-2 opacity-50" />
                                        <p className="text-muted">No workers found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Worker Modal */}
            {showAddModal && (
                <div className="worker-modal-overlay">
                    <div className="worker-modal">
                        <div className="modal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h2>Register New Worker</h2>
                            <button className="btn btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddWorker} className="modal-body">
                            <div className="form-grid">
                                <div className="form-group form-grid-full">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Ramesh Singh"
                                        value={newWorker.name}
                                        onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="9876543210"
                                        pattern="[0-9]{10}"
                                        value={newWorker.phone}
                                        onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value.replace(/\D/g, '') })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Department</label>
                                    <select 
                                        value={newWorker.department}
                                        onChange={(e) => setNewWorker({ ...newWorker, department: e.target.value })}
                                    >
                                        <option value="PWD">PWD (Roads & Infrastructure)</option>
                                        <option value="Sanitation">Sanitation (Waste Management)</option>
                                        <option value="Water Supply">Water Supply Board</option>
                                        <option value="Electricity">Electricity Board</option>
                                        <option value="Parks & Rec">Parks & Recreation</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={adding}>
                                    {adding ? <Loader2 size={16} className="spin-icon" /> : <Plus size={16} />} 
                                    {adding ? 'Adding...' : 'Register Worker'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showCsvModal && (
                <div className="worker-modal-overlay">
                    <div className="worker-modal" style={{ maxWidth: 700 }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2><FileSpreadsheet size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Import Workers from CSV</h2>
                            <button className="btn btn-icon" onClick={() => setShowCsvModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {csvRows.length === 0 ? (
                                <>
                                    <div
                                        className="csv-drop-zone"
                                        onClick={() => csvFileRef.current?.click()}
                                    >
                                        <Upload size={28} />
                                        <p><strong>Click to select a CSV file</strong></p>
                                        <p className="text-sm text-muted">Required columns: name, phone. Optional: department</p>
                                    </div>
                                    <input ref={csvFileRef} type="file" accept=".csv" hidden onChange={handleCsvFile} />
                                    <div className="csv-sample-hint">
                                        <p className="text-sm text-muted" style={{ marginTop: 12 }}><strong>Sample CSV format:</strong></p>
                                        <code className="csv-sample-code">name,phone,department{"\n"}Ramesh Singh,9876543210,PWD{"\n"}Priya Sharma,8765432109,Sanitation</code>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Summary badges */}
                                    <div className="csv-summary">
                                        <span className="csv-badge csv-badge-total">{csvRows.length} total</span>
                                        {csvValidCount > 0 && <span className="csv-badge csv-badge-valid"><CheckCircle size={12} /> {csvValidCount} ready</span>}
                                        {csvInvalidCount > 0 && <span className="csv-badge csv-badge-invalid"><AlertTriangle size={12} /> {csvInvalidCount} invalid</span>}
                                        {csvSuccessCount > 0 && <span className="csv-badge csv-badge-success"><CheckCircle size={12} /> {csvSuccessCount} added</span>}
                                        {csvFailedCount > 0 && <span className="csv-badge csv-badge-failed"><XCircle size={12} /> {csvFailedCount} failed</span>}
                                    </div>

                                    {/* Progress bar */}
                                    {csvImporting && (
                                        <div className="csv-progress">
                                            <div className="csv-progress-bar" style={{ width: `${csvProgress}%` }} />
                                        </div>
                                    )}

                                    {/* Preview table */}
                                    <div className="csv-preview-table-wrap">
                                        <table className="workers-table csv-preview-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Phone</th>
                                                    <th>Dept</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvRows.map((row, i) => (
                                                    <tr key={i} className={`csv-row csv-row-${row.status}`}>
                                                        <td className="text-muted text-sm">{i + 1}</td>
                                                        <td>{row.name}</td>
                                                        <td>{row.phone}</td>
                                                        <td><span className="dept-pill badge" style={{ background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)' }}>{row.department}</span></td>
                                                        <td>
                                                            {row.status === 'pending' && <span className="csv-status-pill pending">Ready</span>}
                                                            {row.status === 'invalid' && <span className="csv-status-pill invalid" title={row.error}><AlertTriangle size={11} /> {row.error}</span>}
                                                            {row.status === 'success' && <span className="csv-status-pill success"><CheckCircle size={11} /> Added</span>}
                                                            {row.status === 'failed' && <span className="csv-status-pill failed" title={row.error}><XCircle size={11} /> Failed</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={() => setShowCsvModal(false)}>Cancel</button>
                            {csvRows.length > 0 && !csvImporting && csvValidCount > 0 && (
                                <button className="btn btn-primary" onClick={handleCsvImport}>
                                    <Upload size={16} /> Import {csvValidCount} Worker{csvValidCount !== 1 ? 's' : ''}
                                </button>
                            )}
                            {csvRows.length > 0 && !csvImporting && (
                                <button className="btn btn-secondary" onClick={() => { setCsvRows([]); setCsvProgress(0); }}>
                                    Choose Different File
                                </button>
                            )}
                            {csvImporting && (
                                <button className="btn btn-primary" disabled>
                                    <Loader2 size={16} className="spin-icon" /> Importing... {csvProgress}%
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast.show && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        </div>
    );
};

export default AdminWorkers;
