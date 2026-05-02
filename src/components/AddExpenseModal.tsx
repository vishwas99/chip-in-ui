import React, { useState, useEffect } from 'react';
import {
    View, Modal, TouchableOpacity, StyleSheet, ActivityIndicator,
    TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { Text } from "@/components/ui/text";
import { useAppToast } from './ToastManager';
import { BlurView } from 'expo-blur';
import {
    createNewExpense, CreateExpenseRequest, fetchMyGroups,
    fetchAllCurrencies, Currency, fetchGroupUsers
} from '../util/apiService';
import { getAuthData } from '../util/authService';
import {
    X, ChevronDown, ChevronUp, Users, Info,
    Search, CheckCircle2, AlertCircle, Percent, Hash, Equal, Check, Plus
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

interface AddExpenseModalProps {
    isVisible: boolean;
    onClose: () => void;
}

interface GroupOption { groupId: string; name: string; }
interface MemberOption { userId: string; name: string; email?: string; }

type SplitMode = 'EQUAL' | 'PERCENTAGE' | 'RATIO';

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isVisible, onClose }) => {
    const { showToast } = useAppToast();

    // ── Form State ──────────────────────────────────────────────────
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
    const [splitType, setSplitType] = useState<SplitMode>('EQUAL');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // ── Data State ──────────────────────────────────────────────────
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [groupMembers, setGroupMembers] = useState<MemberOption[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [splitValues, setSplitValues] = useState<Record<string, string>>({});

    // ── Search State (Frontend Only) ───────────────────────────────
    const [participantSearch, setParticipantSearch] = useState('');
    const [isParticipantDropdownOpen, setIsParticipantDropdownOpen] = useState(false);

    // ── UI State ────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    useEffect(() => {
        if (isVisible) fetchInitialData();
    }, [isVisible]);

    const fetchInitialData = async () => {
        setFetchingData(true);
        try {
            const auth = await getAuthData();
            setCurrentUserId(auth.userId);
            const [groupsRes, currenciesRes] = await Promise.all([
                fetchMyGroups(),
                fetchAllCurrencies(),
            ]);
            const mappedGroups = (groupsRes || []).map((g: any) => ({
                groupId: g.groupId || g.group?.groupId,
                name: g.name || g.groupName || g.group?.name || 'Unnamed Group',
            }));
            setGroups(mappedGroups);
            setCurrencies(currenciesRes || []);
            if (currenciesRes?.length > 0) {
                const defaultCur = currenciesRes.find((c: any) => c.code === 'INR') || currenciesRes[0];
                setSelectedCurrencyId(defaultCur.currencyId);
            }
        } catch (e) {
            console.error('Failed to load initial data', e);
        } finally {
            setFetchingData(false);
        }
    };

    useEffect(() => {
        if (selectedGroupId) {
            loadGroupMembers(selectedGroupId);
        } else {
            setGroupMembers([]);
            setSelectedMemberIds([]);
            setSplitValues({});
        }
    }, [selectedGroupId]);

    const loadGroupMembers = async (groupId: string) => {
        try {
            const membersData = await fetchGroupUsers(groupId);
            const mappedMembers: MemberOption[] = (membersData || []).map((m: any) => ({
                userId: m.userId || m.id,
                name: m.name,
                email: m.email,
            }));
            setGroupMembers(mappedMembers);
            const me = mappedMembers.find(m => m.userId === currentUserId);
            if (me) {
                setSelectedMemberIds([me.userId]);
                setSplitValues({ [me.userId]: '' });
            } else {
                setSelectedMemberIds([]);
                setSplitValues({});
            }
        } catch (e) {
            console.error('Failed to load group members', e);
        }
    };



    const filteredOptions = groupMembers.filter(m => {
        const query = participantSearch.toLowerCase().trim();
        const isNotSelected = !selectedMemberIds.includes(m.userId);
        const matchesQuery = m.name.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query);
        return isNotSelected && matchesQuery;
    });

    const handleSelectParticipant = (user: MemberOption) => {
        if (!selectedMemberIds.includes(user.userId)) {
            setSelectedMemberIds(prev => [...prev, user.userId]);
            setSplitValues(prev => ({ ...prev, [user.userId]: '' }));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setParticipantSearch('');
        setIsParticipantDropdownOpen(false);
    };

    const removeParticipant = (uid: string) => {
        setSelectedMemberIds(prev => prev.filter(id => id !== uid));
    };

    const calculateTally = () => {
        const totalAmount = parseFloat(amount) || 0;
        if (splitType === 'EQUAL') {
            const count = selectedMemberIds.length;
            const perPerson = count > 0 ? totalAmount / count : 0;
            return { total: count, unit: 'people', perPerson };
        } else {
            let sum = 0;
            selectedMemberIds.forEach(uid => {
                sum += parseFloat(splitValues[uid] || '0');
            });
            return { total: sum, unit: splitType === 'PERCENTAGE' ? '%' : 'shares', remaining: 100 - sum };
        }
    };

    const tally = calculateTally();

    const handleCreate = async () => {
        if (!selectedGroupId) { showToast('Missing Info', 'Please select a group', 'warning'); return; }
        if (!description) { showToast('Missing Info', 'Please enter a description', 'warning'); return; }
        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) { showToast('Invalid Amount', 'Please enter a valid amount', 'warning'); return; }
        if (selectedMemberIds.length === 0) { showToast('Missing Participants', 'Select at least one participant', 'warning'); return; }

        let splits: { userId: string, amountOwed: number }[] = [];
        if (splitType === 'EQUAL') {
            const share = totalAmount / selectedMemberIds.length;
            splits = selectedMemberIds.map(uid => ({ userId: uid, amountOwed: share }));
        } else if (splitType === 'PERCENTAGE') {
            if (Math.abs(tally.total - 100) > 0.1) {
                showToast('Incomplete Split', `Percentages must sum to 100% (Current: ${tally.total}%)`, 'error');
                return;
            }
            splits = selectedMemberIds.map(uid => ({
                userId: uid,
                amountOwed: (totalAmount * parseFloat(splitValues[uid] || '0')) / 100
            }));
        } else if (splitType === 'RATIO') {
            if (tally.total <= 0) {
                showToast('Invalid Ratio', 'Total ratio must be greater than 0', 'error');
                return;
            }
            splits = selectedMemberIds.map(uid => ({
                userId: uid,
                amountOwed: (totalAmount * parseFloat(splitValues[uid] || '0')) / tally.total
            }));
        }

        setLoading(true);
        try {
            const payload: CreateExpenseRequest = {
                description,
                amount: totalAmount,
                currencyId: selectedCurrencyId,
                splitType,
                payers: [{ userId: currentUserId!, paidAmount: totalAmount }],
                splits,
            };
            await createNewExpense(selectedGroupId, payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Success', 'Expense added successfully! 🎉', 'success');
            resetAndClose();
        } catch (err: any) {
            showToast('Error', err?.message || 'Could not add expense', 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setDescription(''); setAmount(''); setSelectedGroupId('');
        setGroupMembers([]); setSelectedMemberIds([]); setSplitValues({});
        onClose();
    };

    const getSelectedGroupName = () => groups.find(g => g.groupId === selectedGroupId)?.name || 'Select Group';
    const getSelectedCurrency = () => currencies.find(c => c.currencyId === selectedCurrencyId);

    return (
        <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
            <BlurView intensity={30} tint="dark" style={styles.overlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>Add Expense</Text>
                                <Text style={styles.headerSubtitle}>Split with anyone in the group</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}><X color="#829AC9" size={24} /></TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled" 
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                        >
                            <Text style={styles.label}>Select Group</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}>
                                <Users size={18} color="#8B5CF6" style={{ marginRight: 10 }} />
                                <Text numberOfLines={1} style={styles.dropdownText}>{getSelectedGroupName()}</Text>
                                <ChevronDown size={18} color="#4B5E8A" />
                            </TouchableOpacity>

                            {isGroupDropdownOpen && (
                                <View style={styles.dropdownList}>
                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {groups.map(g => (
                                            <TouchableOpacity key={g.groupId} style={styles.dropdownItem} onPress={() => { setSelectedGroupId(g.groupId); setIsGroupDropdownOpen(false); }}>
                                                <Text style={styles.dropdownItemText}>{g.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.inputRow}>
                                <View style={{ flex: 1.5, marginRight: 12 }}>
                                    <Text style={styles.label}>Amount</Text>
                                    <View style={styles.amountInputWrap}>
                                        <TouchableOpacity onPress={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)} style={styles.currencyBtn}>
                                            <Text style={styles.currencyText}>{getSelectedCurrency()?.symbol || '₹'}</Text>
                                            <ChevronDown size={12} color="#8B5CF6" />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.amountInput}
                                            placeholder="0.00"
                                            placeholderTextColor="#4B5E8A"
                                            keyboardType="numeric"
                                            value={amount}
                                            onChangeText={setAmount}
                                        />
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Currency</Text>
                                    <TouchableOpacity style={styles.dropdown} onPress={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}>
                                        <Text style={styles.dropdownText}>{getSelectedCurrency()?.code || 'INR'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {isCurrencyDropdownOpen && (
                                <View style={[styles.dropdownList, { top: 205 }]}>
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {currencies.map(c => (
                                            <TouchableOpacity key={c.currencyId} style={styles.dropdownItem} onPress={() => { setSelectedCurrencyId(c.currencyId); setIsCurrencyDropdownOpen(false); }}>
                                                <Text style={styles.dropdownItemText}>{c.code} - {c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={styles.descInput}
                                placeholder="What was this for?"
                                placeholderTextColor="#4B5E8A"
                                value={description}
                                onChangeText={setDescription}
                            />

                            <Text style={styles.label}>Participants</Text>
                            <View style={[styles.searchBarWrap, isParticipantDropdownOpen && styles.searchBarWrapActive]}>
                                <Search size={18} color="#8B5CF6" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={selectedGroupId ? "Search group members..." : "Select a group first"}
                                    placeholderTextColor="#4B5E8A"
                                    value={participantSearch}
                                    onChangeText={t => { setParticipantSearch(t); setIsParticipantDropdownOpen(true); }}
                                    onFocus={() => setIsParticipantDropdownOpen(true)}
                                    disabled={!selectedGroupId}
                                />
                                <TouchableOpacity onPress={() => setIsParticipantDropdownOpen(!isParticipantDropdownOpen)}>
                                    {isParticipantDropdownOpen ? <ChevronUp size={20} color="#4B5E8A" /> : <ChevronDown size={20} color="#4B5E8A" />}
                                </TouchableOpacity>
                            </View>

                            {isParticipantDropdownOpen && (
                                <View style={styles.participantDropdown}>
                                    <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {filteredOptions.length > 0 ? (
                                            filteredOptions.map(user => (
                                                <TouchableOpacity key={user.userId} style={styles.participantItem} onPress={() => handleSelectParticipant(user)}>
                                                    <View style={styles.avatarSmall}><Text style={styles.avatarTextSmall}>{user.name[0]}</Text></View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.participantName}>{user.name}</Text>
                                                        <Text style={styles.participantEmail}>{user.email}</Text>
                                                    </View>
                                                    <Plus size={16} color="#8B5CF6" />
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={styles.noResultText}>{participantSearch ? 'No matches found' : 'No more members to add'}</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.splitSelector}>
                                {(['EQUAL', 'PERCENTAGE', 'RATIO'] as SplitMode[]).map(mode => (
                                    <TouchableOpacity key={mode} style={[styles.splitTab, splitType === mode && styles.splitTabActive]} onPress={() => setSplitType(mode)}>
                                        <Text style={[styles.splitTabText, splitType === mode && styles.splitTabTextActive]}>{mode.charAt(0) + mode.slice(1).toLowerCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.selectedList}>
                                {selectedMemberIds.length === 0 ? (
                                    <Text style={styles.emptyText}>No participants selected. Use the search above.</Text>
                                ) : (
                                    selectedMemberIds.map(uid => {
                                        const user = groupMembers.find(m => m.userId === uid);
                                        if (!user) return null;
                                        return (
                                            <View key={uid} style={styles.selectedRow}>
                                                <View style={styles.userInfo}>
                                                    <View style={styles.avatar}><Text style={styles.avatarText}>{user.name[0]}</Text></View>
                                                    <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                                                </View>
                                                {splitType === 'EQUAL' ? (
                                                    <Text style={styles.equalAmount}>{getSelectedCurrency()?.symbol || '₹'}{(tally.perPerson || 0).toFixed(2)}</Text>
                                                ) : (
                                                    <View style={styles.splitInputWrap}>
                                                        <TextInput
                                                            style={styles.splitInput}
                                                            placeholder="0"
                                                            placeholderTextColor="#4B5E8A"
                                                            keyboardType="numeric"
                                                            value={splitValues[uid] || ''}
                                                            onChangeText={v => setSplitValues(prev => ({ ...prev, [uid]: v }))}
                                                        />
                                                        <Text style={styles.splitUnit}>{splitType === 'PERCENTAGE' ? '%' : 'sh'}</Text>
                                                    </View>
                                                )}
                                                <TouchableOpacity onPress={() => removeParticipant(uid)} style={styles.removeBtn}>
                                                    <X size={14} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            {selectedMemberIds.length > 0 && splitType !== 'EQUAL' && (
                                <View style={[styles.tallyBox, Math.abs(tally.total - 100) > 0.1 && splitType === 'PERCENTAGE' && styles.tallyBoxError]}>
                                    <View style={styles.tallyMain}>
                                        <Text style={styles.tallyLabel}>Total {splitType.toLowerCase()} allocated</Text>
                                        <Text style={styles.tallyValue}>{tally.total.toFixed(1)}{tally.unit}</Text>
                                    </View>
                                    {splitType === 'PERCENTAGE' && (
                                        <View style={styles.tallyStatus}>
                                            <Text style={styles.tallyStatusText}>
                                                {tally.remaining > 0 ? `${tally.remaining.toFixed(1)}% left` : tally.remaining < 0 ? `${Math.abs(tally.remaining).toFixed(1)}% over` : 'Correctly split!'}
                                            </Text>
                                            {Math.abs(tally.remaining) > 0.1 && <AlertCircle size={14} color="#F59E0B" />}
                                            {Math.abs(tally.remaining) <= 0.1 && <Check size={14} color="#10B981" />}
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
                                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Create Expense</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    keyboardView: { width: '100%', justifyContent: 'flex-end' },
    sheet: { 
        backgroundColor: '#0B1128', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: WINDOW_HEIGHT * 0.9, 
        minHeight: WINDOW_HEIGHT * 0.5,
        borderWidth: 1, 
        borderColor: '#1C2854',
        width: '100%'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    headerSubtitle: { color: '#829AC9', fontSize: 13, marginTop: 4 },
    closeBtn: { padding: 4 },

    scroll: { flexGrow: 0 },
    scrollContent: { paddingBottom: 20 },

    label: { color: '#829AC9', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 14 },
    dropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131B3A', borderRadius: 14, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#24335E' },
    dropdownText: { color: 'white', flex: 1, fontSize: 14 },
    dropdownList: { backgroundColor: '#1C2854', borderRadius: 14, marginTop: 4, borderWidth: 1, borderColor: '#24335E', overflow: 'hidden', position: 'absolute', width: '100%', zIndex: 100 },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#24335E' },
    dropdownItemText: { color: 'white', fontSize: 14 },

    inputRow: { flexDirection: 'row', marginTop: 8 },
    amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131B3A', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#24335E', overflow: 'hidden' },
    currencyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2854', paddingHorizontal: 12, height: '100%', borderRightWidth: 1, borderRightColor: '#24335E' },
    currencyText: { color: '#8B5CF6', fontWeight: 'bold', fontSize: 15, marginRight: 4 },
    amountInput: { flex: 1, color: 'white', fontSize: 17, fontWeight: 'bold', paddingHorizontal: 12 },
    descInput: { backgroundColor: '#131B3A', borderRadius: 14, paddingHorizontal: 16, height: 48, color: 'white', fontSize: 14, borderWidth: 1, borderColor: '#24335E' },

    searchBarWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131B3A', borderRadius: 14, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#24335E' },
    searchBarWrapActive: { borderColor: '#8B5CF6' },
    searchInput: { flex: 1, color: 'white', fontSize: 14 },

    participantDropdown: { backgroundColor: '#1C2854', borderRadius: 14, marginTop: 4, borderWidth: 1, borderColor: '#8B5CF6', paddingBottom: 8, zIndex: 200 },
    participantItem: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, gap: 12 },
    participantName: { color: 'white', fontSize: 14, fontWeight: '600' },
    participantEmail: { color: '#829AC9', fontSize: 11 },
    noResultText: { color: '#4B5E8A', textAlign: 'center', padding: 20, fontSize: 14 },

    splitSelector: { flexDirection: 'row', backgroundColor: '#131B3A', borderRadius: 14, padding: 4, marginTop: 18, marginBottom: 12 },
    splitTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
    splitTabActive: { backgroundColor: '#8B5CF6' },
    splitTabText: { color: '#829AC9', fontSize: 12, fontWeight: '600' },
    splitTabTextActive: { color: 'white' },

    selectedList: { backgroundColor: '#131B3A', borderRadius: 16, padding: 6, marginTop: 6 },
    selectedRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#1C2854', gap: 10 },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    avatarTextSmall: { color: 'white', fontWeight: 'bold', fontSize: 11 },
    userName: { color: 'white', fontSize: 13, fontWeight: '600' },
    equalAmount: { color: '#8B5CF6', fontWeight: 'bold', fontSize: 13 },
    removeBtn: { padding: 4 },

    splitInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1128', borderRadius: 8, paddingHorizontal: 8, height: 30, borderWidth: 1, borderColor: '#24335E', width: 65 },
    splitInput: { flex: 1, color: 'white', textAlign: 'right', fontWeight: 'bold', fontSize: 12, padding: 0 },
    splitUnit: { color: '#829AC9', fontSize: 10, marginLeft: 2 },

    emptyText: { color: '#4B5E8A', textAlign: 'center', padding: 20, fontSize: 13 },

    tallyBox: { backgroundColor: '#1C2854', borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#24335E' },
    tallyBoxError: { borderColor: '#F59E0B' },
    tallyMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tallyLabel: { color: 'white', fontSize: 13, fontWeight: '600' },
    tallyValue: { color: '#8B5CF6', fontSize: 16, fontWeight: 'bold' },
    tallyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tallyStatusText: { color: '#829AC9', fontSize: 11 },

    footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelButton: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#131B3A', borderWidth: 1, borderColor: '#24335E' },
    submitButton: { flex: 2, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});

export default AddExpenseModal;
