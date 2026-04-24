import { request } from './restClient';

export interface MoneyOwed {
    moneyOwed: number;
    currency: string;
}

export interface GroupAdmin {
    userId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface GroupInfo {
    groupId: string;
    groupName: string;
    groupDescription: string;
    groupAdmin: GroupAdmin;
    groupCreationDate: string;
    imageUrl: string | null;
}


export interface UserGroupResponse {
    group: GroupInfo;
    groupExpense: MoneyOwed[] | null;
}

export interface UserExpenseData {
    userId: string;
    moneyOwedList: MoneyOwed[];
    userGroupResponses: UserGroupResponse[];
}

export interface UserExpenseResponse {
    message: string;
    success: boolean;
    data: UserExpenseData;
}

export const fetchUserExpenses = async (userId: string): Promise<UserExpenseResponse> => {
    return request(`/expenses/user?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface Currency {
    currencyId: string;   // primary key returned by API
    code: string;         // e.g. "INR"
    name: string;         // e.g. "Indian Rupee"
    symbol: string;       // e.g. "₹"
    active: boolean;
    // Legacy alias fields (kept for old code compatibility)
    id?: string;
    currencyName?: string;
    exchangeRate?: number;
    exchangeTo?: Currency | null;
    createdOn?: string;
}

export interface CurrencyResponse {
    message: string;
    success: boolean;
    data: Currency[];
}

export const fetchCurrencies = async (userId: string): Promise<CurrencyResponse> => {
    return request(`/currency/all?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
};

export interface IndividualMoneyOwed {
    moneyOwed: number;
    currency: Currency;
}

export interface IndividualUserDetail {
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
}

export interface IndividualExpense {
    user: IndividualUserDetail;
    moneyOwed: IndividualMoneyOwed[];
}

export interface UserIndividualExpenseData {
    user: IndividualUserDetail;
    expenseList: IndividualExpense[];
}

export interface UserIndividualExpenseResponse {
    message: string;
    success: boolean;
    data: UserIndividualExpenseData;
}

export const fetchUserIndividualExpenses = async (userId: string): Promise<UserIndividualExpenseResponse> => {
    return request(`/expenses/user-user?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface SplitUser {
    userId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface SplitDetail {
    splitId: string;
    userId: string;
    user: SplitUser;
    amountOwed: number;
    expense: GroupExpenseItem;
}

export interface GroupExpenseItem {
    expenseId: string;
    name: string;
    description: string;
    amount: number;
    date: string;
    paidBy: {
        userId: string;
        name: string;
        email: string;
        phone: string;
        createdAt: string;
    };
    group: GroupInfo;
    currency: Currency;
    splits?: SplitDetail[];
}

export interface GroupExpensesResponse {
    message: string;
    success: boolean;
    data: GroupExpenseItem[];
}

export const fetchGroupExpenses = async (groupId: string): Promise<GroupExpensesResponse> => {
    return request(`/expenses/group?groupId=${groupId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface GroupMember {
    userId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface GroupMembersResponse {
    message: string;
    success: boolean;
    data: GroupMember[];
}

export const fetchGroupMembers = async (groupId: string): Promise<GroupMembersResponse> => {
    return request(`/groups/getGroupMembers?groupId=${groupId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface ExpenseDetailData {
    expense: GroupExpenseItem;
    splits: SplitDetail[];
}

export interface ExpenseDetailsResponse {
    message: string;
    success: boolean;
    data: ExpenseDetailData;
}

export const fetchExpenseDetails = async (expenseId: string): Promise<ExpenseDetailsResponse> => {
    return request(`/expenses/details?expenseId=${expenseId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface CreateGroupRequest {
    createdBy: string; // UUID
    groupName: string;
    groupDescription?: string;
}

export const createGroup = async (data: CreateGroupRequest): Promise<{ success: boolean; data?: string; message?: string }> => {
    try {
        const response = await request(`/groups/create`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return {
            success: true,
            data: response.data // Assuming response body is the UUID string
        };
    } catch (error: any) {
        console.error("Error creating group:", error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || "Failed to create group"
        };
    }
};

export interface SplitRequest {
    userId: string;
    amount: number;
}

export interface AddExpenseRequest {
    groupId: string;
    expenseOwner: string;
    amount: number;
    description: string;
    expenseName: string;
    expenseSplit: SplitRequest[];
    currencyId: string;
}

export const addExpense = async (data: AddExpenseRequest): Promise<{ success: boolean; data?: boolean; message?: string }> => {
    try {
        const response = await request(`/groups/addExpense`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return {
            success: true,
            data: response?.data !== undefined ? response.data : response // Boolean true/false or object wrapper
        };
    } catch (error: any) {
        console.error("Error adding expense:", error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || "Failed to add expense"
        };
    }
};

export interface KnownUser {
    userId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface KnownUsersResponse {
    message: string;
    success: boolean;
    data: KnownUser[];
}

export const fetchNewKnownUsers = async (userId: string, groupId: string): Promise<KnownUsersResponse> => {
    return request(`/users/get-new-known-users?userId=${userId}&groupId=${groupId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export interface ValidUserResponse {
    message: string;
    success: boolean;
    data: KnownUser;
}

export const validateUserByEmail = async (email: string): Promise<ValidUserResponse> => {
    return request(`/users/get-user-by-email?email=${email}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};


export interface AddMemberRequest {
    groupId: string;
    userId: string;
}

export const addGroupMember = async (data: AddMemberRequest): Promise<{ success: boolean; data?: boolean; message?: string }> => {
    try {
        const response = await request(`/groups/addMember`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return {
            success: true,
            data: response.data // Assuming this is boolean
        };
    } catch (error: any) {
        console.error("Error adding group member:", error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || "Failed to add member"
        };
    }
};

// --- NEW API CONTRACT IMPLEMENTATION ---

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePicUrl?: string;
}

export const fetchCurrentUser = async (): Promise<User> => {
    return request(`/api/users/me`, { method: 'GET' });
};

export const fetchDefaultCurrency = async (): Promise<Currency> => {
    return request(`/api/users/me/default-currency`, { method: 'GET' });
};

export const logout = async (email: string): Promise<string> => {
    return request(`/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
    });
};

export const disableUser = async (email: string): Promise<string> => {
    return request(`/api/users/disable?email=${encodeURIComponent(email)}`, { method: 'POST' });
};

export const enableUser = async (email: string): Promise<string> => {
    return request(`/api/users/enable?email=${encodeURIComponent(email)}`, { method: 'POST' });
};

// 2.6 Search users by name or email (for add-member dropdowns)
export const searchUsers = async (query: string): Promise<any[]> => {
    return request(`/api/users/search?query=${encodeURIComponent(query)}`, { method: 'GET' });
};

// 2.7 Get all friends (users sharing a group with current user)
export const fetchFriends = async (): Promise<any[]> => {
    return request(`/api/users/friends`, { method: 'GET' });
};

// 5.1 Invite a new user to the platform (and optionally to a group)
export interface InviteUserRequest {
    email: string;
    name: string;
    groupId?: string;
}
export const inviteUser = async (data: InviteUserRequest): Promise<string> => {
    return request(`/api/invitations/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
    });
};

export interface UpdateProfileRequest {
    name?: string;
    phone?: string;
    profilePicUrl?: string;
}

export const updateProfile = async (data: UpdateProfileRequest): Promise<User> => {
    return request(`/api/users/me`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};

export const fetchAllCurrencies = async (groupId?: string): Promise<Currency[]> => {
    const url = groupId ? `/api/currencies?groupId=${groupId}` : `/api/currencies`;
    return request(url, { method: 'GET' });
};

export const fetchCurrencyById = async (id: string): Promise<Currency> => {
    return request(`/api/currencies/${id}`, { method: 'GET' });
};

export interface CreateCurrencyRequest {
    code: string;
    name: string;
    symbol: string;
}

export const createCurrency = async (data: CreateCurrencyRequest): Promise<Currency> => {
    return request(`/api/currencies`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};

export const deleteCurrency = async (id: string): Promise<void> => {
    return request(`/api/currencies/${id}`, { method: 'DELETE' });
};

export interface CreateNewGroupRequest {
    name: string;
    description?: string;
    imageUrl?: string;
    type: string;
    simplifyDebt: boolean;
    defaultCurrencyId: string;
}

export const createNewGroup = async (data: CreateNewGroupRequest): Promise<any> => {
    return request(`/api/groups`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};

export interface AddGroupMemberRequest {
    email: string;
    isAdmin: boolean;
}

export const addNewGroupMember = async (groupId: string, data: AddGroupMemberRequest): Promise<any> => {
    return request(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};

export const addCustomCurrency = async (groupId: string, currencyId: string, name: string, exchangeRate: number): Promise<any> => {
    return request(`/api/groups/${groupId}/currencies/${currencyId}?name=${encodeURIComponent(name)}&exchangeRate=${exchangeRate}`, {
        method: 'POST'
    });
};

export interface GroupDashboardResponse {
    targetCurrencyId: string;
    userBalances: any[];
    expenses: any[];
    settlements: any[];
}

export const fetchGroupDashboard = async (groupId: string): Promise<GroupDashboardResponse> => {
    return request(`/api/groups/${groupId}/dashboard`, { method: 'GET' });
};

export const fetchGroupsByUser = async (userId: string): Promise<any> => {
    return request(`/api/groups/user/${userId}`, { method: 'GET' });
};

// 4.1 Get My Groups — for dropdowns, returns all groups the current user is in
export const fetchMyGroups = async (): Promise<any[]> => {
    return request(`/api/groups/me`, { method: 'GET' });
};

export interface HomeGroupsResponse {
    totalOwedToYou: number;
    totalYouOwe: number;
    displayCurrencyId: string;
    displayCurrencyCode: string;
    groups: any[];
}

export const fetchHomeGroups = async (displayCurrencyId?: string): Promise<HomeGroupsResponse> => {
    const url = displayCurrencyId ? `/api/home/groups?displayCurrencyId=${displayCurrencyId}` : `/api/home/groups`;
    return request(url, { method: 'GET' });
};

export interface HomeFriendsResponse {
    totalOwedToYou: number;
    totalYouOwe: number;
    displayCurrencyId: string;
    displayCurrencyCode: string;
    friends: any[];
}

export const fetchHomeFriends = async (displayCurrencyId?: string): Promise<HomeFriendsResponse> => {
    const url = displayCurrencyId ? `/api/home/friends?displayCurrencyId=${displayCurrencyId}` : `/api/home/friends`;
    return request(url, { method: 'GET' });
};

export interface CreateExpenseRequest {
    description: string;
    amount: number;
    currencyId: string;
    splitType: string;
    type?: string;           // optional e.g. 'FOOD', 'TRAVEL'
    receiptImgUrl?: string;  // optional receipt image URL
    payers: { userId: string; paidAmount: number }[];
    splits: { userId: string; amountOwed: number }[];
}

export const createNewExpense = async (groupId: string, data: CreateExpenseRequest): Promise<string> => {
    // Contract 6.1: POST /api/groups/{groupId}/expenses
    return request(`/api/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};

// Contract 6.2: GET /api/groups/{groupId}/expenses/{expenseId}
export const fetchExpenseByGroupAndId = async (groupId: string, expenseId: string): Promise<any> => {
    return request(`/api/groups/${groupId}/expenses/${expenseId}`, { method: 'GET' });
};

export interface CreateSettlementRequest {
    groupId: string;
    payerId: string;
    payeeId: string;
    amount: number;
    currencyId: string;
    notes?: string;
}

export const recordSettlement = async (data: CreateSettlementRequest): Promise<string> => {
    return request(`/api/settlements`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
};
