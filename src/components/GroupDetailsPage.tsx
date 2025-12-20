import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Text } from "@/components/ui/text";
import { fetchGroupExpenses, GroupExpenseItem, GroupInfo } from '../util/apiService';
import { UserBalance } from '../util/groupMocks';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Users } from 'lucide-react-native';

interface GroupDetailsPageProps {

    groupId: string;
    userBalances?: UserBalance[];
    currentUserId?: string;
}

const ExpenseItem = ({ expense, currentUserId }: { expense: GroupExpenseItem, currentUserId?: string }) => {
    const router = useRouter();

    // Calculate owed/owing status
    let statusText = "";
    let statusColor = "#9ca3af"; // default gray
    let displayAmount = 0;

    if (currentUserId && expense.splits) {
        const userSplit = expense.splits.find(s => s.userId === currentUserId);
        const userShare = userSplit ? Math.abs(userSplit.amountOwed) : 0;

        if (expense.paidBy.userId === currentUserId) {
            // User paid. They are owed: Total - Their Share
            // Note: If user paid but isn't in splits, userShare is 0, so they are owed full amount.
            displayAmount = expense.amount - userShare;
            if (displayAmount > 0.01) {
                statusText = "you are owed";
                statusColor = "#33f584"; // green
            } else {
                statusText = "you paid";
                statusColor = "#33f584";
            }
        } else {
            // User didn't pay. They owe their share.
            displayAmount = userShare;
            if (displayAmount > 0.01) {
                statusText = "you owe";
                statusColor = "#f53344"; // red
            } else {
                statusText = "not involved";
            }
        }
    }

    return (
        <TouchableOpacity
            onPress={() => router.push({ pathname: "/expense/[expenseId]", params: { expenseId: expense.expenseId, userId: currentUserId } })}
            className="flex flex-row justify-between items-center p-4 mb-2 rounded-lg"
            style={{ backgroundColor: '#212121' }}
        >
            <View className="flex-1">
                <Text className="text-white font-bold text-lg">{expense.name}</Text>
                <Text className="text-gray-400 text-sm">{expense.description}</Text>
                <Text className="text-gray-500 text-xs mt-1">{new Date(expense.date).toLocaleDateString()}</Text>
            </View>
            <View className="items-end">
                <Text className="text-white font-bold text-xl" style={{ color: '#f53344' }}>
                    {expense.currency.currencyName} {expense.amount.toFixed(2)}
                </Text>
                <Text className="text-gray-400 text-xs mb-1">Paid by: {expense.paidBy.name}</Text>

                {statusText !== "" && statusText !== "not involved" && (
                    <Text className="text-xs font-bold" style={{ color: statusColor }}>
                        {statusText} {expense.currency.currencyName} {displayAmount.toFixed(2)}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({ groupId, userBalances, currentUserId }) => {
    const [expenses, setExpenses] = useState<GroupExpenseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [totalExpenses, setTotalExpenses] = useState<{ [currency: string]: number }>({});
    const [creatorName, setCreatorName] = useState<string>('Unknown');
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            if (!groupId) return;
            setLoading(true);
            try {
                const response = await fetchGroupExpenses(groupId);
                if (response.success && response.data) {
                    setExpenses(response.data);

                    if (response.data.length > 0) {
                        const info = response.data[0].group;
                        setGroupInfo(info);

                        // Calculate totals
                        const totals: { [currency: string]: number } = {};
                        response.data.forEach(expense => {
                            const curr = expense.currency.currencyName;
                            totals[curr] = (totals[curr] || 0) + expense.amount;
                        });
                        setTotalExpenses(totals);

                        // Find Creator Name
                        const adminId = info.groupAdmin;
                        // Try to find the admin in the expenses list users
                        const adminUser = response.data.find(e => e.paidBy.userId === adminId)?.paidBy;
                        if (adminUser) {
                            setCreatorName(adminUser.name);
                        } else {
                            // If not found in expenses, we might need a separate API call to get user details, 
                            // but for now we'll stick to what we have or generic "Admin".
                            // Or maybe the group info itself should eventually have this.
                            setCreatorName("Admin");
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching group expenses:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [groupId]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                    <ArrowLeft color="white" size={28} />
                </TouchableOpacity>

                <View className="items-center p-6 pt-12 pb-8 gap-4" style={{ backgroundColor: '#1a1a1a' }}>
                    {groupInfo?.imageUrl ? (
                        <Image
                            source={{ uri: groupInfo.imageUrl }}
                            style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 8 }}
                        />
                    ) : (
                        <View className="w-24 h-24 rounded-full bg-gray-700 items-center justify-center mb-2">
                            <Users size={48} color="white" />
                        </View>
                    )}

                    <View className="items-center">
                        <Text className="text-white font-bold text-3xl text-center">{groupInfo?.groupName || 'Group Details'}</Text>
                        <Text className="text-gray-400 text-sm mt-1">
                            Created by {creatorName} on {groupInfo?.groupCreationDate ? new Date(groupInfo.groupCreationDate).toLocaleDateString() : '...'}
                        </Text>
                    </View>


                    <View className="flex flex-row w-full mt-6 px-4">
                        {/* Left Column: Total Expenses */}
                        <View className="flex-1 items-start mr-2">
                            <Text className="text-gray-400 text-xs uppercase mb-2">Total Expenses</Text>
                            {Object.entries(totalExpenses).slice(0, 3).map(([currency, amount]) => (
                                <Text key={currency} className="text-white font-bold text-xl mb-1" style={{ color: '#33f584' }}>
                                    {currency} {amount.toFixed(2)}
                                </Text>
                            ))}
                            {Object.keys(totalExpenses).length > 3 && (
                                <Text className="text-gray-500 text-xs">...</Text>
                            )}
                            {Object.keys(totalExpenses).length === 0 && (
                                <Text className="text-gray-500 text-sm">No expenses yet</Text>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={{ width: 1, backgroundColor: '#333' }} />

                        {/* Right Column: User Balances */}
                        <View className="flex-1 items-end ml-2">
                            <Text className="text-gray-400 text-xs uppercase mb-2 text-right">Your Detail</Text>
                            {userBalances && userBalances.length > 0 ? (
                                <>
                                    {userBalances.slice(0, 3).map((balance, index) => {
                                        const isSettled = balance.status === 'SETTLED';
                                        const isOwed = balance.status === 'OWED';
                                        const color = isSettled ? '#9ca3af' : (isOwed ? '#33f584' : '#f53344');

                                        return (
                                            <Text key={`user-balance-${index}`} className="font-bold text-xl mb-1 text-right" style={{ color }}>
                                                {balance.currency} {balance.amount.toFixed(2)}
                                            </Text>
                                        );
                                    })}
                                    {userBalances.length > 3 && (
                                        <Text className="text-gray-500 text-xs text-right">...</Text>
                                    )}
                                </>
                            ) : (
                                <Text className="text-gray-500 text-sm text-right">All settled</Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
                {loading ? (
                    <ActivityIndicator size="large" color="#33f584" className="mt-10" />
                ) : (
                    <View className="p-4 gap-3">
                        <Text className="text-white text-lg font-bold mb-2">Recent Activity</Text>
                        {expenses.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-4">No expenses found for this group.</Text>
                        ) : (
                            expenses.map((expense) => (
                                <ExpenseItem key={expense.expenseId} expense={expense} currentUserId={currentUserId} />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        flex: 1,
    },
});

export default GroupDetailsPage;
