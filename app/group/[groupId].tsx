import { useLocalSearchParams } from 'expo-router';
import GroupDetailsPage from '../../src/components/GroupDetailsPage';

export default function GroupScreen() {
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const safeGroupId = Array.isArray(groupId) ? groupId[0] : groupId;

    return <GroupDetailsPage groupId={safeGroupId} />;
}
