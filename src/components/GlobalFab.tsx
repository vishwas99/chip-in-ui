import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, Receipt } from 'lucide-react-native';
import CreateGroupModal from './CreateGroupModal';
import AddExpenseModal from './AddExpenseModal';
import { usePathname, useGlobalSearchParams } from 'expo-router';

const GlobalFab = () => {
    const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] = useState(false);
    const [isAddExpenseModalVisible, setIsAddExpenseModalVisible] = useState(false);
    const pathname = usePathname();
    const params = useGlobalSearchParams();

    // Hide FAB on login screen or root if it redirects to login
    if (pathname === '/login' || pathname === '/') {
        return null;
    }

    const userIdParam = params.userId || params.currentUserId;
    const currentUserId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;

    return (
        <>
            <View style={styles.fabContainer}>
                {/* Left Part - Create Group */}
                <TouchableOpacity
                    style={[styles.fabButton, styles.fabLeft]}
                    onPress={() => setIsCreateGroupModalVisible(true)}
                >
                    <Users color="white" size={20} />
                </TouchableOpacity>

                {/* Right Part - Add Expense */}
                <TouchableOpacity
                    style={styles.fabButton}
                    onPress={() => setIsAddExpenseModalVisible(true)}
                >
                    <Receipt color="white" size={20} />
                </TouchableOpacity>
            </View>

            <CreateGroupModal
                isVisible={isCreateGroupModalVisible}
                onClose={() => setIsCreateGroupModalVisible(false)}
            />

            <AddExpenseModal
                isVisible={isAddExpenseModalVisible}
                onClose={() => setIsAddExpenseModalVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#8B5CF6', // Vibrant Purple
        borderRadius: 22,
        flexDirection: 'row',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        width: 120,
        height: 44,
        overflow: 'hidden',
        zIndex: 1000, // Ensure it's on top
    },
    fabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabLeft: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.2)',
    },
});

export default GlobalFab;
