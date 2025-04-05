import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from 'react-native';
import { FilePlus2, HandCoins, UserPlus } from 'lucide-react-native';
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

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const GROUP_CONTEXT = process.env.EXPO_PUBLIC_GROUP_CONTEXT || "/groups";
const GROUP_FOR_USER_CONTEXT =  process.env.EXPO_PUBLIC_GROUP_FOR_USER_CONTEXT || "/user";

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
    const response = await axios.get(API_BASE_URL + GROUP_CONTEXT +  + "?userId=" + "2ae84323-e17f-4ad7-9dc4-46eeb20e91b4");
    return response.data;
}


const HomePage: React.FC<HomePageProps> = ({ onLogout, username }) => {

    const [isGroupActive, setIsGroupActive] = useState(true);

    const loadData: any = (tab: string) => {
        // Load data based on the selected tab
        // This is a placeholder function. You would replace this with your actual data loading logic.
        console.log(`Loading data for tab: ${tab}`);
        if (tab === 'groups') {
            setIsGroupActive(true);
        } else {
            setIsGroupActive(false);
        }
        getGroupData()
            .then((data) => {
                console.log(data);
            }
            )
            .catch((error) => {
                console.error('Error fetching data:', error);
            }
            );
        // Example: Fetch data from an API or perform any other action
    }

    


    return (
        <ScrollView style={styles.container}>
            {/* Search, Add group, Add Quick Expense buttons */}
            <View className="flex flex-row justify-between items-center p-4 m-2 w-full">
                <Text className="text-lg">Welcome</Text>
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
            <Divider />

            {/* Groups */}
            <View className='flex flex-row items-center p-4 m-2 gap-4 w-full'>
                <Button size="md" variant="outline" action="primary" onPress={() => loadData('groups')} style={{ backgroundColor: isGroupActive ? '#33f584' : 'transparent' }}>
                    <ButtonText>Groups</ButtonText>
                </Button>
                <Button size="md" variant="outline" action="primary" onPress={() => loadData('individual')} style={{ backgroundColor: isGroupActive ? 'transparent' : '#33f584' }}>
                    <ButtonText>Individual</ButtonText>
                </Button>
            </View>
            {/* <Divider /> */}

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