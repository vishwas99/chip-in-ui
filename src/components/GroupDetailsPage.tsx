import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text } from "@/components/ui/text";
import { fetchGroupDashboard, GroupDashboardResponse, addNewGroupMember, deleteGroup, fetchGroupUsers, fetchGroupBalances, recordSettlement, CreateSettlementRequest, fetchCurrentUser } from '../util/apiService';
import { getUserId } from '../util/authService';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Users, UserPlus, Settings, Trash2, AlertTriangle, Mail, Phone, Calendar, HandCoins, Bell, History } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddUserModal from './AddUserModal';
import SettleUpModal from './SettleUpModal';
import * as Haptics from 'expo-haptics';
import { useAppToast } from './ToastManager';

interface GroupDetailsPageProps {
    groupId: string;
    userBalances?: { amount: number; currency: string; status: string }[];
    currentUserId?: string;
}

const ExpenseItem = ({ expense, groupId, currencyCode }: { expense: any; groupId: string; currencyCode?: string }) => {
    const router = useRouter();
    // Dashboard expense fields
    const title       = expense.description || expense.name || 'Expense';
    const paidByName  = expense.createdByName || expense.paidBy?.name || expense.paidByName || 'Unknown';
    const netShare    = expense.yourNetShare  ?? expense.amount ?? 0;
    const label       = expense.formattedShare || (netShare >= 0 ? 'You lent' : 'You owe');
    const currency    = currencyCode || expense.currency?.currencyName || expense.currencyCode || '';
    const expenseId   = expense.expenseId || expense.id;
    const isPositive  = netShare >= 0;

    return (
        <TouchableOpacity
            onPress={() => router.push({ pathname: '/expense/[expenseId]', params: { expenseId, groupId } })}
            style={styles.expenseItem}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{title}</Text>
                <Text style={styles.expenseSub}>
                    {expense.date ? new Date(expense.date).toLocaleDateString() : ''}
                    {paidByName ? ` · by ${paidByName}` : ''}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.expenseAmount, { color: isPositive ? '#10B981' : '#F43F5E' }]}>
                    {currency} {Math.abs(Number(netShare)).toFixed(2)}
                </Text>
                <Text style={{ color: isPositive ? '#10B981' : '#F43F5E', fontSize: 11, fontWeight: '600' }}>{label}</Text>
            </View>
        </TouchableOpacity>
    );
};

const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({ groupId, userBalances, currentUserId }) => {
    const [dashboard, setDashboard] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'balances'>('expenses');
    const [balancesData, setBalancesData] = useState<any>(null);
    const [balancesLoading, setBalancesLoading] = useState(false);
    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const [settleUpTarget, setSettleUpTarget] = useState<any>(null);
    const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(currentUserId);
    
    useEffect(() => {
        if (!resolvedUserId) {
            fetchCurrentUser()
                .then(user => {
                    const id = (user as any).userId || user.id;
                    if (id) setResolvedUserId(id);
                })
                .catch(console.error);
        }
    }, [resolvedUserId]);
    
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useAppToast();

    useEffect(() => {
        if (!groupId) return;
        loadDashboard();
        loadMembers();
        loadBalances();
    }, [groupId]);

    const loadBalances = async () => {
        setBalancesLoading(true);
        try {
            const data = await fetchGroupBalances(groupId);
            setBalancesData(data);
        } catch (err) {
            console.error('Failed to load group balances:', err);
        } finally {
            setBalancesLoading(false);
        }
    };

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const data = await fetchGroupDashboard(groupId);
            setDashboard(data);
        } catch (err) {
            console.error('Failed to load group dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMembers = async () => {
        setMembersLoading(true);
        try {
            const data = await fetchGroupUsers(groupId);
            setMembers(data || []);
        } catch (err) {
            console.error('Failed to load group members:', err);
        } finally {
            setMembersLoading(false);
        }
    };



    const handleDeletePress = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "Delete Group",
            "Are you sure you want to delete this group? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => confirmDelete(false) }
            ]
        );
    };

    const confirmDelete = async (hardDelete: boolean) => {
        try {
            await deleteGroup(groupId, hardDelete);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Group Deleted", "The group has been removed successfully.", "success");
            router.replace("/home");
        } catch (err: any) {
            if (err.message?.includes("unsettled expenses")) {
                Alert.alert(
                    "Unsettled Expenses",
                    "There are still unsettled expenses. Force delete everything?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Force Delete", style: "destructive", onPress: () => confirmDelete(true) }
                    ]
                );
            } else {
                showToast("Error", err.message || "Failed to delete group", "error");
            }
        }
    };

    const handleSettleUp = (otherUser: any) => {
        const amount = Math.abs(otherUser.netBalance);
        if (amount < 0.01) {
            showToast("Settled", "You are already settled with this user.", "info");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSettleUpTarget(otherUser);
    };

    const handleSettleUpConfirm = async (amount: number, currencyId: string) => {
        if (!settleUpTarget) return;

        let activeUserId = resolvedUserId;
        if (!activeUserId) {
            activeUserId = (await getUserId()) || undefined;
            if (activeUserId) setResolvedUserId(activeUserId);
        }

        // If target's netBalance < 0, they owe the group (and thus owe me). They pay, I receive.
        // If target's netBalance > 0, they are owed by the group (I owe them). I pay, they receive.
        const theyOweMe = settleUpTarget.netBalance < 0;
        
        const payload: CreateSettlementRequest = {
            groupId,
            payerId: theyOweMe ? activeUserId! : settleUpTarget.userId,
            payeeId: theyOweMe ? settleUpTarget.userId : activeUserId!,
            amount,
            currencyId,
            notes: `Settlement in ${dashboard?.groupName || 'Group'}`,
        };
        await recordSettlement(payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Success', 'Settlement recorded!', 'success');
        loadDashboard();
        loadBalances();
    };

    const handleRemind = (userName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showToast("Reminder Sent", `A reminder has been sent to ${userName}.`, "success");
    };

    const groupName    = dashboard?.groupName || dashboard?.group?.name || 'Group Details';
    const currencyCode = dashboard?.currencyCode || '';
    const expensesList: any[] = dashboard?.expenses || [];
    
    const isAdmin = dashboard?.group?.groupAdmin?.userId === resolvedUserId || dashboard?.isAdmin === true;

    // Helper to process transaction history if the API returns raw expenses/settlements
    const getProcessedHistory = () => {
        if (balancesData?.transactionHistory) return balancesData.transactionHistory;
        
        // Fallback: Group raw expenses and settlements by user if transactionHistory is missing
        if (!balancesData?.expenses && !balancesData?.settlements) return [];

        const historyMap: Record<string, any> = {};
        const expenses = balancesData.expenses || [];
        const settlements = balancesData.settlements || [];

        // Note: This is a simplified grouping. In a real app, the backend should handle this 
        // to account for complex multi-user splits correctly.
        return []; 
    };

    const transactionHistory = getProcessedHistory();

    const currentUserName = balancesData?.userBalances
        ?.find((ub: any) => ub.userId === resolvedUserId)?.userName || 'Me';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, left: 20, zIndex: 10 }}>
                    <ArrowLeft color="white" size={28} />
                </TouchableOpacity>

                <View style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10, flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => setIsAddUserModalVisible(true)}>
                        <UserPlus color="white" size={26} />
                    </TouchableOpacity>
                    
                    {isAdmin && (
                        <TouchableOpacity onPress={handleDeletePress}>
                            <Trash2 color="#F43F5E" size={26} />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="items-center p-6 pb-8 gap-4" style={{ backgroundColor: '#131B3A', paddingTop: insets.top + 56 }}>
                    <View className="w-24 h-24 rounded-full bg-[#1C2854] items-center justify-center mb-2">
                        <Users size={48} color="#8B5CF6" />
                    </View>
                    <View className="items-center">
                        <Text className="text-white font-bold text-3xl text-center">{groupName}</Text>
                        {isAdmin && (
                            <View className="flex flex-row items-center mt-2 bg-[#8B5CF620] px-3 py-1 rounded-full border border-[#8B5CF640]">
                                <Settings size={12} color="#8B5CF6" style={{ marginRight: 6 }} />
                                <Text className="text-[#8B5CF6] text-xs font-bold uppercase tracking-wider">Admin</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex flex-row w-full mt-4 px-4">
                        <View className="flex-1 items-start mr-2">
                            <Text className="text-gray-400 text-xs uppercase mb-2">Expenses</Text>
                            <Text className="text-white font-bold text-lg">{expensesList.length} total</Text>
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
                    className={`flex-1 py-4 items-center ${activeTab === 'expenses' ? 'border-b-2 border-[#8B5CF6]' : ''}`}
                >
                    <Text className={`font-bold ${activeTab === 'expenses' ? 'text-white' : 'text-gray-500'}`}>EXPENSES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('balances')}
                    className={`flex-1 py-4 items-center ${activeTab === 'balances' ? 'border-b-2 border-[#8B5CF6]' : ''}`}
                >
                    <Text className={`font-bold ${activeTab === 'balances' ? 'text-white' : 'text-gray-500'}`}>BALANCES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('members')}
                    className={`flex-1 py-4 items-center ${activeTab === 'members' ? 'border-b-2 border-[#8B5CF6]' : ''}`}
                >
                    <Text className={`font-bold ${activeTab === 'members' ? 'text-white' : 'text-gray-500'}`}>MEMBERS</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {activeTab === 'expenses' ? (
                    loading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-3">
                            <Text className="text-white text-lg font-bold mb-2">Recent Activity</Text>
                            {expensesList.length === 0 ? (
                                <View className="items-center py-20">
                                    <AlertTriangle size={48} color="#24335E" />
                                    <Text className="text-gray-500 text-center mt-4">No expenses found for this group.</Text>
                                </View>
                            ) : (
                                expensesList.map((expense: any, idx: number) => (
                                    <ExpenseItem key={expense.expenseId || expense.id || idx} expense={expense} groupId={groupId} currencyCode={currencyCode} />
                                ))
                            )}
                        </View>
                    )
                ) : activeTab === 'balances' ? (
                    balancesLoading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-6">
                            <View>
                                <Text className="text-white text-lg font-bold mb-4">Member Balances</Text>
                                {balancesData?.userBalances?.length === 0 ? (
                                    <Text className="text-gray-500 italic">No balances yet.</Text>
                                ) : (
                                    balancesData?.userBalances?.map((ub: any, idx: number) => {
                                        // Net balance < 0 means they owe money. 
                                        const isOwed = ub.netBalance < 0; 
                                        const isSettled = Math.abs(ub.netBalance) < 0.01;
                                        const initial = ub.userName?.charAt(0).toUpperCase() || '?';
                                        
                                        return (
                                            <View key={ub.userId || `ub-${idx}`} className="bg-[#131B3A] p-4 rounded-2xl border border-[#24335E] mb-3 shadow-sm">
                                                <View className="flex-row items-center justify-between mb-4">
                                                    <View className="flex-row items-center gap-3">
                                                        <View className="w-10 h-10 rounded-full bg-[#1C2854] items-center justify-center border border-[#8B5CF640]">
                                                            <Text className="text-[#8B5CF6] font-bold text-lg">{initial}</Text>
                                                        </View>
                                                        <View>
                                                            <Text className="text-white font-bold">{ub.userName}</Text>
                                                            <Text style={{ color: isSettled ? '#829AC9' : (isOwed ? '#10B981' : '#F43F5E'), fontSize: 12, fontWeight: '600' }}>
                                                                {isSettled ? 'Settled' : ub.balanceStatus}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View className="items-end">
                                                        <Text className="text-white font-bold text-lg">
                                                            {balancesData.currencyCode} {Math.abs(ub.netBalance).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                
                                                {!isSettled && (
                                                    <View className="flex-row gap-2 pt-2 border-t border-[#24335E]">
                                                        {isOwed && (
                                                            <TouchableOpacity 
                                                                onPress={() => handleRemind(ub.userName)}
                                                                className="flex-1 flex-row items-center justify-center gap-2 bg-[#1C2854] py-2 rounded-lg border border-[#24335E]"
                                                            >
                                                                <Bell size={14} color="#8B5CF6" />
                                                                <Text className="text-white text-xs font-bold">Remind</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        <TouchableOpacity 
                                                            onPress={() => handleSettleUp(ub)}
                                                            className="flex-1 flex-row items-center justify-center gap-2 bg-[#8B5CF6] py-2 rounded-lg"
                                                        >
                                                            <HandCoins size={14} color="white" />
                                                            <Text className="text-white text-xs font-bold">Settle Up</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            <View>
                                <View className="flex-row items-center gap-2 mb-4">
                                    <History size={20} color="#8B5CF6" />
                                    <Text className="text-white text-lg font-bold">Transaction History</Text>
                                </View>
                                
                                {transactionHistory.length === 0 ? (
                                    <Text className="text-gray-500 italic">No transactions yet.</Text>
                                ) : (
                                    transactionHistory.map((history: any, idx: number) => (
                                        <View key={history.otherUserId || `hist-${idx}`} className="mb-6">
                                            <View className="flex-row justify-between items-center mb-2 px-2">
                                                <Text className="text-[#829AC9] font-bold text-sm uppercase tracking-wider">With {history.otherUserName}</Text>
                                                <Text className="text-white font-bold text-sm">
                                                    Net: {balancesData.currencyCode} {history.netAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                            <View className="bg-[#131B3A] rounded-2xl border border-[#24335E] overflow-hidden">
                                                {history.transactions.map((t: any, tIdx: number) => (
                                                    <View key={`${t.transactionId || t.expenseId || 't'}-${tIdx}`} className={`p-4 flex-row items-center justify-between ${tIdx < history.transactions.length - 1 ? 'border-b border-[#24335E]' : ''}`}>
                                                        <View className="flex-row items-center gap-3 flex-1">
                                                            <View className={`w-8 h-8 rounded-full items-center justify-center ${t.type === 'SETTLEMENT' ? 'bg-[#10B98120]' : 'bg-[#8B5CF620]'}`}>
                                                                {t.type === 'SETTLEMENT' ? <HandCoins size={14} color="#10B981" /> : <Calendar size={14} color="#8B5CF6" />}
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className="text-white font-semibold text-sm" numberOfLines={1}>{t.description}</Text>
                                                                <Text className="text-[#829AC9] text-[10px]">{new Date(t.date).toLocaleDateString()}</Text>
                                                            </View>
                                                        </View>
                                                        <View className="items-end">
                                                            <Text className={`font-bold text-sm ${t.amount >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                                                {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                                                            </Text>
                                                            <Text className="text-[#829AC9] text-[10px]">{t.currencyCode}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    )
                ) : (
                    membersLoading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-10" />
                    ) : (
                        <View className="p-4 gap-4">
                            <Text className="text-white text-lg font-bold mb-2">Group Members ({members.length})</Text>
                            {members.map((member: any, idx: number) => {
                                const initial = (member.name || member.userName || '?').charAt(0).toUpperCase();
                                return (
                                    <View key={member.userId || idx} className="bg-[#131B3A] p-5 rounded-2xl border border-[#24335E] shadow-sm">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-center gap-4">
                                                <View className="w-12 h-12 rounded-full bg-[#1C2854] items-center justify-center border border-[#8B5CF640]">
                                                    <Text className="text-[#8B5CF6] font-bold text-xl">{initial}</Text>
                                                </View>
                                                <View>
                                                    <Text className="text-white font-bold text-lg">{member.name || member.userName || 'Member'}</Text>
                                                    {member.userId === resolvedUserId && <Text className="text-[#8B5CF6] text-xs font-bold">(You)</Text>}
                                                </View>
                                            </View>
                                            {member.isAdmin && (
                                                <View className="bg-[#8B5CF620] px-2 py-1 rounded-md border border-[#8B5CF640]">
                                                    <Text className="text-[#8B5CF6] text-[10px] font-bold uppercase">Admin</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Divider className="bg-[#24335E] mb-4" />

                                        <View className="gap-3">
                                            <View className="flex-row items-center gap-3">
                                                <Mail size={14} color="#829AC9" />
                                                <Text className="text-[#E2E8F0] text-sm">{member.email || 'No email provided'}</Text>
                                            </View>
                                            {member.phone && (
                                                <View className="flex-row items-center gap-3">
                                                    <Phone size={14} color="#829AC9" />
                                                    <Text className="text-[#E2E8F0] text-sm">{member.phone}</Text>
                                                </View>
                                            )}
                                            {member.createdAt && (
                                                <View className="flex-row items-center gap-3">
                                                    <Calendar size={14} color="#829AC9" />
                                                    <Text className="text-[#829AC9] text-xs">Joined {new Date(member.createdAt).toLocaleDateString()}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
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
                        showToast("Success", `${email} added to the group!`, "success");
                        loadDashboard();
                        loadMembers();
                    } catch (err: any) {
                        showToast("Error", err?.message || 'Failed to add member', "error");
                    }
                    setIsAddUserModalVisible(false);
                }}
            />
            <SettleUpModal
                visible={!!settleUpTarget}
                onClose={() => setSettleUpTarget(null)}
                onConfirm={handleSettleUpConfirm}
                userName={settleUpTarget?.userName || ''}
                currentUserName={currentUserName}
                maxAmount={Math.abs(settleUpTarget?.netBalance || 0)}
                defaultCurrencyCode={balancesData?.currencyCode || ''}
                isOwed={(settleUpTarget?.netBalance || 0) < 0}
                groupId={groupId}
            />
        </View>
    );
};

const Divider = ({ className }: { className?: string }) => <View style={[{ height: 1 }, styles.divider]} className={className} />;

const styles = StyleSheet.create({
    container: { backgroundColor: '#0B1128', flex: 1 },
    divider: { backgroundColor: '#24335E' },
    expenseItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, marginBottom: 8, borderRadius: 14,
        backgroundColor: '#131B3A', borderWidth: 1, borderColor: '#24335E',
    },
    expenseTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, lineHeight: 22 },
    expenseSub:   { color: '#829AC9', fontSize: 11, marginTop: 3 },
    expenseAmount: { fontWeight: 'bold', fontSize: 17, lineHeight: 24 },
});

export default GroupDetailsPage;
