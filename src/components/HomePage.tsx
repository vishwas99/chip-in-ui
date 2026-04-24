import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from 'react-native';
import { FilePlus2, HandCoins, UserPlus, Users, User, Receipt } from 'lucide-react-native';
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Dimensions } from 'react-native';
import {
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionTrigger,
    AccordionTitleText,
    AccordionContent,
    AccordionContentText,
    AccordionIcon,
} from '@/components/ui/accordion';
import { Divider } from "@/components/ui/divider"
import axios from 'axios';
// import { Cookies } from '@react-native-cookies/cookies';
import { Group, UserBalance } from '../util/groupMocks';
import { IndividualUser } from '../util/individualMocks';
import { fetchHomeGroups, fetchHomeFriends, fetchDefaultCurrency, HomeGroupsResponse, HomeFriendsResponse } from '../util/apiService';
import Config from "../config";
import AddExpenseModal from './AddExpenseModal';
import CreateGroupModal from './CreateGroupModal';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const API_BASE_URL = Config.API_BASE_URL;
const GROUP_CONTEXT = Config.GROUP_CONTEXT;
const GROUP_FOR_USER_CONTEXT = Config.GROUP_FOR_USER_CONTEXT;

// Card Background - #131B3A
// Currency positive (Owed) - #10B981 (Emerald)
// Currency negative (Owes) - #F43F5E (Rose)

interface HomePageProps {
    onLogout?: () => void;
    username?: string;
}

const calculateIndividualSummary = (expenseList: IndividualExpense[]): MoneyOwed[] => {
    const totals: { [currency: string]: number } = {};

    expenseList.forEach(item => {
        item.moneyOwed.forEach(debt => {
            const curr = debt.currency.currencyName;
            totals[curr] = (totals[curr] || 0) + debt.moneyOwed;
        });
    });

    return Object.keys(totals).map(currency => ({
        currency,
        moneyOwed: totals[currency]
    }));
};

const mapToGroup = (apiGroup: UserGroupResponse): Group => {
    const expenses = apiGroup.groupExpense || [];

    const userBalances: UserBalance[] = expenses.length > 0 ? expenses.map(expense => {
        let status: 'OWED' | 'OWES' | 'SETTLED' = 'SETTLED';
        if (expense.moneyOwed > 0) status = 'OWED';
        else if (expense.moneyOwed < 0) status = 'OWES';

        return {
            amount: Math.abs(expense.moneyOwed),
            currency: expense.currency,
            status: status
        };
    }) : [{ amount: 0, currency: 'USD', status: 'SETTLED' }];

    return {
        id: apiGroup.group.groupId,
        name: apiGroup.group.groupName,
        description: apiGroup.group.groupDescription,
        avatarUrl: apiGroup.group.imageUrl,
        createdAt: apiGroup.group.groupCreationDate,
        userBalances: userBalances,
    };
};

const mapToIndividualUser = (expenseItem: IndividualExpense): IndividualUser => {
    const expenses = expenseItem.moneyOwed || [];

    const userBalances: UserBalance[] = expenses.length > 0 ? expenses.map(expense => {
        let status: 'OWED' | 'OWES' | 'SETTLED' = 'SETTLED';
        if (expense.moneyOwed > 0) status = 'OWED';
        else if (expense.moneyOwed < 0) status = 'OWES';

        // expense.currency is an object { currencyName: 'INR', ... }
        return {
            amount: Math.abs(expense.moneyOwed),
            currency: expense.currency.currencyName,
            status: status
        };
    }) : [{ amount: 0, currency: 'USD', status: 'SETTLED' }];

    return {
        id: expenseItem.user.email || expenseItem.user.name, // Fallback ID
        name: expenseItem.user.name,
        email: expenseItem.user.email,
        avatarUrl: null, // API doesn't seem to provide avatar yet
        balances: userBalances
    };
};

const GroupItem = ({ group, currentUserId }: { group: Group, currentUserId?: string }) => {
    const balances = group.userBalances || [];
    const displayBalances = balances.slice(0, 2);
    const hasMore = balances.length > 2;
    const router = useRouter();

    return (
        <TouchableOpacity onPress={() => router.push({ pathname: "/group/[groupId]", params: { groupId: group.id, userBalances: JSON.stringify(group.userBalances), currentUserId } })}>
            <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#131B3A', borderColor: '#24335E', borderWidth: 1, shadowColor: '#000000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 5 }}>
                <View className="flex flex-row items-center gap-3 flex-1">
                    {group.avatarUrl ? (
                        <Image
                            source={{ uri: group.avatarUrl }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                    ) : (
                        <View className="w-10 h-10 rounded-full bg-[#8B5CF615] items-center justify-center border border-[#8B5CF640]">
                            <Users size={20} color="#8B5CF6" />
                        </View>
                    )}
                    <View className="flex-1">
                        <Text className="text-[#E2E8F0] font-extrabold text-lg">{group.name}</Text>
                        <Text className="text-[#829AC9] text-sm" numberOfLines={1}>{group.description || `${group.memberCount || 0} members`}</Text>
                    </View>
                </View>
                <View className="items-end max-w-[40%]">
                    <View className="flex flex-row flex-wrap justify-end">
                        {displayBalances.map((balance, index) => {
                            const isSettled = balance.status === 'SETTLED';
                            const isOwed = balance.status === 'OWED';
                            const color = isSettled ? '#829AC9' : (isOwed ? '#10B981' : '#F43F5E');

                            return (
                                <Text key={index} style={{ color, fontWeight: 'bold' }}>
                                    {index > 0 ? ' + ' : ''}
                                    {balance.currency} {balance.amount.toFixed(2)}
                                </Text>
                            );
                        })}
                        {hasMore && <Text className="text-gray-400 font-bold"> ...</Text>}
                    </View>
                    {/* Fallback for completely settled if needed, though map handles it */}
                    {balances.length === 0 && <Text style={{ color: '#9ca3af', fontSize: 12 }}>Settled</Text>}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const IndividualItem = ({ user }: { user: IndividualUser }) => {
    const balances = user.balances || [];
    const displayBalances = balances.slice(0, 2);
    const hasMore = balances.length > 2;

    return (
        <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#131B3A', borderColor: '#24335E', borderWidth: 1, shadowColor: '#000000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 5 }}>
            <View className="flex flex-row items-center gap-3 flex-1">
                {user.avatarUrl ? (
                    <Image
                        source={{ uri: user.avatarUrl }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full bg-[#8B5CF615] items-center justify-center border border-[#8B5CF640]">
                        <User size={20} color="#8B5CF6" />
                    </View>
                )}
                <View className="flex-1">
                    <Text className="text-[#E2E8F0] font-extrabold text-lg">{user.name}</Text>
                    <Text className="text-[#829AC9] text-sm" numberOfLines={1}>{user.email || 'No email'}</Text>
                </View>
            </View>
            <View className="items-end max-w-[40%]">
                <View className="flex flex-row flex-wrap justify-end">
                    {displayBalances.map((balance, index) => {
                        const isSettled = balance.status === 'SETTLED';
                        const isOwed = balance.status === 'OWED';
                        const color = isSettled ? '#829AC9' : (isOwed ? '#10B981' : '#F43F5E');

                        return (
                            <Text key={index} style={{ color, fontWeight: 'bold' }}>
                                {index > 0 ? ' + ' : ''}
                                {balance.currency} {balance.amount.toFixed(2)}
                            </Text>
                        );
                    })}
                    {hasMore && <Text className="text-gray-400 font-bold"> ...</Text>}
                </View>
                {balances.length === 0 && <Text style={{ color: '#9ca3af', fontSize: 12 }}>Settled</Text>}
            </View>
        </View>
    );
};


const HomePage: React.FC<HomePageProps> = ({ onLogout, username }) => {
    const insets = useSafeAreaInsets();

    const [isGroupActive, setIsGroupActive] = useState(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [individuals, setIndividuals] = useState<IndividualUser[]>([]);
    const [groupSummary, setGroupSummary] = useState<any>(null);
    const [friendSummary, setFriendSummary] = useState<any>(null);
    const [defaultCurrencyId, setDefaultCurrencyId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
    const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

    const fetchData = async (type: 'groups' | 'individual' | 'all' = 'all') => {
        setLoading(true);
        try {
            // Default currency fetch is best-effort — server 500s if none set, that's OK
            let currencyId = defaultCurrencyId;
            if (!currencyId) {
                try {
                    const defaultCurrency = await fetchDefaultCurrency();
                    currencyId = defaultCurrency.id;
                    setDefaultCurrencyId(currencyId);
                    console.log('[Home] Default currency ID:', currencyId);
                } catch (e) {
                    // Backend 500s when no default currency is set — proceed without it
                }
            }

            if (type === 'all' || type === 'groups') {
                const res = await fetchHomeGroups(currencyId);
                console.log("Home Groups Response:", JSON.stringify(res, null, 2));
                setGroupSummary(res);
                // Actual response field is 'groups' (not 'groupSummaries')
                const mappedGroups = (res.groups || []).map((g: any): Group => ({
                    id: g.groupId || g.group?.groupId,
                    name: g.groupName || g.group?.name || g.group?.groupName,
                    description: g.groupDescription || g.group?.description,
                    avatarUrl: g.imageUrl || g.group?.imageUrl || null,
                    createdAt: g.createdAt || g.group?.createdAt,
                    userBalances: g.amountOwedByUser != null
                        ? [{ amount: Math.abs(g.amountOwedByUser), currency: res.displayCurrencyCode || 'INR', status: g.amountOwedByUser > 0 ? 'OWES' : g.amountOwedByUser < 0 ? 'OWED' : 'SETTLED' }]
                        : (g.balances || []).map((b: any) => ({
                            amount: Math.abs(b.amount),
                            currency: b.currencyCode || b.currency || 'INR',
                            status: b.amount > 0 ? 'OWED' : b.amount < 0 ? 'OWES' : 'SETTLED',
                        })),
                }));
                setGroups(mappedGroups);
            }

            if (type === 'all' || type === 'individual') {
                const res = await fetchHomeFriends(currencyId);
                console.log("Home Friends Response:", JSON.stringify(res, null, 2));
                setFriendSummary(res);
                // Actual response field is 'friends' (not 'friendSummaries')
                const mappedFriends = (res.friends || []).map((f: any): IndividualUser => ({
                    id: f.friendId || f.userId || f.email,
                    name: f.friendName || f.name,
                    email: f.email,
                    avatarUrl: null,
                    balances: f.netBalance != null
                        ? [{ amount: Math.abs(f.netBalance), currency: res.displayCurrencyCode || 'INR', status: f.netBalance > 0 ? 'OWED' : f.netBalance < 0 ? 'OWES' : 'SETTLED' }]
                        : (f.balances || []).map((b: any) => ({
                            amount: Math.abs(b.amount),
                            currency: b.currencyCode || b.currency || 'INR',
                            status: b.amount > 0 ? 'OWED' : b.amount < 0 ? 'OWES' : 'SETTLED',
                        })),
                }));
                setIndividuals(mappedFriends);
            }

        } catch (error) {
            console.error("Error loading data:", error);
            if (type === 'all' || type === 'groups') setGroups([]);
            if (type === 'all' || type === 'individual') setIndividuals([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            // Try to get from storage first, then prop
            // We call fetchData which handles the priority (storage > prop)
            fetchData('all');
        };
        initialize();
    }, []);

    const loadData: any = (tab: string) => {
        console.log(`Loading data for tab: ${tab}`);
        if (tab === 'groups') {
            setIsGroupActive(true);
            fetchData('groups');
        } else {
            setIsGroupActive(false);
            fetchData('individual');
        }
    }

    // Build the summary banner from real API totals
    const activeSummary = isGroupActive ? groupSummary : friendSummary;
    const currencyCode = activeSummary?.displayCurrencyCode || 'INR';
    const owedToYou = activeSummary?.totalOwedToYou || 0;
    const youOwe = activeSummary?.totalYouOwe || 0;
    const displayList = owedToYou > 0 || youOwe > 0
        ? [
            ...(owedToYou > 0 ? [{ moneyOwed: owedToYou, currency: currencyCode }] : []),
            ...(youOwe > 0  ? [{ moneyOwed: -youOwe,  currency: currencyCode }] : []),
          ]
        : [{ moneyOwed: 0, currency: currencyCode }];
    const remainingCount = 0;

    return (
        <View style={{ flex: 1, backgroundColor: '#0B1128', paddingTop: insets.top }}>
            <ScrollView style={styles.container}>
                {/* Search, Add group, Add Quick Expense buttons */}
                <View className="flex flex-row justify-between items-center p-4 m-2 w-full">
                    <Text className="text-xl font-bold text-[#E2E8F0]">Welcome, {username || 'User'}</Text>
                    <View className="flex flex-row gap-3">
                        <TouchableOpacity
                            onPress={() => setIsAddExpenseVisible(true)}
                            style={{ backgroundColor: '#1C2854', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#24335E' }}
                        >
                            <HandCoins color="#8B5CF6" size={22} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsCreateGroupVisible(true)}
                            style={{ backgroundColor: '#1C2854', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#24335E' }}
                        >
                            <UserPlus color="#8B5CF6" size={22} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary Card */}

                <View className='w-full'>
                    <Card size="lg" variant="elevated" className="p-5 m-3 lg" style={{ backgroundColor: '#131B3A', borderColor: '#24335E', borderWidth: 1, shadowColor: '#000000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10 }}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#8B5CF6" />
                        ) : (
                            <View className="gap-3">
                                {displayList.map((item, index) => {
                                    const amount = item.moneyOwed;
                                    const text = amount > 0 ? "You are owed" : (amount < 0 ? "You owe" : "All settled");
                                    const color = amount >= 0 ? '#10B981' : '#F43F5E';

                                    return (
                                        <View key={item.currency} className="flex flex-row justify-between items-center">
                                            <Text size="xl" className='text-[#E2E8F0] font-bold'>{text}</Text>
                                            <Text size="2xl" className="text-2xl" style={{ color }}>
                                                {Math.abs(amount).toLocaleString('en-US', {
                                                    style: 'currency',
                                                    currency: item.currency,
                                                })}
                                            </Text>
                                        </View>
                                    );
                                })}
                                {remainingCount > 0 && (
                                    <Text className="text-[#829AC9] text-sm text-right mt-1 font-semibold">
                                        And {remainingCount} more currency{remainingCount > 1 ? 'ies' : ''}...
                                    </Text>
                                )}
                            </View>
                        )}
                    </Card>
                </View>
                <Divider className="my-2" style={{ backgroundColor: '#24335E' }} />

                {/* Groups / Individual Toggle */}
                <View className='flex flex-row items-center p-4 m-2 gap-4 w-full'>
                    <Button size="md" variant="outline" action="primary" onPress={() => loadData('groups')} style={{ borderColor: isGroupActive ? '#8B5CF6' : '#24335E', borderWidth: 1, backgroundColor: isGroupActive ? '#8B5CF615' : 'transparent' }}>
                        <Text style={{ color: isGroupActive ? '#8B5CF6' : '#829AC9', fontWeight: isGroupActive ? 'bold' : 'normal' }}>Groups</Text>
                    </Button>
                    <Button size="md" variant="outline" action="primary" onPress={() => loadData('individual')} style={{ borderColor: !isGroupActive ? '#8B5CF6' : '#24335E', borderWidth: 1, backgroundColor: !isGroupActive ? '#8B5CF615' : 'transparent' }}>
                        <Text style={{ color: !isGroupActive ? '#8B5CF6' : '#829AC9', fontWeight: !isGroupActive ? 'bold' : 'normal' }}>Individual</Text>
                    </Button>
                </View>

                {/* Content Area */}
                <View className="p-2 w-full pb-24">
                    {loading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" className="mt-4" />
                    ) : (
                        isGroupActive ? (
                            <View className="gap-2">
                                {groups.map((group) => (
                                    <GroupItem key={group.id} group={group} />
                                ))}
                            </View>
                        ) : (
                            <View className="gap-2">
                                {individuals.map((user) => (
                                    <IndividualItem key={user.id} user={user} />
                                ))}
                            </View>
                        )
                    )}
                </View>

            </ScrollView>

            {/* Modals triggered from header buttons */}
            <AddExpenseModal
                isVisible={isAddExpenseVisible}
                onClose={() => { setIsAddExpenseVisible(false); fetchData('all'); }}
            />
            <CreateGroupModal
                isVisible={isCreateGroupVisible}
                onClose={() => { setIsCreateGroupVisible(false); fetchData('groups'); }}
            />
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        backgroundColor: '#0B1128',
        color: 'white',
        padding: 0.03 * windowWidth,
    },
});

export default HomePage;