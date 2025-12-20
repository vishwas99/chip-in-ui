import { useLocalSearchParams } from 'expo-router';
import GroupDetailsPage from '../../src/components/GroupDetailsPage';

export default function GroupScreen() {
    const { groupId, userBalances, currentUserId } = useLocalSearchParams<{ groupId: string, userBalances: string, currentUserId: string }>();
    const safeGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
    const safeUserId = Array.isArray(currentUserId) ? currentUserId[0] : currentUserId;

    let parsedBalances = [];
    if (userBalances) {
        try {
            parsedBalances = JSON.parse(userBalances as string);
        } catch (e) {
            console.error("Failed to parse user balances", e);
        }
    }

    return <GroupDetailsPage groupId={safeGroupId} userBalances={parsedBalances} currentUserId={safeUserId} />;
}
