import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, View, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, Animated, Easing,
    TouchableWithoutFeedback, ScrollView, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { HandCoins, X, ChevronRight, ChevronDown, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { fetchAllCurrencies, Currency } from '../util/apiService';

interface SettleUpModalProps {
    visible: boolean;
    onClose: () => void;
    /** Called with amount AND currencyId so the parent can include both in the API call */
    onConfirm: (amount: number, currencyId: string) => Promise<void>;
    userName: string;
    currentUserName: string;
    maxAmount: number;
    /** Display code shown before the amount field, updated reactively when user picks a currency */
    defaultCurrencyCode: string;
    /** true = they owe you, false = you owe them */
    isOwed: boolean;
    groupId: string;
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({
    visible, onClose, onConfirm, userName, currentUserName, maxAmount,
    defaultCurrencyCode, isOwed, groupId,
}) => {
    const [amount, setAmount]                   = useState('');
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState('');
    const [currencies, setCurrencies]           = useState<Currency[]>([]);
    const [currenciesLoading, setCurrenciesLoading] = useState(false);
    const [selectedCurrency, setSelectedCurrency]   = useState<Currency | null>(null);
    const [currencyOpen, setCurrencyOpen]       = useState(false);

    const slideAnim = useRef(new Animated.Value(500)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    /* ── Load currencies when modal opens ── */
    useEffect(() => {
        if (!visible) return;
        setAmount(maxAmount.toFixed(2));
        setError('');
        setCurrencyOpen(false);
        loadCurrencies();

        // Delay slightly to let the Modal mount and layout before animating
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
            ]).start();
        }, 50);
    }, [visible]);

    useEffect(() => {
        if (!visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 500, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const loadCurrencies = async () => {
        setCurrenciesLoading(true);
        try {
            const data = await fetchAllCurrencies(groupId);
            setCurrencies(data || []);
            // Auto-select the currency matching defaultCurrencyCode
            const match = (data || []).find((c: Currency) =>
                c.code === defaultCurrencyCode || c.currencyName === defaultCurrencyCode
            );
            setSelectedCurrency(match || (data?.[0] ?? null));
        } catch (e) {
            console.error('Failed to load currencies:', e);
        } finally {
            setCurrenciesLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedCurrency) {
            setError('Please select a currency.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
            setError('Please enter a valid amount.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        if (parsed > maxAmount + 0.001) {
            setError(`Amount cannot exceed ${selectedCurrency.code} ${maxAmount.toFixed(2)}.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        setError('');
        setLoading(true);
        try {
            await onConfirm(parsed, selectedCurrency.currencyId || selectedCurrency.id || '');
            onClose();
        } catch {
            // parent handles toast
        } finally {
            setLoading(false);
        }
    };

    const isPartial = () => {
        const parsed = parseFloat(amount);
        return !isNaN(parsed) && Math.abs(parsed - maxAmount) > 0.001;
    };

    const displayCode = selectedCurrency?.code ?? defaultCurrencyCode;

    return (
        <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <TouchableWithoutFeedback onPress={onClose}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>
                </Animated.View>

                {/* Sheet */}
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconWrap}>
                            <HandCoins size={24} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Settle Up</Text>
                            <Text style={styles.subtitle}>
                                {isOwed ? `${userName} owes you` : `You owe ${userName}`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#829AC9" />
                        </TouchableOpacity>
                    </View>

                    {/* User row */}
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{userName.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <ChevronRight size={18} color="#24335E" style={{ marginHorizontal: 8 }} />
                        <View style={[styles.avatar, { backgroundColor: '#1C3A52', borderColor: '#10B98140' }]}>
                            <Text style={[styles.avatarText, { color: '#10B981' }]}>{currentUserName.slice(0, 2).toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* ── Currency picker ── */}
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionLabel}>Currency</Text>
                        <TouchableOpacity
                            style={styles.currencySelector}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setCurrencyOpen(o => !o);
                            }}
                        >
                            {currenciesLoading ? (
                                <ActivityIndicator size="small" color="#8B5CF6" />
                            ) : (
                                <>
                                    <View style={styles.currencyBadge}>
                                        <Text style={styles.currencyBadgeText}>
                                            {selectedCurrency?.symbol ?? ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.currencySelectorText}>
                                        {selectedCurrency
                                            ? `${selectedCurrency.code} — ${selectedCurrency.name}`
                                            : 'Select currency'}
                                    </Text>
                                    <ChevronDown
                                        size={16} color="#829AC9"
                                        style={{ transform: [{ rotate: currencyOpen ? '180deg' : '0deg' }] }}
                                    />
                                </>
                            )}
                        </TouchableOpacity>

                        {currencyOpen && (
                            <View style={styles.currencyDropdown}>
                                <ScrollView
                                    style={{ maxHeight: 180 }}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                >
                                    {currencies.map((c, idx) => {
                                        const isActive = selectedCurrency?.currencyId === c.currencyId ||
                                                         selectedCurrency?.id === c.id;
                                        return (
                                            <TouchableOpacity
                                                key={c.currencyId || c.id || `c-${idx}`}
                                                style={[styles.currencyOption, isActive && styles.currencyOptionActive]}
                                                onPress={() => {
                                                    setSelectedCurrency(c);
                                                    setCurrencyOpen(false);
                                                    Haptics.selectionAsync();
                                                }}
                                            >
                                                <View style={[styles.currencyOptionBadge, isActive && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}>
                                                    <Text style={[styles.currencyOptionBadgeText, isActive && { color: '#8B5CF6' }]}>
                                                        {c.symbol}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.currencyOptionCode, isActive && { color: '#8B5CF6' }]}>
                                                        {c.code}
                                                    </Text>
                                                    <Text style={styles.currencyOptionName} numberOfLines={1}>
                                                        {c.name}
                                                    </Text>
                                                </View>
                                                {isActive && <Check size={16} color="#8B5CF6" />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* ── Amount input ── */}
                    <View style={styles.amountBlock}>
                        <Text style={styles.sectionLabel}>Settlement Amount</Text>
                        <View style={[styles.amountRow, error ? styles.amountRowError : null]}>
                            <Text style={styles.currencyCodeLabel}>{displayCode}</Text>
                            <TextInput
                                value={amount}
                                onChangeText={text => { setAmount(text); setError(''); }}
                                keyboardType="decimal-pad"
                                style={styles.amountInput}
                                placeholderTextColor="#556080"
                                selectionColor="#8B5CF6"
                            />
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        {/* Quick-fill buttons */}
                        <View style={styles.quickRow}>
                            {[0.25, 0.5, 0.75, 1].map(fraction => {
                                const val = (maxAmount * fraction).toFixed(2);
                                const isActive = amount === val;
                                return (
                                    <TouchableOpacity
                                        key={fraction}
                                        onPress={() => { setAmount(val); setError(''); }}
                                        style={[styles.quickBtn, isActive && styles.quickBtnActive]}
                                    >
                                        <Text style={[styles.quickBtnText, isActive && styles.quickBtnTextActive]}>
                                            {fraction === 1 ? 'Full' : `${fraction * 100}%`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {isPartial() && (
                            <View style={styles.partialNote}>
                                <Text style={styles.partialNoteText}>
                                    ⚡ Partial settlement — remaining balance will stay open
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                        style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
                        onPress={handleConfirm}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <HandCoins size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmBtnText}>
                            {loading
                                ? 'Recording…'
                                : `Confirm ${displayCode} ${parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : ''}`}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#131B3A',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 12, paddingHorizontal: 24, paddingBottom: 40,
        borderTopWidth: 1, borderColor: '#24335E',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 24,
    },
    handle: {
        width: 40, height: 4, backgroundColor: '#24335E', borderRadius: 2,
        alignSelf: 'center', marginBottom: 20,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    iconWrap: {
        width: 44, height: 44, backgroundColor: '#1C2854', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#8B5CF640',
    },
    title:    { color: 'white', fontWeight: '700', fontSize: 18 },
    subtitle: { color: '#829AC9', fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 8, marginLeft: 'auto' },

    userRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C2854',
        borderWidth: 1.5, borderColor: '#8B5CF640',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#8B5CF6', fontWeight: '700', fontSize: 18 },

    sectionBlock: { marginBottom: 16 },
    sectionLabel: {
        color: '#829AC9', fontSize: 11, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
    },

    /* Currency selector */
    currencySelector: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#0B1128', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#24335E',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    currencyBadge: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: '#1C2854', borderWidth: 1, borderColor: '#8B5CF640',
        alignItems: 'center', justifyContent: 'center',
    },
    currencyBadgeText: { color: '#8B5CF6', fontWeight: '700', fontSize: 14 },
    currencySelectorText: { flex: 1, color: 'white', fontWeight: '600', fontSize: 14 },

    currencyDropdown: {
        marginTop: 6, backgroundColor: '#0B1128',
        borderRadius: 14, borderWidth: 1, borderColor: '#24335E',
        overflow: 'hidden',
    },
    currencyOption: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#1A2448',
    },
    currencyOptionActive: { backgroundColor: '#1C2854' },
    currencyOptionBadge: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: '#1C2854', borderWidth: 1, borderColor: '#24335E',
        alignItems: 'center', justifyContent: 'center',
    },
    currencyOptionBadgeText: { color: '#829AC9', fontWeight: '700', fontSize: 13 },
    currencyOptionCode: { color: 'white', fontWeight: '700', fontSize: 13 },
    currencyOptionName: { color: '#829AC9', fontSize: 11, marginTop: 1 },

    /* Amount input */
    amountBlock: { marginBottom: 20 },
    amountRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0B1128', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#24335E',
        paddingHorizontal: 16, paddingVertical: 4,
    },
    amountRowError: { borderColor: '#F43F5E' },
    currencyCodeLabel: { color: '#829AC9', fontWeight: '700', fontSize: 16, marginRight: 8 },
    amountInput: {
        flex: 1, color: 'white', fontSize: 28, fontWeight: '700', paddingVertical: 12,
    },
    errorText: { color: '#F43F5E', fontSize: 12, marginTop: 6 },

    quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    quickBtn: {
        flex: 1, paddingVertical: 8, borderRadius: 10,
        borderWidth: 1, borderColor: '#24335E',
        alignItems: 'center', backgroundColor: '#0B1128',
    },
    quickBtnActive:     { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' },
    quickBtnText:       { color: '#829AC9', fontWeight: '600', fontSize: 13 },
    quickBtnTextActive: { color: '#8B5CF6' },

    partialNote: {
        marginTop: 10, backgroundColor: '#FCD34D15',
        borderRadius: 10, borderWidth: 1, borderColor: '#FCD34D30',
        paddingHorizontal: 12, paddingVertical: 8,
    },
    partialNoteText: { color: '#FCD34D', fontSize: 12, fontWeight: '500' },

    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 16,
    },
    confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});

export default SettleUpModal;
