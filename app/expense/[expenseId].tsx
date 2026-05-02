import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text } from "@/components/ui/text";
import { ArrowLeft, User, Receipt, CreditCard, Calendar } from 'lucide-react-native';
import { fetchExpenseByGroupAndId } from '../../src/util/apiService';
import { getAuthData } from '../../src/util/authService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExpenseDetailsPage() {
    const { expenseId, groupId } = useLocalSearchParams<{ expenseId: string; groupId: string }>();
    const [loading, setLoading] = useState(true);
    const [expense, setExpense] = useState<any>(null);
    const [splits, setSplits] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const load = async () => {
            const safeExpenseId = Array.isArray(expenseId) ? expenseId[0] : expenseId;
            const safeGroupId   = Array.isArray(groupId)   ? groupId[0]   : groupId;

            if (!safeExpenseId || !safeGroupId) {
                setError(`Missing params — expenseId: ${safeExpenseId}, groupId: ${safeGroupId}`);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const auth = await getAuthData();
                setCurrentUserId(auth.userId);

                // Use the new contract: GET /api/groups/{groupId}/expenses/{expenseId}
                const data = await fetchExpenseByGroupAndId(safeGroupId, safeExpenseId);
                console.log('[ExpenseDetails] Full response:', JSON.stringify(data, null, 2));

                // Handle various possible response shapes from the API
                // Shape A: { expense: {...}, splits: [...], payers: [...] }
                // Shape B: the expense object directly with nested splits/payers
                let expenseObj: any;
                let splitsArr: any[] = [];

                if (data?.expense) {
                    // Shape A
                    expenseObj = data.expense;
                    splitsArr  = data.splits || [];
                } else {
                    // Shape B — the whole object is the expense
                    expenseObj = data;
                    splitsArr  = data?.splits || [];
                }

                // Also pull payers as a fallback for split display
                const payersArr = data?.payers || expenseObj?.payers || [];
                if (splitsArr.length === 0 && payersArr.length > 0) {
                    splitsArr = payersArr;
                }

                console.log('[ExpenseDetails] expense obj:', JSON.stringify(expenseObj, null, 2));
                console.log('[ExpenseDetails] splits:', JSON.stringify(splitsArr, null, 2));

                setExpense(expenseObj);
                setSplits(splitsArr);
            } catch (err: any) {
                console.error('[ExpenseDetails] Error:', err);
                setError(err?.message || 'Failed to load expense details');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [expenseId, groupId]);

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]} className="items-center justify-center">
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text className="text-gray-400 mt-4">Loading expense details…</Text>
            </View>
        );
    }

    if (error || !expense) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View className="p-4 pt-6 flex-row items-center gap-4 border-b border-gray-800" style={{ backgroundColor: '#131B3A' }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Expense Details</Text>
                </View>
                <View className="flex-1 items-center justify-center p-8">
                    <Receipt size={64} color="#24335E" />
                    <Text className="text-white font-bold text-xl mt-4 text-center">Expense Not Found</Text>
                    <Text className="text-gray-500 text-sm mt-2 text-center">{error || 'Could not load this expense.'}</Text>
                    <Text className="text-gray-600 text-xs mt-4 text-center font-mono">
                        groupId: {Array.isArray(groupId) ? groupId[0] : groupId}{'\n'}
                        expenseId: {Array.isArray(expenseId) ? expenseId[0] : expenseId}
                    </Text>
                </View>
            </View>
        );
    }

    // Normalise field names — API may return different shapes
    const title         = expense.description || expense.name || 'Expense';
    const amount        = Number(expense.amount ?? expense.yourNetShare ?? 0);
    const currencyCode  = expense.currency?.currencyName || expense.currency?.code 
                        || expense.currencyCode || '';
    // paidBy can be an object or just a name string
    const paidBy        = expense.paidBy?.name || expense.paidByName 
                        || expense.createdByName || 'Unknown';
    const paidByUserId  = expense.paidBy?.userId || expense.paidByUserId || expense.createdById;
    const expenseDate   = expense.date || expense.createdAt;
    const splitType     = expense.splitType || '';

    const userSplit     = splits.find((s: any) => s.userId === currentUserId);
    const userShare     = userSplit ? Math.abs(Number(userSplit.amountOwed)) : 0;

    let displayAmount = 0;
    let statusText = 'Not involved';
    let statusColor = '#9ca3af';

    if (paidByUserId === currentUserId) {
        displayAmount = amount - userShare;
        statusText    = displayAmount > 0.01 ? 'You are owed' : 'You paid everything';
        statusColor   = '#10B981';
    } else if (userShare > 0.01) {
        displayAmount = userShare;
        statusText    = 'You owe';
        statusColor   = '#F43F5E';
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{ paddingTop: insets.top + 12, backgroundColor: '#131B3A', paddingHorizontal: 20, paddingBottom: 16 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                    <ArrowLeft color="white" size={26} />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', lineHeight: 34, includeFontPadding: false, paddingVertical: 2 }}>{title}</Text>
                {splitType ? <Text style={{ color: '#829AC9', fontSize: 12, marginTop: 4 }}>Split: {splitType}</Text> : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Amount hero */}
                <View style={styles.heroCard}>
                    <Text style={{ color: '#829AC9', fontSize: 13, marginBottom: 4 }}>Total Amount</Text>
                    <Text style={{ color: 'white', fontSize: 38, fontWeight: 'bold', lineHeight: 46, includeFontPadding: false, paddingVertical: 4 }}>
                        {currencyCode} {amount.toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                        <Text style={{ color: statusColor, fontWeight: '700', fontSize: 14 }}>
                            {statusText}: {currencyCode} {displayAmount.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Meta info */}
                <View style={styles.section}>
                    <View style={styles.metaRow}>
                        <CreditCard size={16} color="#829AC9" />
                        <Text style={styles.metaLabel}>Paid by</Text>
                        <Text style={styles.metaValue}>{paidByUserId === currentUserId ? 'You' : paidBy}</Text>
                    </View>
                    {expenseDate && (
                        <View style={styles.metaRow}>
                            <Calendar size={16} color="#829AC9" />
                            <Text style={styles.metaLabel}>Date</Text>
                            <Text style={styles.metaValue}>{new Date(expenseDate).toLocaleDateString()}</Text>
                        </View>
                    )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Split breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Split Breakdown</Text>
                    {splits.length === 0 ? (
                        <Text style={{ color: '#4B5E8A', textAlign: 'center', marginTop: 12 }}>No split data available.</Text>
                    ) : (
                        splits.map((split: any, idx: number) => {
                            const name     = split.userId === currentUserId ? 'You' : (split.user?.name || split.userName || `User ${idx + 1}`);
                            const owed     = Math.abs(Number(split.amountOwed || split.amount || 0));
                            const isPayer  = split.userId === paidByUserId;
                            const initial  = name.charAt(0).toUpperCase();
                            return (
                                <View key={split.splitId || split.userId || idx} style={styles.splitRow}>
                                    <View style={styles.splitAvatar}>
                                        <Text style={styles.splitAvatarText}>{initial}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.splitName}>{name}</Text>
                                        {isPayer && <Text style={{ color: '#10B981', fontSize: 11 }}>paid {currencyCode} {amount.toFixed(2)}</Text>}
                                    </View>
                                    <Text style={[styles.splitAmount, { color: isPayer ? '#10B981' : '#F43F5E' }]}>
                                        {isPayer ? 'owed' : 'owes'} {currencyCode} {owed.toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B1128' },
    heroCard: {
        backgroundColor: '#131B3A', margin: 16, borderRadius: 20,
        padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#24335E',
    },
    statusBadge: {
        marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1,
    },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    metaLabel: { color: '#829AC9', fontSize: 14, flex: 1 },
    metaValue: { color: 'white', fontSize: 14, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#1C2854', marginHorizontal: 16 },
    splitRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#131B3A', padding: 14, borderRadius: 14,
        marginBottom: 10, borderWidth: 1, borderColor: '#24335E',
    },
    splitAvatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#1C2854', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#8B5CF640',
    },
    splitAvatarText: { color: '#8B5CF6', fontWeight: 'bold', fontSize: 16 },
    splitName: { color: 'white', fontWeight: '600', fontSize: 14 },
    splitAmount: { fontWeight: 'bold', fontSize: 13 },
});
