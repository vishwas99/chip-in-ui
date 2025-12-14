import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from 'react-native';
import { FilePlus2, HandCoins, UserPlus, Users, User } from 'lucide-react-native';
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
import { MOCK_GROUPS, Group } from '../util/groupMocks';
import { MOCK_INDIVIDUALS, IndividualUser } from '../util/individualMocks';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const GROUP_CONTEXT = process.env.EXPO_PUBLIC_GROUP_CONTEXT || "/groups";
const GROUP_FOR_USER_CONTEXT = process.env.EXPO_PUBLIC_GROUP_FOR_USER_CONTEXT || "/user";

// Card Background - #212121
// Curreny green - #33f584
// Currency red - #f53344

const data = {
    summaryText: "You are owed ",
    summaryAmount: 123.45,
    summaryCurrency: "USD",
};


interface HomePageProps {
    onLogout?: () => void;
    username?: string;
}

const getGroupData = async () => {
    // const response = await axios.get(API_BASE_URL + GROUP_CONTEXT +  + "?userId=" + "2ae84323-e17f-4ad7-9dc4-46eeb20e91b4");
    // return response.data;
    return MOCK_GROUPS;
}

const GroupItem = ({ group }: { group: Group }) => {
    const isOwed = group.userBalance.status === 'OWED';
    const isSettled = group.userBalance.status === 'SETTLED';
    const balanceColor = isSettled ? '#9ca3af' : (isOwed ? '#33f584' : '#f53344');
    const balanceText = isSettled ? 'Settled' : (isOwed ? 'You are owed' : 'You owe');

    return (
        <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#212121' }}>
            <View className="flex flex-row items-center gap-3">
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
                <View>
                    <Text className="text-white font-bold text-lg">{group.name}</Text>
                    <Text className="text-gray-400 text-sm">{group.description || `${group.memberCount} members`}</Text>
                </View>
            </View>
            <View className="items-end">
                <Text style={{ color: balanceColor, fontSize: 12 }}>{balanceText}</Text>
                {!isSettled && (
                    <Text style={{ color: balanceColor, fontWeight: 'bold' }}>
                        {group.userBalance.currency} {group.userBalance.amount.toFixed(2)}
                    </Text>
                )}
            </View>
        </View>
    );
};

const IndividualItem = ({ user }: { user: IndividualUser }) => {
    const isOwed = user.balance.status === 'OWED';
    const isSettled = user.balance.status === 'SETTLED';
    const balanceColor = isSettled ? '#9ca3af' : (isOwed ? '#33f584' : '#f53344');
    const balanceText = isSettled ? 'Settled' : (isOwed ? 'You are owed' : 'You owe');

    return (
        <View className="flex flex-row items-center justify-between p-4 mb-2 rounded-lg" style={{ backgroundColor: '#212121' }}>
            <View className="flex flex-row items-center gap-3">
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
                <View>
                    <Text className="text-white font-bold text-lg">{user.name}</Text>
                    <Text className="text-gray-400 text-sm">{user.email || 'No email'}</Text>
                </View>
            </View>
            <View className="items-end">
                <Text style={{ color: balanceColor, fontSize: 12 }}>{balanceText}</Text>
                {!isSettled && (
                    <Text style={{ color: balanceColor, fontWeight: 'bold' }}>
                        {user.balance.currency} {user.balance.amount.toFixed(2)}
                    </Text>
                )}
            </View>
        </View>
    );
};


const HomePage: React.FC<HomePageProps> = ({ onLogout, username }) => {

    const [isGroupActive, setIsGroupActive] = useState(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [individuals, setIndividuals] = useState<IndividualUser[]>([]);

    React.useEffect(() => {
        // Load initial mock data
        setGroups(MOCK_GROUPS);
        setIndividuals(MOCK_INDIVIDUALS);
    }, []);

    const loadData: any = (tab: string) => {
        console.log(`Loading data for tab: ${tab}`);
        if (tab === 'groups') {
            setIsGroupActive(true);
            setGroups(MOCK_GROUPS);
        } else {
            setIsGroupActive(false);
            setIndividuals(MOCK_INDIVIDUALS);
        }
    }

    return (
        <ScrollView style={styles.container}>
            {/* Search, Add group, Add Quick Expense buttons */}
            <View className="flex flex-row justify-between items-center p-4 m-2 w-full">
                <Text className="text-lg text-white">Welcome, {username || 'User'}</Text>
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
                    <View className="flex flex-row justify-between items-center">
                        <Text size="xl" className='text-white'>{data.summaryText}</Text>
                        <Text size="2xl" className="text-2xl " style={{ color: data.summaryAmount < 0 ? '#f53344' : '#33f584' }}>
                            {data.summaryAmount.toLocaleString('en-US', {
                                style: 'currency',
                                currency: data.summaryCurrency,
                            })}
                        </Text>
                    </View>
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
            <View className="p-2 w-full">
                {isGroupActive ? (
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
                )}
            </View>

        </ScrollView>

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