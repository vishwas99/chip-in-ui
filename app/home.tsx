import { useLocalSearchParams } from 'expo-router';
import HomePage from '../src/components/HomePage';

export default function Home() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const safeUsername = Array.isArray(username) ? username[0] : username;

    return <HomePage username={safeUsername} />;
}
