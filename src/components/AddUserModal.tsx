import React, { useState, useEffect, useRef } from 'react';
import {
    View, Modal, TouchableOpacity, StyleSheet, ActivityIndicator,
    TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Text } from "@/components/ui/text";
import { searchUsers, inviteUser, fetchFriends } from '../util/apiService';
import { X, Search, UserCheck, UserX, Mail, ChevronDown, ChevronUp } from 'lucide-react-native';

interface AddUserModalProps {
    visible: boolean;
    onClose: () => void;
    groupId: string;
    /** Called when an existing user is confirmed — parent handles addNewGroupMember */
    onAddUser: (email: string) => Promise<void>;
}

interface UserResult {
    userId?: string;
    id?: string;
    name: string;
    email: string;
}

type ModalStep = 'idle' | 'found' | 'not_found';

const DEBOUNCE_MS = 400;

const AddUserModal: React.FC<AddUserModalProps> = ({ visible, onClose, groupId, onAddUser }) => {

    // ── Friends section ─────────────────────────────────────────────
    const [friends, setFriends] = useState<UserResult[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [friendSearch, setFriendSearch] = useState('');
    const [isFriendDropdownOpen, setIsFriendDropdownOpen] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState<UserResult | null>(null);

    // ── Search section ──────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Email validate section ──────────────────────────────────────
    const [email, setEmail] = useState('');
    const [validateStep, setValidateStep] = useState<ModalStep>('idle');
    const [validateLoading, setValidateLoading] = useState(false);
    const [foundUser, setFoundUser] = useState<UserResult | null>(null);

    // ── Invite section ──────────────────────────────────────────────
    const [inviteName, setInviteName] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    // ── Action loading ──────────────────────────────────────────────
    const [addLoading, setAddLoading] = useState(false);

    const reset = () => {
        setFriendSearch(''); setIsFriendDropdownOpen(false); setSelectedFriend(null);
        setSearchQuery(''); setSearchResults([]); setIsSearchDropdownOpen(false);
        setSelectedUser(null); setEmail(''); setValidateStep('idle');
        setFoundUser(null); setInviteName(''); setAddLoading(false);
    };

    useEffect(() => { if (!visible) reset(); }, [visible]);

    // ── Load friends when modal opens ───────────────────────────────
    useEffect(() => {
        if (!visible) return;
        setFriendsLoading(true);
        fetchFriends()
            .then(data => setFriends(data || []))
            .catch(() => setFriends([]))
            .finally(() => setFriendsLoading(false));
    }, [visible]);

    const filteredFriends = friends.filter(f =>
        f.name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.email?.toLowerCase().includes(friendSearch.toLowerCase())
    );

    // ── Debounced search ────────────────────────────────────────────
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setIsSearchDropdownOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await searchUsers(searchQuery.trim());
                setSearchResults(results || []);
                setIsSearchDropdownOpen(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const handleSelectUser = (user: UserResult) => {
        setSelectedUser(user);
        setSearchQuery(user.name);
        setIsSearchDropdownOpen(false);
    };

    const handleValidateEmail = async () => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !trimmed.includes('@')) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }
        setValidateLoading(true);
        setValidateStep('idle');
        setFoundUser(null);
        try {
            // Re-use search endpoint to find by exact email
            const results = await searchUsers(trimmed);
            const exact = (results || []).find(
                (u: UserResult) => u.email?.toLowerCase() === trimmed
            );
            if (exact) {
                setFoundUser(exact);
                setValidateStep('found');
            } else {
                setValidateStep('not_found');
            }
        } catch {
            setValidateStep('not_found');
        } finally {
            setValidateLoading(false);
        }
    };

    const handleAddMember = async (emailToAdd: string) => {
        setAddLoading(true);
        try {
            await onAddUser(emailToAdd);
            reset();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to add member.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleInvite = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = inviteName.trim();
        if (!trimmedName) { Alert.alert('Name required', 'Please enter the person\'s name to send the invite.'); return; }
        setInviteLoading(true);
        try {
            await inviteUser({ email: trimmedEmail, name: trimmedName, groupId });
            Alert.alert('Invite Sent! 🎉', `An invitation email has been sent to ${trimmedEmail}.`);
            reset();
            onClose();
        } catch (err: any) {
            Alert.alert('Invite Failed', err?.message || 'Could not send invite. Please try again.');
        } finally {
            setInviteLoading(false);
        }
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <View style={styles.sheet}>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Add Member to Group</Text>
                            <TouchableOpacity onPress={onClose}><X color="#829AC9" size={24} /></TouchableOpacity>
                        </View>

                        {/* ── SECTION 1: Friends dropdown ── */}
                        <Text style={styles.sectionLabel}>Add from Friends</Text>
                        <TouchableOpacity
                            style={styles.friendDropdownToggle}
                            onPress={() => setIsFriendDropdownOpen(v => !v)}
                        >
                            <Text style={selectedFriend ? styles.friendSelectedText : styles.friendPlaceholderText}>
                                {selectedFriend ? `${selectedFriend.name} (${selectedFriend.email})` : 'Select a friend...'}
                            </Text>
                            {friendsLoading
                                ? <ActivityIndicator size="small" color="#8B5CF6" />
                                : isFriendDropdownOpen ? <ChevronUp color="#829AC9" size={18} /> : <ChevronDown color="#829AC9" size={18} />}
                        </TouchableOpacity>

                        {isFriendDropdownOpen && (
                            <View style={styles.dropdown}>
                                <View style={styles.friendSearchWrap}>
                                    <Search color="#829AC9" size={15} />
                                    <TextInput
                                        style={styles.friendSearchInput}
                                        placeholder="Filter friends..."
                                        placeholderTextColor="#4B5E8A"
                                        value={friendSearch}
                                        onChangeText={setFriendSearch}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {filteredFriends.length === 0 ? (
                                        <Text style={[styles.emptyText, { padding: 12 }]}>
                                            {friendSearch ? `No friends matching "${friendSearch}"` : 'No friends yet'}
                                        </Text>
                                    ) : filteredFriends.map((f, idx) => (
                                        <TouchableOpacity
                                            key={f.userId || f.id || idx}
                                            style={[styles.dropdownItem, selectedFriend?.email === f.email && styles.dropdownItemActive]}
                                            onPress={() => { setSelectedFriend(f); setIsFriendDropdownOpen(false); setFriendSearch(''); }}
                                        >
                                            <View style={styles.avatarBadge}>
                                                <Text style={styles.avatarText}>{f.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.userName}>{f.name}</Text>
                                                <Text style={styles.userEmail}>{f.email}</Text>
                                            </View>
                                            {selectedFriend?.email === f.email && <UserCheck color="#8B5CF6" size={18} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {selectedFriend && (
                            <View style={styles.selectedCard}>
                                <View style={styles.avatarBadge}><Text style={styles.avatarText}>{selectedFriend.name?.charAt(0)?.toUpperCase()}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{selectedFriend.name}</Text>
                                    <Text style={styles.userEmail}>{selectedFriend.email}</Text>
                                </View>
                                <TouchableOpacity style={styles.addBtn} onPress={() => handleAddMember(selectedFriend.email)} disabled={addLoading}>
                                    {addLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or search all users</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── SECTION 2: Global search ── */}
                        <Text style={styles.sectionLabel}>Search by Name or Email</Text>
                        <View style={styles.searchRow}>
                            <View style={styles.searchInputWrap}>
                                <Search color="#829AC9" size={18} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Type to search users..."
                                    placeholderTextColor="#4B5E8A"
                                    value={searchQuery}
                                    onChangeText={text => { setSearchQuery(text); setSelectedUser(null); }}
                                    autoCapitalize="none"
                                />
                                {searchLoading && <ActivityIndicator size="small" color="#8B5CF6" style={{ marginLeft: 6 }} />}
                            </View>
                        </View>

                        {/* Search results dropdown */}
                        {isSearchDropdownOpen && searchResults.length > 0 && (
                            <View style={styles.dropdown}>
                                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {searchResults.map((user, idx) => (
                                        <TouchableOpacity
                                            key={user.userId || user.id || idx}
                                            style={[styles.dropdownItem, selectedUser?.email === user.email && styles.dropdownItemActive]}
                                            onPress={() => handleSelectUser(user)}
                                        >
                                            <View style={styles.avatarBadge}>
                                                <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.userName}>{user.name}</Text>
                                                <Text style={styles.userEmail}>{user.email}</Text>
                                            </View>
                                            {selectedUser?.email === user.email && <UserCheck color="#8B5CF6" size={18} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {isSearchDropdownOpen && searchResults.length === 0 && !searchLoading && (
                            <View style={styles.emptyDropdown}>
                                <Text style={styles.emptyText}>No users found for "{searchQuery}"</Text>
                            </View>
                        )}

                        {/* Add from search result */}
                        {selectedUser && (
                            <View style={styles.selectedCard}>
                                <View style={styles.avatarBadge}><Text style={styles.avatarText}>{selectedUser.name?.charAt(0)?.toUpperCase()}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{selectedUser.name}</Text>
                                    <Text style={styles.userEmail}>{selectedUser.email}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => handleAddMember(selectedUser.email)}
                                    disabled={addLoading}
                                >
                                    {addLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or enter email directly</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── SECTION 3: Email validate ── */}
                        <Text style={styles.sectionLabel}>Add by Email</Text>
                        <View style={styles.emailRow}>
                            <TextInput
                                style={styles.emailInput}
                                placeholder="friend@example.com"
                                placeholderTextColor="#4B5E8A"
                                value={email}
                                onChangeText={text => { setEmail(text); setValidateStep('idle'); setFoundUser(null); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <TouchableOpacity
                                style={styles.validateBtn}
                                onPress={handleValidateEmail}
                                disabled={validateLoading || !email}
                            >
                                {validateLoading
                                    ? <ActivityIndicator color="white" size="small" />
                                    : <Text style={styles.validateBtnText}>Validate</Text>}
                            </TouchableOpacity>
                        </View>

                        {/* Found user → Add button */}
                        {validateStep === 'found' && foundUser && (
                            <View style={styles.resultCard}>
                                <UserCheck color="#10B981" size={22} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.userName}>{foundUser.name}</Text>
                                    <Text style={styles.userEmail}>{foundUser.email}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => handleAddMember(foundUser.email)}
                                    disabled={addLoading}
                                >
                                    {addLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── SECTION 3: Not found → Invite ── */}
                        {validateStep === 'not_found' && (
                            <View style={styles.inviteCard}>
                                <View style={styles.inviteHeader}>
                                    <UserX color="#F59E0B" size={20} />
                                    <Text style={styles.inviteHeading}>  Not on Chip In yet</Text>
                                </View>
                                <Text style={styles.inviteSubText}>
                                    No account found for <Text style={{ color: '#E2E8F0', fontWeight: 'bold' }}>{email}</Text>. Send them an invite!
                                </Text>
                                <Text style={styles.sectionLabel}>Their Name *</Text>
                                <TextInput
                                    style={styles.emailInput}
                                    placeholder="Enter their name"
                                    placeholderTextColor="#4B5E8A"
                                    value={inviteName}
                                    onChangeText={setInviteName}
                                    autoCapitalize="words"
                                />
                                <TouchableOpacity
                                    style={[styles.inviteBtn, (!inviteName || inviteLoading) && { opacity: 0.6 }]}
                                    onPress={handleInvite}
                                    disabled={!inviteName || inviteLoading}
                                >
                                    {inviteLoading
                                        ? <ActivityIndicator color="white" size="small" />
                                        : <><Mail color="white" size={18} /><Text style={styles.inviteBtnText}>  Send Invite</Text></>}
                                </TouchableOpacity>
                            </View>
                        )}

                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    sheet: { backgroundColor: '#131B3A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    sectionLabel: { color: '#829AC9', fontSize: 13, marginBottom: 8, marginTop: 4 },

    // Search
    searchRow: { marginBottom: 4 },
    searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1128', borderWidth: 1, borderColor: '#24335E', borderRadius: 10, paddingHorizontal: 12, height: 46 },
    searchInput: { flex: 1, color: 'white', fontSize: 15 },

    // Friends
    friendDropdownToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B1128', borderWidth: 1, borderColor: '#24335E', borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 4 },
    friendSelectedText: { color: '#E2E8F0', fontSize: 15, flex: 1 },
    friendPlaceholderText: { color: '#4B5E8A', fontSize: 15, flex: 1 },
    friendSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1128', borderBottomWidth: 1, borderBottomColor: '#24335E', paddingHorizontal: 12, height: 40, gap: 8 },
    friendSearchInput: { flex: 1, color: 'white', fontSize: 14 },

    // Dropdown
    dropdown: { backgroundColor: '#1C2854', borderRadius: 10, borderWidth: 1, borderColor: '#24335E', marginBottom: 6, overflow: 'hidden' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#24335E', gap: 10 },
    dropdownItemActive: { backgroundColor: '#8B5CF615' },
    emptyDropdown: { backgroundColor: '#1C2854', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 6 },
    emptyText: { color: '#829AC9', fontSize: 13 },
    avatarBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    userName: { color: '#E2E8F0', fontWeight: '600', fontSize: 15 },
    userEmail: { color: '#829AC9', fontSize: 12, marginTop: 1 },

    // Selected card
    selectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2854', borderRadius: 10, padding: 12, gap: 10, marginBottom: 8, borderWidth: 1, borderColor: '#8B5CF6' },

    // Divider
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#24335E' },
    dividerText: { color: '#4B5E8A', fontSize: 12, marginHorizontal: 10 },

    // Email validate
    emailRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    emailInput: { flex: 1, backgroundColor: '#0B1128', color: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#24335E', fontSize: 15 },
    validateBtn: { backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 10 },
    validateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    // Result cards
    resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2A1F', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#10B981', marginBottom: 8 },
    addBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    // Invite card
    inviteCard: { backgroundColor: '#2A1F0D', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#F59E0B', marginTop: 4 },
    inviteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    inviteHeading: { color: '#F59E0B', fontWeight: 'bold', fontSize: 15 },
    inviteSubText: { color: '#829AC9', fontSize: 13, marginBottom: 12, lineHeight: 18 },
    inviteBtn: { flexDirection: 'row', backgroundColor: '#F59E0B', borderRadius: 10, padding: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    inviteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});

export default AddUserModal;
