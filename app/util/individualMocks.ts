import { UserBalance } from './groupMocks';

export interface IndividualUser {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    balance: UserBalance;
}

export const MOCK_INDIVIDUALS: IndividualUser[] = [
    {
        id: '101',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=rahul',
        balance: {
            amount: 500.00,
            currency: 'INR',
            status: 'OWED'
        }
    },
    {
        id: '102',
        name: 'Priya Patel',
        email: 'priya@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=priya',
        balance: {
            amount: 1500.00,
            currency: 'INR',
            status: 'OWES'
        }
    },
    {
        id: '103',
        name: 'Amit Kumar',
        email: 'amit@example.com',
        avatarUrl: null,
        balance: {
            amount: 0,
            currency: 'INR',
            status: 'SETTLED'
        }
    },
    {
        id: '104',
        name: 'Sneha Gupta',
        email: 'sneha@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=sneha',
        balance: {
            amount: 350.00,
            currency: 'INR',
            status: 'OWED'
        }
    }
];
