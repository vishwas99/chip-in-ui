import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text } from "@/components/ui/text";
import { ArrowLeft, User } from 'lucide-react-native';
import { fetchExpenseDetails, ExpenseDetailData } from '../../src/util/apiService';
import { getAuthData } from '../../src/util/authService';
import { Divider } from "@/components/ui/divider";

export default function ExpenseDetailsPage() {
    const { expenseId, userId } = useLocalSearchParams<{ expenseId: string, userId: string }>();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<ExpenseDetailData | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            if (!expenseId) return;
            setLoading(true);
            try {
                const auth = await getAuthData();
                const fetchedUserId = auth.userId;
                const safeUserId = Array.isArray(userId) ? userId[0] : userId;

                const finalUserId = fetchedUserId || safeUserId;
                setCurrentUserId(finalUserId);
                console.log("Current User Id Resolved: " + finalUserId);

                const response = await fetchExpenseDetails(Array.isArray(expenseId) ? expenseId[0] : expenseId);
                if (response.success && response.data) {
                    setDetails(response.data);
                }
            } catch (error) {
                console.error("Failed to load expense details", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [expenseId]);

    if (loading) {
        return (
            <View style={styles.container} className="items-center justify-center">
                <ActivityIndicator size="large" color="#33f584" />
            </View>
        );
    }

    if (!details) {
        return (
            <View style={styles.container} className="items-center justify-center">
                <Text className="text-white">Expense not found</Text>
            </View>
        );
    }

    const { expense, splits } = details;
    const userSplit = splits.find(s => s.userId === currentUserId);

    // Calculate shares using absolute values as API may return negatives for non-payers
    const userShare = userSplit ? Math.abs(userSplit.amountOwed) : 0;

    let displayAmount = 0;
    let statusText = "You are not involved";
    let statusColor = "#9ca3af"; // gray

    if (expense.paidBy.userId === currentUserId) {
        // Current user paid. They are owed: Total Amount - Their Share
        // If their share is not explicitly in splits, we assume 0 (meaning they are owed full amount)
        // But usually payer has a split too.
        displayAmount = expense.amount - userShare;

        if (displayAmount > 0.01) {
            statusText = "You are owed";
            statusColor = "#33f584"; // green
        } else {
            statusText = "You paid 100%"; // or settled?
            statusColor = "#33f584";
        }
    } else {
        // Current user did not pay. They owe their share.
        displayAmount = userShare;

        if (displayAmount > 0.01) {
            statusText = "You owe";
            statusColor = "#f53344"; // red
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="p-4 pt-12 flex flex-row items-center gap-4 border-b border-gray-800" style={{ backgroundColor: '#1a1a1a' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Expense Details</Text>
            </View>

            <ScrollView>
                {/* Main Info */}
                <View className="p-6 items-center gap-2">
                    <View className="w-16 h-16 bg-gray-700 rounded-full items-center justify-center mb-2">
                        <Text className="text-2xl">🧾</Text>
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">{expense.name}</Text>
                    <Text className="text-gray-400 text-lg">{expense.currency.currencyName} {expense.amount.toFixed(2)}</Text>
                    <Text className="text-gray-500 text-sm">
                        Paid by {expense.paidBy.userId === currentUserId ? 'You' : expense.paidBy.name} on {new Date(expense.date).toLocaleDateString()}
                    </Text>
                </View>

                <Divider className="bg-gray-800" />

                {/* Status for Current User */}
                <View className="p-4 items-center">
                    <View className="items-center">
                        <Text className="text-gray-400">{statusText}</Text>
                        <Text className="text-xl font-bold" style={{ color: statusColor }}>
                            {expense.currency.currencyName} {displayAmount.toFixed(2)}
                        </Text>
                    </View>
                </View>

                <Divider className="bg-gray-800" />

                {/* Split Details */}
                <View className="p-4">
                    <Text className="text-white font-bold mb-4 text-lg">Split Details</Text>
                    <View className="gap-4">
                        {splits.map((split) => (
                            <View key={split.splitId} className="flex flex-row items-center justify-between">
                                <View className="flex flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-full bg-gray-700 items-center justify-center">
                                        <User size={16} color="white" />
                                    </View>
                                    <View>
                                        <Text className="text-white font-medium">
                                            {split.userId === currentUserId ? 'You' : (split.user?.name || 'Unknown')}
                                        </Text>
                                        {split.userId === expense.paidBy.userId && (
                                            <Text className="text-xs text-green-400">paid {expense.currency.currencyName} {expense.amount.toFixed(2)}</Text>
                                        )}
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="text-white font-bold">
                                        {split.userId === expense.paidBy.userId ? 'owed' : 'owes'} {expense.currency.currencyName} {Math.abs(split.amountOwed).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
});
