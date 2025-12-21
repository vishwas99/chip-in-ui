import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { addExpense, AddExpenseRequest, fetchUserExpenses, fetchCurrencies, GroupInfo, Currency, fetchGroupMembers, GroupMember, SplitRequest } from '../util/apiService';
import { useRouter } from 'expo-router';
import { getAuthData } from '../util/authService';
import { ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react-native';

interface AddExpenseModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentUserId?: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isVisible, onClose, currentUserId }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('');

    const [groups, setGroups] = useState<GroupInfo[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    // Split Logic States
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]); // Array for easier JSON handling
    const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({}); // UserId -> Amount string

    // UI States for Dropdowns
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (isVisible) {
            fetchData();
        }
    }, [isVisible, currentUserId]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchMembersForGroup(selectedGroupId);
        } else {
            setGroupMembers([]);
            setSelectedMemberIds([]);
            setCustomSplitAmounts({});
        }
    }, [selectedGroupId]);

    const fetchMembersForGroup = async (groupId: string) => {
        const response = await fetchGroupMembers(groupId);
        if (response.success) {
            console.log("Fetched Group Members:", JSON.stringify(response.data, null, 2));
            setGroupMembers(response.data);
            // Default: Select all members for EQUAL split
            setSelectedMemberIds(response.data.map(m => m.userId));
            // Initialize custom amounts with empty
            const initialCustom: Record<string, string> = {};
            response.data.forEach(m => initialCustom[m.userId] = '');
            setCustomSplitAmounts(initialCustom);
        }
    };

    const fetchData = async () => {
        setFetchingData(true);
        try {
            let userId = currentUserId;
            if (!userId) {
                const auth = await getAuthData();
                userId = auth.userId;
            }

            if (userId) {
                // Fetch Groups
                const groupsResponse = await fetchUserExpenses(userId);
                if (groupsResponse.success) {
                    const extractedGroups = groupsResponse.data.userGroupResponses.map(item => item.group);
                    setGroups(extractedGroups);
                }

                // Fetch Currencies
                const currResponse = await fetchCurrencies(userId);
                if (currResponse.success) {
                    setCurrencies(currResponse.data);
                }
            }
        } catch (err) {
            console.error("Error fetching data for modal", err);
            // Non-blocking error, user just won't see options
        } finally {
            setFetchingData(false);
        }
    };

    const toggleMemberSelection = (userId: string) => {
        if (selectedMemberIds.includes(userId)) {
            setSelectedMemberIds(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedMemberIds(prev => [...prev, userId]);
        }
    };

    const handleCreate = async () => {
        setError('');

        if (!selectedGroupId) {
            setError('Please select a group');
            return;
        }
        if (!name) {
            setError('Please enter expense name');
            return;
        }
        if (!amount || isNaN(Number(amount))) {
            setError('Please enter a valid amount');
            return;
        }
        if (!selectedCurrencyId) {
            setError('Please select a currency');
            return;
        }

        // Split Validation & Construction
        let expenseSplits: SplitRequest[] = [];
        const totalAmount = Number(amount);

        console.log("Total Amount:", totalAmount);
        console.log("Selected Member IDs:", selectedMemberIds);

        if (splitMode === 'EQUAL') {
            if (selectedMemberIds.length === 0) {
                setError('Please select at least one member to split with');
                return;
            }
            const splitAmount = totalAmount / selectedMemberIds.length;
            expenseSplits = selectedMemberIds.map(uid => ({
                userId: uid,
                amount: splitAmount
            }));
        } else {
            // CUSTOM
            let currentSum = 0;
            const splits: SplitRequest[] = [];

            for (const member of groupMembers) {
                const val = parseFloat(customSplitAmounts[member.userId] || '0');
                if (val > 0) {
                    splits.push({ userId: member.userId, amount: val });
                    currentSum += val;
                }
            }

            if (Math.abs(currentSum - totalAmount) > 0.01) {
                setError(`Split amounts sum (${currentSum}) does not match total (${totalAmount})`);
                return;
            }
            if (splits.length === 0) {
                setError('Please enter split amounts');
                return;
            }
            expenseSplits = splits;
        }

        setLoading(true);

        try {
            let userId = currentUserId;
            if (!userId) {
                const auth = await getAuthData();
                userId = auth.userId;
            }

            if (!userId) {
                setError('User not authenticated');
                setLoading(false);
                return;
            }

            const payload: AddExpenseRequest = {
                groupId: selectedGroupId,
                expenseOwner: userId,
                amount: totalAmount,
                description: description,
                expenseName: name,
                expenseSplit: expenseSplits,
                currencyId: selectedCurrencyId
            };

            console.log("Add Expense Payload:", JSON.stringify(payload, null, 2));

            const response = await addExpense(payload);

            if (response.success) {
                // Reset form
                setName('');
                setDescription('');
                setAmount('');
                setSelectedGroupId('');
                setSelectedCurrencyId('');
                setCustomSplitAmounts({});
                setSelectedMemberIds([]);
                onClose();
                Alert.alert("Success", "Expense added successfully!");
            } else {
                setError(response.message || 'Failed to add expense');
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getSelectedGroupName = () => {
        const group = groups.find(g => g.groupId === selectedGroupId);
        return group ? group.groupName : "Select Group";
    };

    const getSelectedCurrencyName = () => {
        const currency = currencies.find(c => c.id === selectedCurrencyId);
        return currency ? currency.currencyName : "Select Currency";
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Add New Expense</Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* Group Dropdown */}
                    <Text style={styles.label}>Group</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                            setIsGroupDropdownOpen(!isGroupDropdownOpen);
                            setIsCurrencyDropdownOpen(false); // Close other
                        }}
                    >
                        <Text style={styles.dropdownText}>
                            {getSelectedGroupName()}
                        </Text>
                        {isGroupDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                    {isGroupDropdownOpen && (
                        <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }}>
                                {groups.map(group => (
                                    <TouchableOpacity
                                        key={group.groupId}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSelectedGroupId(group.groupId);
                                            setIsGroupDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownItemText}>{group.groupName}</Text>
                                    </TouchableOpacity>
                                ))}
                                {groups.length === 0 && <Text style={styles.emptyText}>No groups found</Text>}
                            </ScrollView>
                        </View>
                    )}


                    <Text style={styles.label}>Expense Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter expense name"
                        placeholderTextColor="#9ca3af"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter description"
                        placeholderTextColor="#9ca3af"
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    {/* Currency Dropdown */}
                    <Text style={styles.label}>Currency</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                            setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen);
                            setIsGroupDropdownOpen(false); // Close other
                        }}
                    >
                        <Text style={styles.dropdownText}>
                            {getSelectedCurrencyName()}
                        </Text>
                        {isCurrencyDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                    {isCurrencyDropdownOpen && (
                        <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }}>
                                {currencies.map(curr => {
                                    // Custom indicator logic: if exchangeTo is not null, it's custom
                                    const isCustom = curr.exchangeTo !== null && curr.exchangeTo !== undefined;
                                    return (
                                        <TouchableOpacity
                                            key={curr.id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedCurrencyId(curr.id);
                                                setIsCurrencyDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownItemText}>
                                                {curr.currencyName} {isCustom ? "(Custom)" : ""}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                {currencies.length === 0 && <Text style={styles.emptyText}>No currencies found</Text>}
                            </ScrollView>
                        </View>
                    )}

                    {/* Split Section */}
                    {groupMembers.length > 0 && (
                        <View style={styles.splitSection}>
                            <Text style={styles.sectionHeader}>Split Expense</Text>

                            {/* Toggle Mode */}
                            <View style={styles.splitToggleContainer}>
                                <TouchableOpacity
                                    style={[styles.splitToggleButton, splitMode === 'EQUAL' && styles.splitToggleButtonActive]}
                                    onPress={() => setSplitMode('EQUAL')}
                                >
                                    <Text style={[styles.splitToggleText, splitMode === 'EQUAL' && styles.splitToggleTextActive]}>Equally</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.splitToggleButton, splitMode === 'CUSTOM' && styles.splitToggleButtonActive]}
                                    onPress={() => setSplitMode('CUSTOM')}
                                >
                                    <Text style={[styles.splitToggleText, splitMode === 'CUSTOM' && styles.splitToggleTextActive]}>Unequally</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Members List */}
                            <ScrollView style={styles.membersList}>
                                {groupMembers.map(member => {
                                    const isSelected = selectedMemberIds.includes(member.userId);
                                    const equalAmount = (amount && !isNaN(Number(amount)) && selectedMemberIds.length > 0)
                                        ? (Number(amount) / selectedMemberIds.length).toFixed(2)
                                        : '0.00';

                                    return (
                                        <View key={member.userId} style={styles.memberRow}>
                                            <View style={styles.memberInfo}>
                                                {splitMode === 'EQUAL' && (
                                                    <TouchableOpacity onPress={() => toggleMemberSelection(member.userId)}>
                                                        {isSelected ? <CheckSquare size={20} color="#33f584" /> : <Square size={20} color="#9ca3af" />}
                                                    </TouchableOpacity>
                                                )}
                                                <Text style={styles.memberName}>{member.name}</Text>
                                            </View>

                                            {splitMode === 'EQUAL' ? (
                                                <Text style={styles.memberAmount}>
                                                    {isSelected ? equalAmount : '0.00'}
                                                </Text>
                                            ) : (
                                                <TextInput
                                                    style={styles.amountInput}
                                                    placeholder="0.00"
                                                    placeholderTextColor="#6b7280"
                                                    keyboardType="numeric"
                                                    value={customSplitAmounts[member.userId] || ''}
                                                    onChangeText={(val) => setCustomSplitAmounts(prev => ({ ...prev, [member.userId]: val }))}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}


                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonClose]}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={styles.textStyle}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonCreate]}
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.textStyle}>Add</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#212121',
        borderRadius: 20,
        padding: 25,
        width: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginTop: 20,
        gap: 10,
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 80,
        alignItems: 'center',
    },
    buttonClose: {
        backgroundColor: '#ef4444',
    },
    buttonCreate: {
        backgroundColor: '#33f584',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        alignSelf: 'center',
    },
    label: {
        color: '#9ca3af',
        marginBottom: 5,
        marginTop: 10,
        fontSize: 14,
    },
    input: {
        height: 45,
        width: '100%',
        borderColor: '#4b5563',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        color: 'white',
        backgroundColor: '#374151',
    },
    dropdown: {
        height: 45,
        width: '100%',
        borderColor: '#4b5563',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#374151',
    },
    dropdownText: {
        color: 'white',
    },
    errorText: {
        color: '#ef4444',
        marginBottom: 10,
        alignSelf: 'center',
    },
    dropdownList: {
        backgroundColor: '#374151',
        borderRadius: 8,
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#4b5563',
        maxHeight: 150,
        zIndex: 1000,
    },
    dropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#4b5563',
    },
    dropdownItemText: {
        color: 'white',
    },
    emptyText: {
        color: 'gray',
        padding: 10,
        textAlign: 'center',
    },
    splitSection: {
        marginTop: 20,
        width: '100%',
    },
    sectionHeader: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 10,
    },
    splitToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 2,
        marginBottom: 10,
    },
    splitToggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    splitToggleButtonActive: {
        backgroundColor: '#4b5563',
    },
    splitToggleText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    splitToggleTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    membersList: {
        maxHeight: 150,
        borderWidth: 1,
        borderColor: '#4b5563',
        borderRadius: 8,
        padding: 5,
    },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    memberName: {
        color: 'white',
        flex: 1,
    },
    memberAmount: {
        color: 'white',
        fontWeight: 'bold',
        minWidth: 60,
        textAlign: 'right',
    },
    amountInput: {
        backgroundColor: '#374151', // Darker background for input
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        color: 'white',
        width: 80,
        textAlign: 'right',
        borderWidth: 1,
        borderColor: '#4b5563',
    }
});

export default AddExpenseModal;
