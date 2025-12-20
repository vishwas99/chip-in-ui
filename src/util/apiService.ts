import { request } from './restClient';

export interface MoneyOwed {
    moneyOwed: number;
    currency: string;
}

export interface GroupInfo {
    groupId: string;
    groupName: string;
    groupDescription: string;
    groupAdmin: string;
    groupCreationDate: string;
    imageUrl: string | null;
}

export interface UserGroupResponse {
    group: GroupInfo;
    groupExpense: MoneyOwed[];
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
