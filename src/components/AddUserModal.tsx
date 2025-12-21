import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Text } from "@/components/ui/text";
import { fetchNewKnownUsers, validateUserByEmail, KnownUser } from '../util/apiService';
import { X, Search } from 'lucide-react-native';

interface AddUserModalProps {
    visible: boolean;
    onClose: () => void;
    currentUserId?: string;
    groupId: string;
    onAddUser: (user: KnownUser) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ visible, onClose, currentUserId, groupId, onAddUser }) => {
    const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [validating, setValidating] = useState(false);
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<boolean>(false);
    const [foundUser, setFoundUser] = useState<KnownUser | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (visible && currentUserId) {
            loadKnownUsers();
            resetState();
        }
    }, [visible, currentUserId]);

    const resetState = () => {
        setEmail('');
        setValidationMessage(null);
        setValidationError(false);
        setFoundUser(null);
        setShowDropdown(false);
    }

    const loadKnownUsers = async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            const response = await fetchNewKnownUsers(currentUserId, groupId);
            if (response.success && response.data) {
                setKnownUsers(response.data);
            }
        } catch (error) {
            console.error("Failed to load known users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleValidateEmail = async () => {
        if (!email) {
            setValidationMessage("Please enter an email");
            setValidationError(true);
            return;
        }

        setValidating(true);
        setValidationMessage(null);
        setValidationError(false);
        setFoundUser(null);

        try {
            const response = await validateUserByEmail(email);
            if (response.success && response.data) {
                setFoundUser(response.data);
                setValidationMessage("User found: " + response.data.name);
                setValidationError(false);
            } else {
                // Should be caught by catch block if 500, but handling just in case
                setValidationMessage("Invalid User");
                setValidationError(true);
            }
        } catch (error: any) {
            setValidationMessage("Invalid Email, No such user exist");
            setValidationError(true);
        } finally {
            setValidating(false);
        }
    };

    const handleAddUser = () => {
        if (foundUser) {
            onAddUser(foundUser);
            onClose();
        }
    };

    const handleSelectKnownUser = (user: KnownUser) => {
        setFoundUser(user);
        setEmail(user.email);
        setValidationMessage("User selected: " + user.name);
        setValidationError(false);
        setShowDropdown(false);
    }

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View className="flex-row justify-between items-center w-full mb-4">
                        <Text className="text-xl font-bold text-white">Add User to Group</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="white" size={24} />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-400 mb-2">Select from Friends</Text>
                    <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Text className="text-white">{showDropdown ? "Close List" : "Select a friend..."}</Text>
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={styles.dropdownList}>
                            {loading ? (
                                <ActivityIndicator color="#33f584" />
                            ) : knownUsers.length > 0 ? (
                                knownUsers.map(user => (
                                    <TouchableOpacity
                                        key={user.userId}
                                        style={styles.dropdownItem}
                                        onPress={() => handleSelectKnownUser(user)}
                                    >
                                        <Text className="text-white">{user.name} ({user.email})</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text className="text-gray-500 p-2">No friends found</Text>
                            )}
                        </View>
                    )}

                    <Text className="text-gray-400 mt-4 mb-2">Or Add by Email</Text>
                    <View className="flex-row gap-2 mb-2">
                        <TextInput
                            style={styles.input}
                            placeholder="Enter email"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.validateButton}
                            onPress={handleValidateEmail}
                            disabled={validating}
                        >
                            {validating ? <ActivityIndicator color="white" size="small" /> : <Text className="text-black font-bold">Validate</Text>}
                        </TouchableOpacity>
                    </View>

                    {validationMessage && (
                        <Text style={{ color: validationError ? '#f53344' : '#33f584', marginBottom: 10 }}>
                            {validationMessage}
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.addButton, !foundUser && { opacity: 0.5 }]}
                        onPress={handleAddUser}
                        disabled={!foundUser}
                    >
                        <Text className="text-center font-bold text-lg">Add User</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalView: {
        width: '90%',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    dropdownButton: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 8,
        width: '100%',
        marginBottom: 5,
    },
    dropdownList: {
        backgroundColor: '#333',
        borderRadius: 8,
        width: '100%',
        maxHeight: 150,
        overflow: 'hidden', // Should be scrollview if long list, keeping simple for now
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        color: 'white',
        padding: 12,
        borderRadius: 8,
    },
    validateButton: {
        backgroundColor: '#33f584',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    addButton: {
        backgroundColor: '#33f584',
        width: '100%',
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
    }
});

export default AddUserModal;
