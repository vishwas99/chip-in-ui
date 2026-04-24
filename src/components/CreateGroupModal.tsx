import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createNewGroup, fetchAllCurrencies, Currency } from '../util/apiService';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

interface CreateGroupModalProps {
    isVisible: boolean;
    onClose: () => void;
}

const GROUP_TYPES = ['TRIP', 'HOME', 'COUPLE', 'APARTMENT', 'WORK', 'FRIENDS', 'OTHER'];

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isVisible, onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [selectedType, setSelectedType] = useState('TRIP');
    const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
    const [simplifyDebt, setSimplifyDebt] = useState(true);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingCurrencies, setFetchingCurrencies] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (isVisible) {
            loadCurrencies();
        }
    }, [isVisible]);

    const loadCurrencies = async () => {
        setFetchingCurrencies(true);
        try {
            const data = await fetchAllCurrencies();
            setCurrencies(data);
            if (data.length > 0 && !selectedCurrencyId) {
                setSelectedCurrencyId(data[0].currencyId);
            }
        } catch (e) {
            console.error('Failed to load currencies', e);
        } finally {
            setFetchingCurrencies(false);
        }
    };

    const getSelectedCurrencyName = () => {
        const c = currencies.find(c => c.currencyId === selectedCurrencyId);
        return c ? `${c.symbol} ${c.name} (${c.code})` : 'Select Currency';
    };

    const handleCreate = async () => {
        if (!groupName || groupName.length < 2) {
            setError('Group name must be at least 2 characters');
            return;
        }
        if (!selectedCurrencyId) {
            setError('Please select a default currency');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await createNewGroup({
                name: groupName,
                description: groupDescription || undefined,
                type: selectedType,
                simplifyDebt,
                defaultCurrencyId: selectedCurrencyId,
            });

            // response is the GroupResponse object
            const groupId = response?.groupId || response?.id || response;
            setGroupName('');
            setGroupDescription('');
            setSelectedType('TRIP');
            setSimplifyDebt(true);
            onClose();

            if (groupId && typeof groupId === 'string') {
                router.push({ pathname: '/group/[groupId]', params: { groupId } });
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to create group');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centeredView}>
                <View style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalText}>Create New Group</Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        {/* Group Name */}
                        <Text style={styles.label}>Group Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Goa Trip"
                            placeholderTextColor="#9ca3af"
                            value={groupName}
                            onChangeText={setGroupName}
                        />

                        {/* Description */}
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional description"
                            placeholderTextColor="#9ca3af"
                            value={groupDescription}
                            onChangeText={setGroupDescription}
                        />

                        {/* Group Type */}
                        <Text style={styles.label}>Group Type *</Text>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsCurrencyDropdownOpen(false); }}
                        >
                            <Text style={styles.dropdownText}>{selectedType}</Text>
                            {isTypeDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                        </TouchableOpacity>
                        {isTypeDropdownOpen && (
                            <View style={styles.dropdownList}>
                                {GROUP_TYPES.map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={styles.dropdownItem}
                                        onPress={() => { setSelectedType(type); setIsTypeDropdownOpen(false); }}
                                    >
                                        <Text style={[styles.dropdownItemText, selectedType === type && { color: '#8B5CF6', fontWeight: 'bold' }]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Default Currency */}
                        <Text style={styles.label}>Default Currency *</Text>
                        {fetchingCurrencies ? (
                            <ActivityIndicator size="small" color="#8B5CF6" />
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => { setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen); setIsTypeDropdownOpen(false); }}
                                >
                                    <Text style={styles.dropdownText}>{getSelectedCurrencyName()}</Text>
                                    {isCurrencyDropdownOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                                </TouchableOpacity>
                                {isCurrencyDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                                            {currencies.map(c => (
                                                <TouchableOpacity
                                                    key={c.currencyId}
                                                    style={styles.dropdownItem}
                                                    onPress={() => { setSelectedCurrencyId(c.currencyId); setIsCurrencyDropdownOpen(false); }}
                                                >
                                                    <Text style={[styles.dropdownItemText, selectedCurrencyId === c.currencyId && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                                                        {c.symbol} {c.name} ({c.code})
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Simplify Debt Toggle */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                            <Text style={styles.label}>Simplify Debts</Text>
                            <TouchableOpacity
                                onPress={() => setSimplifyDebt(!simplifyDebt)}
                                style={[styles.toggleButton, simplifyDebt && styles.toggleButtonActive]}
                            >
                                <Text style={{ color: simplifyDebt ? 'white' : '#9ca3af', fontWeight: 'bold', fontSize: 12 }}>
                                    {simplifyDebt ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={onClose} disabled={loading}>
                                <Text style={styles.textStyle}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonCreate]} onPress={handleCreate} disabled={loading}>
                                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.textStyle}>Create</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalView: { margin: 20, backgroundColor: '#131B3A', borderRadius: 20, padding: 25, width: '90%', elevation: 5 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginTop: 20, gap: 10 },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 80, alignItems: 'center' },
    buttonClose: { backgroundColor: '#ef4444' },
    buttonCreate: { backgroundColor: '#8B5CF6' },
    textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    modalText: { marginBottom: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: 'white' },
    label: { color: '#9ca3af', marginBottom: 5, marginTop: 12, fontSize: 13 },
    input: { height: 45, width: '100%', borderColor: '#24335E', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: 'white', backgroundColor: '#0B1128' },
    dropdown: { height: 45, width: '100%', borderColor: '#24335E', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B1128' },
    dropdownText: { color: 'white' },
    errorText: { color: '#ef4444', marginBottom: 8, alignSelf: 'center', fontSize: 13 },
    dropdownList: { backgroundColor: '#1C2854', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#24335E', zIndex: 1000 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#24335E' },
    dropdownItemText: { color: 'white' },
    toggleButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#374151' },
    toggleButtonActive: { backgroundColor: '#8B5CF6' },
});

export default CreateGroupModal;
