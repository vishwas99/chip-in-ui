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
    id: string;
    currencyName: string;
    exchangeRate: number;
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

export interface SettledSplit {
    userId: string;
    originalAmount: number;
    effectiveAmount: number;
}

export interface SettledExpenseItem {
    expenseId: string;
    name: string;
    description: string;
    amount: number;
    currency: Currency;
    paidBy: string; // userId string
    splits: SettledSplit[];
}

export const fetchSettledGroupExpenses = async (groupId: string, userId: string): Promise<SettledExpenseItem[]> => {
    return request(`/groups/${groupId}/expenses/settled?userId=${userId}`, {
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
