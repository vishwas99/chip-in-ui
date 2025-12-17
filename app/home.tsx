import { useLocalSearchParams } from 'expo-router';
import HomePage from '../src/components/HomePage';

export default function Home() {
    const { userId, username } = useLocalSearchParams<{ userId: string; username: string }>();
    // Ensure userId is a string (useLocalSearchParams can return array)
    const safeUserId = Array.isArray(userId) ? userId[0] : userId;
    const safeUsername = Array.isArray(username) ? username[0] : username;

    return <HomePage userId={safeUserId} username={safeUsername} />;
}
