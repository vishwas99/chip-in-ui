import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
import { fetchUserExpenses, UserExpenseData, UserGroupResponse, fetchUserIndividualExpenses, IndividualExpense, MoneyOwed } from '../util/apiService';
import Config from "../config";
import { getAuthData } from '../util/authService';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const API_BASE_URL = Config.API_BASE_URL;
const GROUP_CONTEXT = Config.GROUP_CONTEXT;
const GROUP_FOR_USER_CONTEXT = Config.GROUP_FOR_USER_CONTEXT;

// Card Background - #212121
// Curreny green - #33f584
// Currency red - #f53344

interface HomePageProps {
    onLogout?: () => void;
    username?: string;
    userId?: string; // Added userId prop
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
            <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#212121' }}>
                <View className="flex flex-row items-center gap-3 flex-1">
                    {group.avatarUrl ? (
                        <Image
                            source={{ uri: group.avatarUrl }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                    ) : (
                        <View className="w-10 h-10 rounded-full bg-gray-600 items-center justify-center">
                            <Users size={20} color="white" />
                        </View>
                    )}
                    <View className="flex-1">
                        <Text className="text-white font-bold text-lg">{group.name}</Text>
                        <Text className="text-gray-400 text-sm" numberOfLines={1}>{group.description || `${group.memberCount || 0} members`}</Text>
                    </View>
                </View>
                <View className="items-end max-w-[40%]">
                    <View className="flex flex-row flex-wrap justify-end">
                        {displayBalances.map((balance, index) => {
                            const isSettled = balance.status === 'SETTLED';
                            const isOwed = balance.status === 'OWED';
                            const color = isSettled ? '#9ca3af' : (isOwed ? '#33f584' : '#f53344');

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
        <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#212121' }}>
            <View className="flex flex-row items-center gap-3 flex-1">
                {user.avatarUrl ? (
                    <Image
                        source={{ uri: user.avatarUrl }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full bg-gray-600 items-center justify-center">
                        <User size={20} color="white" />
                    </View>
                )}
                <View className="flex-1">
                    <Text className="text-white font-bold text-lg">{user.name}</Text>
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>{user.email || 'No email'}</Text>
                </View>
            </View>
            <View className="items-end max-w-[40%]">
                <View className="flex flex-row flex-wrap justify-end">
                    {displayBalances.map((balance, index) => {
                        const isSettled = balance.status === 'SETTLED';
                        const isOwed = balance.status === 'OWED';
                        const color = isSettled ? '#9ca3af' : (isOwed ? '#33f584' : '#f53344');

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


const HomePage: React.FC<HomePageProps> = ({ onLogout, username, userId }) => {

    const [isGroupActive, setIsGroupActive] = useState(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [individuals, setIndividuals] = useState<IndividualUser[]>([]);
    const [individualSummary, setIndividualSummary] = useState<MoneyOwed[]>([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<UserExpenseData | null>(null);

    const fetchData = async (type: 'groups' | 'individual' | 'all' = 'all') => {
        setLoading(true);
        try {
            const { userId: storedUserId } = await getAuthData();
            const idToUse = storedUserId || userId;

            if (!idToUse) {
                console.warn("No userId found (prop or storage). Cannot fetch data.");
                setLoading(false);
                return;
            }

            console.log("Fetching data for userId:", idToUse);

            const promises = [];

            if (type === 'all' || type === 'groups') {
                promises.push(fetchUserExpenses(idToUse).then(res => ({ type: 'groups', res })));
            }

            if (type === 'all' || type === 'individual') {
                promises.push(fetchUserIndividualExpenses(idToUse).then(res => ({ type: 'individual', res })));
            }

            const results = await Promise.all(promises);

            results.forEach(({ type, res }: any) => {
                if (type === 'groups') {
                    if (res.success && res.data) {
                        setUserData(res.data);
                        const mappedGroups = res.data.userGroupResponses.map(mapToGroup);
                        setGroups(mappedGroups);
                    } else {
                        console.error("Failed to fetch user expenses:", res.message);
                        setGroups([]);
                    }
                } else if (type === 'individual') {
                    if (res.success && res.data) {
                        const mappedIndividuals = res.data.expenseList.map(mapToIndividualUser);
                        setIndividuals(mappedIndividuals);
                        setIndividualSummary(calculateIndividualSummary(res.data.expenseList));
                    } else {
                        console.error("Failed to fetch individual expenses:", res.message);
                        setIndividuals([]);
                        setIndividualSummary([]);
                    }
                }
            });

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

    // Prepare summary data from API or fallbacks
    const moneyOwedList = isGroupActive ? (userData?.moneyOwedList || []) : individualSummary;
    const hasData = moneyOwedList.length > 0;

    // Fallback if no data
    const displayList = hasData ? moneyOwedList.slice(0, 3) : [{ moneyOwed: 0, currency: 'USD' }];
    const remainingCount = Math.max(0, moneyOwedList.length - 3);

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <ScrollView style={styles.container}>
                {/* Search, Add group, Add Quick Expense buttons */}
                <View className="flex flex-row justify-between items-center p-4 m-2 w-full">
                    <Text className="text-lg text-white">Welcome, {username || 'User'}</Text>
                    {/* Replaced top buttons with FAB implementation, keeping them hidden or removed if redundant. 
                        User request implies specific bottom FAB. I will remove the top buttons to avoid clutter or keep them?
                        The user didn't ask to remove top buttons, but they seem redundant now. I'll comment them out or leave them.
                        I'll leave them for now to avoid accidental regression of unseen features, but the FAB is the main focus.
                    */}
                    <View className="flex flex-row space-x-4 gap-4">
                        <Button size="md" variant="link" action="primary">
                            <View>
                                <HandCoins color="white" />
                            </View>
                        </Button>
                        <Button size="md" variant="link" action="primary" >
                            <View>
                                <UserPlus color="white" />
                            </View>
                        </Button>
                    </View>
                </View>

                {/* Summary Card */}

                <View className='w-full'>
                    <Card size="lg" variant="elevated" className="p-5 m-3 lg" style={{ backgroundColor: '#212121' }}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#33f584" />
                        ) : (
                            <View className="gap-3">
                                {displayList.map((item, index) => {
                                    const amount = item.moneyOwed;
                                    const text = amount > 0 ? "You are owed" : (amount < 0 ? "You owe" : "All settled");
                                    const color = amount >= 0 ? '#33f584' : '#f53344';

                                    return (
                                        <View key={item.currency} className="flex flex-row justify-between items-center">
                                            <Text size="xl" className='text-white'>{text}</Text>
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
                                    <Text className="text-gray-400 text-sm text-right mt-1">
                                        And {remainingCount} more currency{remainingCount > 1 ? 'ies' : ''}...
                                    </Text>
                                )}
                            </View>
                        )}
                    </Card>
                </View>
                <Divider className="my-2 bg-gray-700" />

                {/* Groups / Individual Toggle */}
                <View className='flex flex-row items-center p-4 m-2 gap-4 w-full'>
                    <Button size="md" variant="outline" action="primary" onPress={() => loadData('groups')} style={{ borderColor: isGroupActive ? '#33f584' : 'gray', borderWidth: 1 }}>
                        <Text style={{ color: isGroupActive ? '#33f584' : 'gray' }}>Groups</Text>
                    </Button>
                    <Button size="md" variant="outline" action="primary" onPress={() => loadData('individual')} style={{ borderColor: !isGroupActive ? '#33f584' : 'gray', borderWidth: 1 }}>
                        <Text style={{ color: !isGroupActive ? '#33f584' : 'gray' }}>Individual</Text>
                    </Button>
                </View>

                {/* Content Area */}
                <View className="p-2 w-full pb-24">
                    {loading ? (
                        <ActivityIndicator size="large" color="#33f584" className="mt-4" />
                    ) : (
                        isGroupActive ? (
                            <View className="gap-2">
                                {groups.map((group) => (
                                    <GroupItem key={group.id} group={group} currentUserId={userData?.userId || userId} />
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
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        backgroundColor: 'black',
        color: 'white',
        padding: 0.03 * windowWidth,
    },
});

export default HomePage;