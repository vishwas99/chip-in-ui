import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text } from "@/components/ui/text";
import { fetchGroupDashboard, GroupDashboardResponse, addNewGroupMember } from '../util/apiService';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Users, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddUserModal from './AddUserModal';

interface GroupDetailsPageProps {
    groupId: string;
    userBalances?: { amount: number; currency: string; status: string }[];
    currentUserId?: string;
}

// Expense item rendered from dashboard response
const ExpenseItem = ({ expense, groupId }: { expense: any; groupId: string }) => {
    const router = useRouter();
    const paidByName = expense.paidBy?.name || expense.paidByName || 'Unknown';
    const currencyName = expense.currency?.currencyName || expense.currencyCode || '';
    const expenseId = expense.expenseId || expense.id;

    return (
        <TouchableOpacity
            onPress={() => router.push({ pathname: '/expense/[expenseId]', params: { expenseId, groupId } })}
            className="flex flex-row justify-between items-center p-4 mb-2 rounded-lg"
            style={{ backgroundColor: '#131B3A' }}
        >
            <View className="flex-1">
                <Text className="text-white font-bold text-lg">{expense.description || expense.name}</Text>
                <Text className="text-gray-500 text-xs mt-1">{expense.date ? new Date(expense.date).toLocaleDateString() : ''}</Text>
            </View>
            <View className="items-end">
                <Text className="text-white font-bold text-xl" style={{ color: '#F43F5E' }}>
                    {currencyName} {Number(expense.amount || 0).toFixed(2)}
                </Text>
                <Text className="text-gray-400 text-xs mb-1">Paid by: {paidByName}</Text>
            </View>
        </TouchableOpacity>
    );
};

const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({ groupId, userBalances, currentUserId }) => {
    const [dashboard, setDashboard] = useState<GroupDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');
    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!groupId) return;
        setLoading(true);
        fetchGroupDashboard(groupId)
            .then(data => setDashboard(data))
            .catch(err => console.error('Failed to load group dashboard:', err))
            .finally(() => setLoading(false));
    }, [groupId]);

    const groupName = (dashboard as any)?.groupName || (dashboard as any)?.group?.name || 'Group Details';
    const expenses: any[] = dashboard?.expenses || [];
    const members: any[] = dashboard?.userBalances || [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, left: 20, zIndex: 10 }}>
                    <ArrowLeft color="white" size={28} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsAddUserModalVisible(true)} style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10 }}>
                    <UserPlus color="white" size={28} />
                </TouchableOpacity>

                <View className="items-center p-6 pb-8 gap-4" style={{ backgroundColor: '#131B3A', paddingTop: insets.top + 56 }}>
                    <View className="w-24 h-24 rounded-full bg-[#1C2854] items-center justify-center mb-2">
                        <Users size={48} color="#8B5CF6" />
                    </View>
                    <View className="items-center">
                        <Text className="text-white font-bold text-3xl text-center">{groupName}</Text>
                    </View>
                    <View className="flex flex-row w-full mt-4 px-4">
                        <View className="flex-1 items-start mr-2">
                            <Text className="text-gray-400 text-xs uppercase mb-2">Expenses</Text>
                            <Text className="text-white font-bold text-lg">{expenses.length} total</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: '#24335E' }} />
                        <View className="flex-1 items-end ml-2">
                            <Text className="text-gray-400 text-xs uppercase mb-2 text-right">Your Balance</Text>
                            {userBalances && userBalances.length > 0 ? (
                                userBalances.slice(0, 2).map((b, i) => (
                                    <Text key={i} className="font-bold text-lg mb-1 text-right" style={{ color: b.status === 'OWED' ? '#10B981' : b.status === 'OWES' ? '#F43F5E' : '#9ca3af' }}>
                                        {b.currency} {b.amount.toFixed(2)}
                                    </Text>
                                ))
                            ) : (
                                <Text className="text-gray-500 text-sm text-right">All settled</Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-800">
                <TouchableOpacity
                    onPress={() => setActiveTab('expenses')}
                    className={`flex-1 py-4 items-center ${activeTab === 'expenses' ? 'border-b-2 border-green-400' : ''}`}
                >
                    <Text className={`font-bold ${activeTab === 'expenses' ? 'text-white' : 'text-gray-500'}`}>EXPENSES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('members')}
                    className={`flex-1 py-4 items-center ${activeTab === 'members' ? 'border-b-2 border-green-400' : ''}`}
                >
                    <Text className={`font-bold ${activeTab === 'members' ? 'text-white' : 'text-gray-500'}`}>MEMBERS</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
                {activeTab === 'expenses' ? (
                    loading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-3">
                            <Text className="text-white text-lg font-bold mb-2">Recent Activity</Text>
                            {expenses.length === 0 ? (
                                <Text className="text-gray-500 text-center mt-4">No expenses found for this group.</Text>
                            ) : (
                                expenses.map((expense: any, idx: number) => (
                                    <ExpenseItem key={expense.expenseId || expense.id || idx} expense={expense} groupId={groupId} />
                                ))
                            )}
                        </View>
                    )
                ) : (
                    loading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-3">
                            {members.map((member: any, idx: number) => (
                                <View key={member.userId || idx} className="flex-row items-center justify-between bg-[#131B3A] p-4 rounded-lg mb-2">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 rounded-full bg-[#1C2854] items-center justify-center">
                                            <Text className="text-[#8B5CF6] font-bold">{(member.userName || member.name || '?').charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text className="text-white font-bold text-lg">{member.userName || member.name || 'Member'}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-400 text-sm">{member.netBalance ? `${member.netBalance > 0 ? '+' : ''}${Number(member.netBalance).toFixed(2)}` : ''}</Text>
                                </View>
                            ))}
                            {members.length === 0 && (
                                <Text className="text-gray-500 text-center mt-4">No members found.</Text>
                            )}
                        </View>
                    )
                )}
            </ScrollView>
            <AddUserModal
                visible={isAddUserModalVisible}
                onClose={() => setIsAddUserModalVisible(false)}
                groupId={groupId}
                onAddUser={async (email: string) => {
                    try {
                        await addNewGroupMember(groupId, { email, isAdmin: false });
                        Alert.alert('Success', `${email} added to the group!`);
                        // Refresh dashboard
                        const data = await fetchGroupDashboard(groupId);
                        setDashboard(data);
                    } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Failed to add member');
                    }
                    setIsAddUserModalVisible(false);
                }}
            />
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
