import React, { useState, useEffect } from 'react';
import {
    Users,
    Package,
    TrendingUp,
    Search,
    Trash2,
    Save,
    Eye,
    AlertCircle,
    X,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import {
    getAllUsers,
    getAllCollections,
    getAnalytics,
    deleteCollectionCascade,
    updateUserCoinsAdmin,
    AdminUserData,
    AdminCollectionData,
    AnalyticsData
} from '../services/adminService';

type AdminTab = 'users' | 'collections' | 'analytics';

interface AdminPanelProps {
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [loading, setLoading] = useState(true);

    // Data states
    const [users, setUsers] = useState<AdminUserData[]>([]);
    const [collections, setCollections] = useState<AdminCollectionData[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    // UI states
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCoinUserId, setEditingCoinUserId] = useState<string | null>(null);
    const [editingCoinValue, setEditingCoinValue] = useState<number>(0);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'users') {
                const userData = await getAllUsers();
                setUsers(userData);
            } else if (activeTab === 'collections') {
                const collectionData = await getAllCollections();
                setCollections(collectionData);
            } else if (activeTab === 'analytics') {
                const analyticsData = await getAnalytics();
                setAnalytics(analyticsData);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
            console.error('Admin panel error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCoins = async (userId: string) => {
        try {
            await updateUserCoinsAdmin(userId, editingCoinValue);
            setEditingCoinUserId(null);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to update coins');
        }
    };

    const handleDeleteCollection = async (themeId: string, creatorId: string) => {
        try {
            setLoading(true);
            await deleteCollectionCascade(themeId, creatorId);
            setDeleteConfirmId(null);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to delete collection');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studioName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCollections = collections.filter(col =>
        col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            zIndex: 9999,
            overflow: 'auto'
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '20px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                        System Management & Analytics
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <X size={20} color="#fff" />
                </button>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '12px',
                padding: '20px 40px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {[
                    { id: 'users' as AdminTab, label: 'Users', icon: Users },
                    { id: 'collections' as AdminTab, label: 'Collections', icon: Package },
                    { id: 'analytics' as AdminTab, label: 'Analytics', icon: TrendingUp }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchTerm('');
                        }}
                        style={{
                            background: activeTab === tab.id
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'rgba(255, 255, 255, 0.05)',
                            border: activeTab === tab.id
                                ? 'none'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            transform: activeTab === tab.id ? 'scale(1.02)' : 'scale(1)'
                        }}
                        onMouseEnter={e => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '40px' }}>
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: '#fca5a5'
                    }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            border: '4px solid rgba(255, 255, 255, 0.1)',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            margin: '0 auto 20px',
                            animation: 'spin 1s linear infinite'
                        }} />
                        Loading...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <>
                        {activeTab === 'users' && (
                            <UsersTab
                                users={filteredUsers}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                editingCoinUserId={editingCoinUserId}
                                editingCoinValue={editingCoinValue}
                                setEditingCoinUserId={setEditingCoinUserId}
                                setEditingCoinValue={setEditingCoinValue}
                                handleSaveCoins={handleSaveCoins}
                            />
                        )}
                        {activeTab === 'collections' && (
                            <CollectionsTab
                                collections={filteredCollections}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                deleteConfirmId={deleteConfirmId}
                                setDeleteConfirmId={setDeleteConfirmId}
                                handleDeleteCollection={handleDeleteCollection}
                            />
                        )}
                        {activeTab === 'analytics' && analytics && (
                            <AnalyticsTab analytics={analytics} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// USERS TAB
// ============================================================================

interface UsersTabProps {
    users: AdminUserData[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    editingCoinUserId: string | null;
    editingCoinValue: number;
    setEditingCoinUserId: (id: string | null) => void;
    setEditingCoinValue: (value: number) => void;
    handleSaveCoins: (userId: string) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({
    users,
    searchTerm,
    setSearchTerm,
    editingCoinUserId,
    editingCoinValue,
    setEditingCoinUserId,
    setEditingCoinValue,
    handleSaveCoins
}) => {
    return (
        <div>
            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxWidth: '500px'
                }}>
                    <Search size={20} color="rgba(255, 255, 255, 0.5)" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, or studio..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '15px'
                        }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Total Users
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                        {users.length}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Total Coins
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#fbbf24' }}>
                        {users.reduce((sum, u) => sum + u.coins, 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <th style={tableHeaderStyle}>User</th>
                            <th style={tableHeaderStyle}>Email</th>
                            <th style={tableHeaderStyle}>Studio</th>
                            <th style={tableHeaderStyle}>Coins</th>
                            <th style={tableHeaderStyle}>Collections</th>
                            <th style={tableHeaderStyle}>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{
                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'background 0.2s ease'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={tableCellStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                border: '2px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                        <span style={{ fontWeight: 600 }}>{user.name}</span>
                                    </div>
                                </td>
                                <td style={tableCellStyle}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                                        {user.email}
                                    </span>
                                </td>
                                <td style={tableCellStyle}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                        {user.studioName || '-'}
                                    </span>
                                </td>
                                <td style={tableCellStyle}>
                                    {editingCoinUserId === user.id ? (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                value={editingCoinValue}
                                                onChange={e => setEditingCoinValue(parseInt(e.target.value) || 0)}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    color: '#fff',
                                                    width: '100px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <button
                                                onClick={() => handleSaveCoins(user.id)}
                                                style={{
                                                    background: '#10b981',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingCoinUserId(null)}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    color: '#fff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => {
                                                setEditingCoinUserId(user.id);
                                                setEditingCoinValue(user.coins);
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                borderRadius: '8px',
                                                color: '#fbbf24',
                                                fontWeight: 600
                                            }}
                                        >
                                            {user.coins.toLocaleString()}
                                        </div>
                                    )}
                                </td>
                                <td style={tableCellStyle}>
                                    <span>{user.stats.charactersCollected}</span>
                                </td>
                                <td style={tableCellStyle}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============================================================================
// COLLECTIONS TAB
// ============================================================================

interface CollectionsTabProps {
    collections: AdminCollectionData[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    deleteConfirmId: string | null;
    setDeleteConfirmId: (id: string | null) => void;
    handleDeleteCollection: (themeId: string, creatorId: string) => void;
}

const CollectionsTab: React.FC<CollectionsTabProps> = ({
    collections,
    searchTerm,
    setSearchTerm,
    deleteConfirmId,
    setDeleteConfirmId,
    handleDeleteCollection
}) => {
    return (
        <div>
            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxWidth: '500px'
                }}>
                    <Search size={20} color="rgba(255, 255, 255, 0.5)" />
                    <input
                        type="text"
                        placeholder="Search collections by name or creator..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '15px'
                        }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Total Collections
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                        {collections.length}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Total Purchases
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>
                        {collections.reduce((sum, c) => sum + c.totalPurchases, 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Collections Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {collections.map(collection => (
                    <div key={collection.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {/* Thumbnail */}
                        {collection.boxImageUrl && (
                            <div style={{
                                width: '100%',
                                height: '200px',
                                background: `url(${collection.boxImageUrl}) center/cover`,
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            }} />
                        )}

                        <div style={{ padding: '20px' }}>
                            <h3 style={{
                                margin: '0 0 8px 0',
                                fontSize: '18px',
                                fontWeight: 700,
                                color: '#fff'
                            }}>
                                {collection.name}
                            </h3>
                            <p style={{
                                margin: '0 0 16px 0',
                                fontSize: '14px',
                                color: 'rgba(255, 255, 255, 0.6)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                            }}>
                                {collection.description}
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                                        Creator
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                                        {collection.creatorName}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                                        Characters
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                                        {collection.characterCount}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                                        Purchases
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: 600 }}>
                                        {collection.totalPurchases}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                                        Price
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 600 }}>
                                        {collection.blindBoxPrice} coins
                                    </div>
                                </div>
                            </div>

                            {/* Delete Button */}
                            {deleteConfirmId === collection.id ? (
                                <div>
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                        fontSize: '13px',
                                        color: '#fca5a5'
                                    }}>
                                        ⚠️ This will permanently delete this collection and remove ALL items from users who own them!
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleDeleteCollection(collection.id, collection.creatorId)}
                                            style={{
                                                flex: 1,
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                color: '#fff',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Confirm Delete
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(null)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                color: '#fff',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeleteConfirmId(collection.id)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: '#fca5a5',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    }}
                                >
                                    <Trash2 size={16} />
                                    Delete Collection
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// ANALYTICS TAB
// ============================================================================

interface AnalyticsTabProps {
    analytics: AnalyticsData;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analytics }) => {
    const userGrowthPercentage = analytics.userGrowth.length > 1
        ? ((analytics.userGrowth[analytics.userGrowth.length - 1].count - analytics.userGrowth[0].count) / analytics.userGrowth[0].count * 100)
        : 0;

    return (
        <div>
            {/* Key Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
            }}>
                <MetricCard
                    label="Total Users"
                    value={analytics.totalUsers.toLocaleString()}
                    icon={Users}
                    color="#667eea"
                    trend={userGrowthPercentage}
                />
                <MetricCard
                    label="Total Collections"
                    value={analytics.totalCollections.toLocaleString()}
                    icon={Package}
                    color="#8b5cf6"
                />
                <MetricCard
                    label="Total Purchases"
                    value={analytics.totalPurchases.toLocaleString()}
                    icon={TrendingUp}
                    color="#10b981"
                />
                <MetricCard
                    label="Active Users (7d)"
                    value={analytics.activeUsers.toLocaleString()}
                    icon={Users}
                    color="#f59e0b"
                    subtitle={`${((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(1)}% of total`}
                />
            </div>

            {/* Top Collections */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: '20px'
                }}>
                    Top Collections
                </h2>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden'
                }}>
                    {analytics.topCollections.map((col, index) => (
                        <div key={col.id} style={{
                            padding: '16px 20px',
                            borderBottom: index < analytics.topCollections.length - 1
                                ? '1px solid rgba(255, 255, 255, 0.05)'
                                : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : 'rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: index < 3 ? '#000' : '#fff'
                                }}>
                                    {index + 1}
                                </div>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{col.name}</span>
                            </div>
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                color: '#a78bfa',
                                fontWeight: 600
                            }}>
                                {col.purchases} purchases
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Collections by Creator */}
            <div>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: '20px'
                }}>
                    Collections by Creator
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px'
                }}>
                    {analytics.collectionsByCreator.slice(0, 8).map(creator => (
                        <div key={creator.creatorName} style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'rgba(255, 255, 255, 0.6)',
                                marginBottom: '8px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {creator.creatorName}
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: '#667eea'
                            }}>
                                {creator.count}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                marginTop: '4px'
                            }}>
                                {creator.count === 1 ? 'collection' : 'collections'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
    label: string;
    value: string;
    icon: React.FC<{ size: number; color?: string }>;
    color: string;
    trend?: number;
    subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color, trend, subtitle }) => {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    {label}
                </div>
                <Icon size={24} color={color} />
            </div>

            <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '8px'
            }}>
                {value}
            </div>

            {trend !== undefined && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: trend >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 600
                }}>
                    {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(trend).toFixed(1)}% growth
                </div>
            )}

            {subtitle && (
                <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '4px'
                }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// TABLE STYLES
// ============================================================================

const tableHeaderStyle: React.CSSProperties = {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const tableCellStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '15px',
    color: '#fff'
};

export default AdminPanel;
