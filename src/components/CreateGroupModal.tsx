import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createGroup } from '../util/apiService';
import { useRouter } from 'expo-router';
import { getAuthData } from '../util/authService';

interface CreateGroupModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentUserId?: string;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isVisible, onClose, currentUserId }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleCreate = async () => {
        if (!groupName || groupName.length < 2) {
            setError('Group name must be at least 2 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let userId = currentUserId;
            if (!userId) {
                const auth = await getAuthData();
                userId = auth.userId;
            }

            if (!userId) {
                setError('User not authenticated');
                setLoading(false);
                return;
            }

            const response = await createGroup({
                createdBy: userId,
                groupName,
                groupDescription
            });

            if (response.success && response.data) {
                // Navigate to the new group
                // Reset form
                setGroupName('');
                setGroupDescription('');
                onClose();

                // Assuming response.data is the groupId (UUID)
                // We might need to fetch the group details first or just pass the ID if the screen loads it.
                // The GroupDetailsPage expects 'groupId' param.
                router.push({ pathname: "/group/[groupId]", params: { groupId: response.data, currentUserId: userId } });
            } else {
                setError(response.message || 'Failed to create group');
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.centeredView}
            >
                <View style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalText}>Create New Group</Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <Text style={styles.label}>Group Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter group name"
                            placeholderTextColor="#9ca3af"
                            value={groupName}
                            onChangeText={setGroupName}
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter description (optional)"
                            placeholderTextColor="#9ca3af"
                            value={groupDescription}
                            onChangeText={setGroupDescription}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonClose]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={styles.textStyle}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCreate]}
                                onPress={handleCreate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.textStyle}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#212121',
        borderRadius: 20,
        padding: 35,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginTop: 20,
        gap: 10,
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 80,
        alignItems: 'center',
    },
    buttonClose: {
        backgroundColor: '#ef4444',
    },
    buttonCreate: {
        backgroundColor: '#33f584',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        alignSelf: 'center',
    },
    label: {
        color: '#9ca3af',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        height: 40,
        width: '100%',
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        color: 'white',
    },
    errorText: {
        color: '#ef4444',
        marginBottom: 10,
        alignSelf: 'center',
    },
});

export default CreateGroupModal;
