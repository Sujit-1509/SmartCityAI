import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle, Loader2, Wrench, X, Camera, BarChart3, List, AlertCircle } from 'lucide-react';
import { 
    getWorkerAssignments, 
    updateComplaintStatus, 
    getWorkerStats, 
    workerRespondToTask, 
    resolveWithProof 
} from '../../services/api';
import { StatusBadge, SeverityBadge, CategoryTag, PriorityBar, Loader, TimeAgo } from '../../components/Shared/Shared';
import './Worker.css';

const Worker = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('list'); // 'list' or 'stats'
    const [assignments, setAssignments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [updating, setUpdating] = useState(false);
    
    // Resolve with proof state
    const [resolveModal, setResolveModal] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofNote, setProofNote] = useState('');
    const [resolveLoading, setResolveLoading] = useState(false);
    const [resolveGps, setResolveGps] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('idle');
    const [toast, setToast] = useState(null);
    
    const fileRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('jansevaai_user') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignRes, statsRes] = await Promise.all([
                getWorkerAssignments(),
                getWorkerStats(user.phone)
            ]);
            setAssignments(assignRes.assignments || []);
            setStats(statsRes.success ? statsRes : null);
        } catch (err) {
            console.error('Failed to fetch worker data', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleTaskAction = async (incidentId, action) => {
        setUpdating(true);
        try {
            const res = await workerRespondToTask(incidentId, action, `Task ${action} by worker`);
            if (res.success) {
                showToast(`Task ${action} successfully`);
                fetchData();
            }
        } catch (err) {
            showToast('Action failed. Try again.');
        } finally {
            setUpdating(false);
        }
    };

    const openResolveModal = (task) => {
        setResolveModal(task);
        setProofFile(null);
        setProofNote('');
        setResolveGps(null);
        setGpsStatus('fetching');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setResolveGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsStatus('ok');
                },
                () => setGpsStatus('denied'),
                { timeout: 5000 }
            );
        } else {
            setGpsStatus('denied');
        }
    };

    const handleResolveWithProof = async () => {
        setResolveLoading(true);
        try {
            const res = await resolveWithProof(
                resolveModal.incident_id || resolveModal.id,
                proofFile,
                proofNote,
                resolveGps
            );
            if (res.success) {
                showToast('Complaint resolved successfully!');
                setResolveModal(null);
                fetchData();
            }
        } catch (err) {
            showToast('Resolution failed. Check connection.');
        } finally {
            setResolveLoading(false);
        }
    };

    if (loading) return <div className="worker-page"><Loader size="lg" text="Loading assignments..." /></div>;

    return (
        <div className="worker-page">
            <div className="container">
                <div className="worker-header">
                    <div>
                        <h1 className="section-title">Field Worker Console</h1>
                        <p className="text-muted text-sm">{user.name} &middot; {user.department}</p>
                    </div>
                    <div className="view-toggle">
                        <button className={`toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
                            <List size={16} /> Tasks
                        </button>
                        <button className={`toggle-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>
                            <BarChart3 size={16} /> Stats
                        </button>
                    </div>
                </div>

                {view === 'list' ? (
                    <div className="worker-list">
                        {assignments.length === 0 ? (
                            <div className="card text-center" style={{ padding: '40px' }}>
                                <AlertCircle size={32} className="text-muted" style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p className="text-muted">No active tasks assigned to you.</p>
                            </div>
                        ) : (
                            assignments.map((a) => (
                                <div key={a.incident_id || a.id} className="worker-card card card-glow">
                                    <div className="wc-top">
                                        <div>
                                            <code className="wc-id">{(a.incident_id || a.id).slice(-8)}</code>
                                            <StatusBadge status={a.status} />
                                        </div>
                                        <SeverityBadge severity={a.severity} />
                                    </div>
                                    <div className="wc-meta-main">
                                        <CategoryTag category={a.category} />
                                        <span className="wc-loc"><MapPin size={13} /> {a.address?.split(',')[0]}</span>
                                    </div>
                                    <p className="wc-desc">{a.description}</p>
                                    
                                    <div className="wc-actions">
                                        {a.status === 'assigned' ? (
                                            <>
                                                <button className="btn btn-accept" onClick={() => handleTaskAction(a.incident_id || a.id, 'accepted')} disabled={updating}>
                                                    Accept Task
                                                </button>
                                                <button className="btn btn-reject" onClick={() => handleTaskAction(a.incident_id || a.id, 'rejected')} disabled={updating}>
                                                    Reject
                                                </button>
                                            </>
                                        ) : a.status === 'in_progress' ? (
                                            <>
                                                <button className="btn btn-primary btn-resolve" onClick={() => openResolveModal(a)}>
                                                    Mark Resolved
                                                </button>
                                                <button className="btn btn-secondary" onClick={() => navigate(`/complaint/${a.incident_id || a.id}`)}>
                                                    View Details
                                                </button>
                                            </>
                                        ) : (
                                            <button className="btn btn-outline" onClick={() => navigate(`/complaint/${a.incident_id || a.id}`)}>
                                                View Historical
                                            </button>
                                        )}
                                        <button className="btn btn-icon-only" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`, '_blank')}>
                                            <Navigation size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="stats-view animate-fade-in">
                        {stats ? (
                            <>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-val" style={{ color: 'var(--primary)' }}>{stats.total}</div>
                                        <div className="stat-label">Total Assigned</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-val" style={{ color: 'var(--success)' }}>{stats.resolved}</div>
                                        <div className="stat-label">Resolved</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-val" style={{ color: 'var(--warning)' }}>{stats.active}</div>
                                        <div className="stat-label">In Progress</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-val" style={{ color: 'var(--text-muted)' }}>{stats.rejected}</div>
                                        <div className="stat-label">Rejected</div>
                                    </div>
                                </div>

                                <div className="card stats-details">
                                    <div className="detail-row">
                                        <span className="detail-label">Avg Resolution Time</span>
                                        <span className="detail-val">{stats.avgResolutionHours ? `${stats.avgResolutionHours}h` : 'N/A'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">SLA Compliance</span>
                                        <span className={`detail-val ${stats.slaComplianceRate >= 80 ? 'good' : 'low'}`}>{stats.slaComplianceRate}%</span>
                                    </div>
                                </div>

                                <div className="card sla-bar-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="text-sm font-600">SLA Adherence</span>
                                        <span className="text-sm font-700">{stats.slaComplianceRate}%</span>
                                    </div>
                                    <div className="sla-bar-bg">
                                        <div 
                                            className="sla-bar-fill" 
                                            style={{ 
                                                width: `${stats.slaComplianceRate}%`,
                                                background: stats.slaComplianceRate >= 80 ? 'var(--success)' : 'var(--warning)'
                                            }} 
                                        />
                                    </div>
                                </div>
                                
                                {stats.recentResolved?.length > 0 && (
                                    <div className="recent-resolved">
                                        <h4 className="section-title">Recent Resolutions</h4>
                                        <div className="card" style={{ padding: '0' }}>
                                            {stats.recentResolved.map(c => (
                                                <div key={c.incident_id} className="resolved-row" onClick={() => navigate(`/complaint/${c.incident_id}`)}>
                                                    <span className="task-id">{(c.incident_id).slice(-8)}</span>
                                                    <span className="task-cat">{(c.category || '').replace('_',' ')}</span>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted">No stats available yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Resolve Modal */}
            {resolveModal && (
                <div className="modal-backdrop" onClick={() => setResolveModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Resolve with Proof</h3>
                            <button className="modal-close" onClick={() => setResolveModal(null)}><X size={16}/></button>
                        </div>
                        <div className="modal-sub">
                            {(resolveModal.incident_id || resolveModal.id).slice(-8)} &middot; {resolveModal.category?.replace('_',' ')}
                        </div>

                        <div className={`photo-drop ${proofFile ? 'has-file' : ''}`} onClick={() => fileRef.current?.click()}>
                            {proofFile ? <><CheckCircle size={16} /> {proofFile.name}</> : <><Camera size={16} /> Capture Resolution Photo</>}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => setProofFile(e.target.files[0])} />

                        <div style={{ marginTop: '16px' }}>
                            <label className="form-label">Resolution Notes</label>
                            <textarea className="modal-textarea" rows={3} placeholder="Describe the fix performed..." value={proofNote} onChange={e => setProofNote(e.target.value)} />
                        </div>

                        <div className="gps-indicator" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                            <MapPin size={12} />
                            {gpsStatus === 'fetching' ? <span className="text-warning">Acquiring GPS...</span> : 
                             gpsStatus === 'ok' ? <span className="text-success">GPS Locked</span> : 
                             <span className="text-danger">GPS Unavailable</span>}
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setResolveModal(null)}>Cancel</button>
                            <button className="btn btn-primary" disabled={resolveLoading} onClick={handleResolveWithProof}>
                                {resolveLoading ? 'Uploading...' : 'Submit Resolution'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
};

export default Worker;
