const Config = {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "",
    LOGIN_CONTEXT: process.env.EXPO_PUBLIC_LOGIN_CONTEXT || "/login",
    GROUP_CONTEXT: process.env.EXPO_PUBLIC_GROUP_CONTEXT || "/groups",
    GROUP_FOR_USER_CONTEXT: process.env.EXPO_PUBLIC_GROUP_FOR_USER_CONTEXT || "/getUserGroups",
};

export default Config;
