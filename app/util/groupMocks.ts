export interface UserBalance {
    amount: number;
    currency: string;
    status: 'OWED' | 'OWES' | 'SETTLED';
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string | null;
    memberCount: number;
    createdAt: string;
    userBalance: UserBalance;
}

export const MOCK_GROUPS: Group[] = [
    {
        id: '1',
        name: 'Goa Trip 2024',
        description: 'Yearly vacation with college friends',
        avatarUrl: 'https://i.pravatar.cc/150?u=goa',
        memberCount: 6,
        createdAt: '2024-01-15T10:00:00Z',
        userBalance: {
            amount: 5400.50,
            currency: 'INR',
            status: 'OWED'
        }
    },
    {
        id: '2',
        name: 'Flat 303 Expenses',
        description: 'Rent, Electricity, WiFi',
        avatarUrl: null,
        memberCount: 3,
        createdAt: '2023-08-01T09:00:00Z',
        userBalance: {
            amount: 1250.00,
            currency: 'INR',
            status: 'OWES'
        }
    },
    {
        id: '3',
        name: 'Office Lunch Team',
        description: 'Daily lunch orders',
        avatarUrl: 'https://i.pravatar.cc/150?u=lunch',
        memberCount: 8,
        createdAt: '2023-12-01T12:30:00Z',
        userBalance: {
            amount: 0,
            currency: 'INR',
            status: 'SETTLED'
        }
    },
    {
        id: '4',
        name: 'Weekend Football',
        description: 'Turf booking',
        avatarUrl: null,
        memberCount: 12,
        createdAt: '2023-11-20T18:00:00Z',
        userBalance: {
            amount: 200.00,
            currency: 'INR',
            status: 'OWES'
        }
    }
];
