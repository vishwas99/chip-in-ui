import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { createNewExpense, CreateExpenseRequest, fetchMyGroups, fetchAllCurrencies, fetchGroupDashboard, Currency } from '../util/apiService';
import { getAuthData } from '../util/authService';
import { ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react-native';

interface AddExpenseModalProps {
    isVisible: boolean;
    onClose: () => void;
}

interface GroupOption { groupId: string; groupName: string; }
interface MemberOption { userId: string; name: string; }

// Expense categories (free string, per contract)
const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Transport', 'Other'];

// Expense type per contract: EXPENSE | SETTLEMENT
const EXPENSE_TYPES = ['EXPENSE', 'SETTLEMENT'];

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isVisible, onClose }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Food');
    const [splitType, setSplitType] = useState<'EQUAL' | 'UNEQUAL'>('EQUAL');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [members, setMembers] = useState<MemberOption[]>([]);

    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isVisible) fetchInitialData();
    }, [isVisible]);

    useEffect(() => {
        if (selectedGroupId) loadGroupMembers(selectedGroupId);
        else { setMembers([]); setSelectedMemberIds([]); }
    }, [selectedGroupId]);

    const fetchInitialData = async () => {
        setFetchingData(true);
        try {
            const auth = await getAuthData();
            setCurrentUserId(auth.userId);

            const [groupsRes, currenciesRes] = await Promise.all([
                fetchMyGroups(),          // GET /api/groups/me
                fetchAllCurrencies(),
            ]);

            // GroupResponse shape: { groupId, name, description, type, defaultCurrency, ... }
            const mappedGroups = (groupsRes || []).map((g: any): GroupOption => ({
                groupId: g.groupId || g.group?.groupId,
                groupName: g.name || g.groupName || g.group?.name || 'Unnamed Group',
            }));
            setGroups(mappedGroups);

            setCurrencies(currenciesRes || []);
            if (currenciesRes?.length > 0 && !selectedCurrencyId) {
                setSelectedCurrencyId(currenciesRes[0].currencyId);
            }
        } catch (e) {
            console.error('Failed to load data for expense modal', e);
        } finally {
            setFetchingData(false);
        }
    };

    const loadGroupMembers = async (groupId: string) => {
        try {
            // Use group dashboard to get member list via userBalances
            const currencyId = selectedCurrencyId;
            const dashboard = await fetchGroupDashboard(groupId);
            const balances: MemberOption[] = (dashboard.userBalances || []).map((b: any): MemberOption => ({
                userId: b.userId || b.user?.userId || b.user?.id,
                name: b.userName || b.user?.name || b.name || 'Unknown',
            })).filter((m: MemberOption) => m.userId);
            setMembers(balances);
            setSelectedMemberIds(balances.map(m => m.userId));
            const initial: Record<string, string> = {};
            balances.forEach(m => initial[m.userId] = '');
            setCustomSplitAmounts(initial);
        } catch (e) {
            console.error('Failed to load group members', e);
        }
    };

    const toggleMember = (userId: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const getGroupName = () => groups.find(g => g.groupId === selectedGroupId)?.groupName || 'Select Group';
    const getCurrencyName = () => {
        const c = currencies.find(c => c.currencyId === selectedCurrencyId);
        return c ? `${c.symbol} ${c.name} (${c.code})` : 'Select Currency';
    };

    const handleCreate = async () => {
        setError('');
        if (!selectedGroupId) { setError('Please select a group'); return; }
        if (!description) { setError('Please enter a description'); return; }
        if (!amount || isNaN(Number(amount))) { setError('Please enter a valid amount'); return; }
        if (!selectedCurrencyId) { setError('Please select a currency'); return; }
        if (!currentUserId) { setError('User not authenticated'); return; }

        const totalAmount = Number(amount);
        let splits: { userId: string; amountOwed: number }[] = [];

        if (splitType === 'EQUAL') {
            if (selectedMemberIds.length === 0) { setError('Select at least one member'); return; }
            const share = totalAmount / selectedMemberIds.length;
            splits = selectedMemberIds.map(uid => ({ userId: uid, amountOwed: share }));
        } else {
            let sum = 0;
            for (const m of members) {
                const val = parseFloat(customSplitAmounts[m.userId] || '0');
                if (val > 0) { splits.push({ userId: m.userId, amountOwed: val }); sum += val; }
            }
            if (Math.abs(sum - totalAmount) > 0.01) { setError(`Split total (${sum.toFixed(2)}) ≠ amount (${totalAmount.toFixed(2)})`); return; }
            if (splits.length === 0) { setError('Enter split amounts'); return; }
        }

        setLoading(true);
        try {
            // POST /api/groups/{groupId}/expenses
            const payload: CreateExpenseRequest = {
                description,
                amount: totalAmount,
                currencyId: selectedCurrencyId,
                splitType,
                type: selectedCategory,   // expense category string
                payers: [{ userId: currentUserId, paidAmount: totalAmount }],
                splits,
            };

            console.log('Add Expense Payload:', JSON.stringify(payload, null, 2));
            await createNewExpense(selectedGroupId, payload);

            // Reset form
            setDescription(''); setAmount(''); setSelectedGroupId('');
            setSelectedMemberIds([]); setCustomSplitAmounts({});
            onClose();
            Alert.alert('Success', 'Expense added successfully!');
        } catch (err: any) {
            setError(err?.message || 'Failed to add expense');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const closeAll = () => { setIsGroupDropdownOpen(false); setIsCurrencyDropdownOpen(false); setIsCategoryDropdownOpen(false); };

    return (
        <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centeredView}>
                <View style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalText}>Add New Expense</Text>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        {fetchingData ? (
                            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 20 }} />
                        ) : (
                            <>
                                {/* Group Dropdown */}
                                <Text style={styles.label}>Group *</Text>
                                <TouchableOpacity style={styles.dropdown} onPress={() => { closeAll(); setIsGroupDropdownOpen(!isGroupDropdownOpen); }}>
                                    <Text style={styles.dropdownText}>{getGroupName()}</Text>
                                    {isGroupDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                                </TouchableOpacity>
                                {isGroupDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                                            {groups.map(g => (
                                                <TouchableOpacity key={g.groupId} style={styles.dropdownItem} onPress={() => { setSelectedGroupId(g.groupId); setIsGroupDropdownOpen(false); }}>
                                                    <Text style={[styles.dropdownItemText, selectedGroupId === g.groupId && { color: '#8B5CF6', fontWeight: 'bold' }]}>{g.groupName}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {groups.length === 0 && <Text style={styles.emptyText}>No groups found</Text>}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Description */}
                                <Text style={styles.label}>Description *</Text>
                                <TextInput style={styles.input} placeholder="e.g. Dinner at restaurant" placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} />

                                {/* Amount */}
                                <Text style={styles.label}>Amount *</Text>
                                <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="numeric" value={amount} onChangeText={setAmount} />

                                {/* Currency Dropdown */}
                                <Text style={styles.label}>Currency *</Text>
                                <TouchableOpacity style={styles.dropdown} onPress={() => { closeAll(); setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen); }}>
                                    <Text style={styles.dropdownText}>{getCurrencyName()}</Text>
                                    {isCurrencyDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                                </TouchableOpacity>
                                {isCurrencyDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                                            {currencies.map(c => (
                                                <TouchableOpacity key={c.currencyId} style={styles.dropdownItem} onPress={() => { setSelectedCurrencyId(c.currencyId); setIsCurrencyDropdownOpen(false); }}>
                                                    <Text style={[styles.dropdownItemText, selectedCurrencyId === c.currencyId && { color: '#8B5CF6', fontWeight: 'bold' }]}>{c.symbol} {c.name} ({c.code})</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Expense Category */}
                                <Text style={styles.label}>Category</Text>
                                <TouchableOpacity style={styles.dropdown} onPress={() => { closeAll(); setIsCategoryDropdownOpen(!isCategoryDropdownOpen); }}>
                                    <Text style={styles.dropdownText}>{selectedCategory}</Text>
                                    {isCategoryDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                                </TouchableOpacity>
                                {isCategoryDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <TouchableOpacity key={cat} style={styles.dropdownItem} onPress={() => { setSelectedCategory(cat); setIsCategoryDropdownOpen(false); }}>
                                                <Text style={[styles.dropdownItemText, selectedCategory === cat && { color: '#8B5CF6', fontWeight: 'bold' }]}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Split Section */}
                                {members.length > 0 && (
                                    <View style={styles.splitSection}>
                                        <Text style={styles.sectionHeader}>Split Expense</Text>

                                        {/* Toggle */}
                                        <View style={styles.splitToggleContainer}>
                                            {(['EQUAL', 'UNEQUAL'] as const).map(mode => (
                                                <TouchableOpacity key={mode} style={[styles.splitToggleButton, splitType === mode && styles.splitToggleButtonActive]} onPress={() => setSplitType(mode)}>
                                                    <Text style={[styles.splitToggleText, splitType === mode && styles.splitToggleTextActive]}>{mode === 'EQUAL' ? 'Equally' : 'Unequally'}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Members */}
                                        <ScrollView style={styles.membersList} nestedScrollEnabled>
                                            {members.map(member => {
                                                const isSelected = selectedMemberIds.includes(member.userId);
                                                const equalAmt = (amount && !isNaN(Number(amount)) && selectedMemberIds.length > 0)
                                                    ? (Number(amount) / selectedMemberIds.length).toFixed(2) : '0.00';
                                                return (
                                                    <View key={member.userId} style={styles.memberRow}>
                                                        <View style={styles.memberInfo}>
                                                            {splitType === 'EQUAL' && (
                                                                <TouchableOpacity onPress={() => toggleMember(member.userId)}>
                                                                    {isSelected ? <CheckSquare size={20} color="#8B5CF6" /> : <Square size={20} color="#9ca3af" />}
                                                                </TouchableOpacity>
                                                            )}
                                                            <Text style={styles.memberName}>{member.name}</Text>
                                                        </View>
                                                        {splitType === 'EQUAL' ? (
                                                            <Text style={styles.memberAmount}>{isSelected ? equalAmt : '0.00'}</Text>
                                                        ) : (
                                                            <TextInput
                                                                style={styles.amountInput}
                                                                placeholder="0.00"
                                                                placeholderTextColor="#6b7280"
                                                                keyboardType="numeric"
                                                                value={customSplitAmounts[member.userId] || ''}
                                                                onChangeText={val => setCustomSplitAmounts(prev => ({ ...prev, [member.userId]: val }))}
                                                            />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Buttons */}
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={onClose} disabled={loading}>
                                        <Text style={styles.textStyle}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.button, styles.buttonCreate]} onPress={handleCreate} disabled={loading}>
                                        {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.textStyle}>Add</Text>}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalView: { margin: 20, backgroundColor: '#131B3A', borderRadius: 20, padding: 25, width: '92%', elevation: 5 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginTop: 20, gap: 10 },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 80, alignItems: 'center' },
    buttonClose: { backgroundColor: '#ef4444' },
    buttonCreate: { backgroundColor: '#8B5CF6' },
    textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    modalText: { marginBottom: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: 'white', alignSelf: 'center' },
    label: { color: '#9ca3af', marginBottom: 5, marginTop: 10, fontSize: 13 },
    input: { height: 45, width: '100%', borderColor: '#24335E', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: 'white', backgroundColor: '#0B1128' },
    dropdown: { height: 45, width: '100%', borderColor: '#24335E', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B1128' },
    dropdownText: { color: 'white' },
    errorText: { color: '#ef4444', marginBottom: 10, alignSelf: 'center', fontSize: 13 },
    dropdownList: { backgroundColor: '#1C2854', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#24335E', zIndex: 1000 },
    dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#24335E' },
    dropdownItemText: { color: 'white' },
    emptyText: { color: 'gray', padding: 10, textAlign: 'center' },
    splitSection: { marginTop: 20, width: '100%' },
    sectionHeader: { color: '#9ca3af', fontSize: 13, marginBottom: 10 },
    splitToggleContainer: { flexDirection: 'row', backgroundColor: '#1C2854', borderRadius: 8, padding: 2, marginBottom: 10 },
    splitToggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    splitToggleButtonActive: { backgroundColor: '#8B5CF6' },
    splitToggleText: { color: '#9ca3af', fontSize: 14 },
    splitToggleTextActive: { color: 'white', fontWeight: 'bold' },
    membersList: { maxHeight: 160, borderWidth: 1, borderColor: '#24335E', borderRadius: 8, padding: 5 },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#1C2854' },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    memberName: { color: 'white', flex: 1 },
    memberAmount: { color: 'white', fontWeight: 'bold', minWidth: 60, textAlign: 'right' },
    amountInput: { backgroundColor: '#0B1128', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4, color: 'white', width: 80, textAlign: 'right', borderWidth: 1, borderColor: '#24335E' },
});

export default AddExpenseModal;
