import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Text } from "@/components/ui/text";
import { fetchGroupExpenses, GroupExpenseItem, GroupInfo, fetchUserExpenses, addGroupMember, fetchGroupMembers, GroupMember } from '../util/apiService';
import { UserBalance } from '../util/groupMocks';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Users, UserPlus } from 'lucide-react-native';
import AddUserModal from './AddUserModal';

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

    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
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
                        response.data.forEach(item => {
                            const currency = item.currency.currencyName;
                            totals[currency] = (totals[currency] || 0) + item.amount;
                        });
                        setTotalExpenses(totals);

                        // Find Creator Name
                        if (info.groupAdmin && info.groupAdmin.name) {
                            setCreatorName(info.groupAdmin.name);
                        } else {
                            setCreatorName("Admin");
                        }
                    } else {
                        if (currentUserId) {
                            try {
                                const userGroupsRes = await fetchUserExpenses(currentUserId);
                                if (userGroupsRes.success && userGroupsRes.data) {
                                    const foundGroup = userGroupsRes.data.userGroupResponses.find(
                                        g => g.group.groupId === groupId
                                    );
                                    if (foundGroup) {
                                        setGroupInfo(foundGroup.group);
                                        if (foundGroup.group.groupAdmin && foundGroup.group.groupAdmin.name) {
                                            setCreatorName(foundGroup.group.groupAdmin.name);
                                        } else {
                                            setCreatorName("Admin");
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error("Fallback fetch failed", err);
                            }
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

    useEffect(() => {
        if (activeTab === 'members' && groupId) {
            loadMembers();
        }
    }, [activeTab, groupId]);

    const loadMembers = async () => {
        setMembersLoading(true);
        try {
            const response = await fetchGroupMembers(groupId);
            if (response.success && response.data) {
                setMembers(response.data);
            }
        } catch (error) {
            console.error("Failed to load members", error);
        } finally {
            setMembersLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                    <ArrowLeft color="white" size={28} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsAddUserModalVisible(true)} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                    <UserPlus color="white" size={28} />
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
                    )
                ) : (
                    membersLoading ? (
                        <ActivityIndicator size="large" color="#33f584" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-3">
                            {members.map((member) => (
                                <View key={member.userId} className="flex-row items-center justify-between bg-zinc-900 p-4 rounded-lg mb-2">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
                                            <Text className="text-white font-bold">{member.name.charAt(0)}</Text>
                                        </View>
                                        <View>
                                            <Text className="text-white font-bold text-lg">{member.name}</Text>
                                            <Text className="text-gray-400 text-sm">{member.email}</Text>
                                        </View>
                                    </View>
                                    {member.phone && <Text className="text-gray-500 text-xs">{member.phone}</Text>}
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
                currentUserId={currentUserId}
                groupId={groupId}
                onAddUser={async (user) => {
                    if (!groupId || !user.userId) return;
                    console.log("Adding user:", user.userId, "to group:", groupId);
                    // Call API to add user to group
                    const result = await addGroupMember({ groupId, userId: user.userId });
                    if (result.success) {
                        console.log("User added successfully");
                        // Refresh group data? For now just close the modal.
                        // We might want to reload expenses or members if we were showing members list.
                        if (activeTab === 'members') {
                            loadMembers();
                        }
                        // Since we aren't showing members list explicitly except in expenses, no immediate UI update needed except maybe a toast.
                        alert(`Added ${user.name} to the group!`);
                    } else {
                        console.error("Failed to add user:", result.message);
                        alert(`Failed to add user: ${result.message}`);
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
