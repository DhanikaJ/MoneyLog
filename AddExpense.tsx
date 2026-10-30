import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './App';
import { API_BASE_URL } from './config/api';

interface User {
    id: number;
    username: string;
    email: string;
}

interface Category {
    id: number;
    name: string;
}

type AddExpenseScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;

interface Props {
    navigation: AddExpenseScreenNavigationProp;
    user: User;
}

export default function AddExpense({ navigation, user }: Props) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/CategoryServlet`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const responseText = await response.text();
            console.log('Categories response:', responseText);

            if (!responseText || responseText.trim() === '') {
                Alert.alert('Error', 'Failed to load categories');
                return;
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.log('JSON Parse Error:', parseError);
                Alert.alert('Error', 'Invalid response from server');
                return;
            }

            if (response.ok && responseData.success) {
                setCategories(responseData.categories || []);
                // Set first category as default if available
                if (responseData.categories && responseData.categories.length > 0) {
                    setSelectedCategoryId(responseData.categories[0].id);
                }
            } else {
                Alert.alert('Error', responseData.message || 'Failed to load categories');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            Alert.alert('Error', 'Unable to load categories. Please check your connection.');
        } finally {
            setCategoriesLoading(false);
        }
    };

    const validateForm = (): boolean => {
        if (!amount.trim()) {
            Alert.alert('Validation Error', 'Amount is required');
            return false;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid amount greater than 0');
            return false;
        }

        if (numericAmount > 999999.99) {
            Alert.alert('Validation Error', 'Amount cannot exceed Rs. 999,999.99');
            return false;
        }

        if (!selectedCategoryId) {
            Alert.alert('Validation Error', 'Please select a category');
            return false;
        }

        if (description.length > 255) {
            Alert.alert('Validation Error', 'Description cannot exceed 255 characters');
            return false;
        }

        return true;
    };

    const handleAddExpense = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const expenseData = {
                amount: parseFloat(amount),
                categoryId: selectedCategoryId,
                description: description.trim(),
                dates: selectedDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
                userId: user.id,
            };

            console.log('Sending expense data:', expenseData);

            const response = await fetch(`${API_BASE_URL}/ExpenseServlet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(expenseData),
            });

            console.log('Add Expense Response status:', response.status);

            const responseText = await response.text();
            console.log('Add Expense Raw response:', responseText);

            if (!responseText || responseText.trim() === '') {
                Alert.alert('Server Error', 'Server returned empty response');
                return;
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.log('JSON Parse Error:', parseError);
                if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
                    Alert.alert('Server Error', 'Server returned an error page. Check server logs.');
                } else {
                    Alert.alert('Response Error', 'Invalid response format from server');
                }
                return;
            }

            if (response.ok && response.status >= 200 && response.status < 300) {
                Alert.alert(
                    'Success',
                    'Expense added successfully!',
                    [
                        {
                            text: 'Add Another',
                            onPress: () => clearForm(),
                        },
                        {
                            text: 'Go to Home',
                            onPress: () => navigation.navigate('Home', { user }),
                        },
                    ]
                );
            } else {
                let errorMessage = 'Failed to add expense';
                if (responseData && responseData.message) {
                    errorMessage = responseData.message;
                }
                Alert.alert('Error', errorMessage);
            }
        } catch (error) {
            console.error('Network/Fetch error:', error);
            Alert.alert(
                'Connection Error',
                'Unable to add expense. Please check your internet connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setAmount('');
        setDescription('');
        setSelectedDate(new Date());
        if (categories.length > 0) {
            setSelectedCategoryId(categories[0].id);
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString();
    };

    const formatAmount = (text: string): string => {
        // Remove any non-numeric characters except decimal point
        const numericText = text.replace(/[^0-9.]/g, '');
        
        // Ensure only one decimal point
        const parts = numericText.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts[1];
        }
        
        return numericText;
    };

    if (categoriesLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Add New Expense</Text>
                    <Text style={styles.subtitle}>Track your spending</Text>

                    {/* Amount Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Amount (Rs.)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={(text) => setAmount(formatAmount(text))}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            maxLength={10}
                            returnKeyType="next"
                        />
                    </View>

                    {/* Category Picker */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedCategoryId}
                                onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
                                style={styles.picker}
                                dropdownIconColor="#7f8c8d"
                            >
                                <Picker.Item label="Select a category" value={null} />
                                {categories.map((category) => (
                                    <Picker.Item
                                        key={category.id}
                                        label={category.name}
                                        value={category.id}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Enter expense description (optional)"
                            multiline
                            numberOfLines={3}
                            maxLength={255}
                            returnKeyType="done"
                            textAlignVertical="top"
                        />
                        <Text style={styles.characterCount}>
                            {description.length}/255 characters
                        </Text>
                    </View>

                    {/* Date Picker */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Date</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
                            <Text style={styles.dateButtonIcon}>📅</Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={[styles.addButton, loading && styles.disabledButton]}
                        onPress={handleAddExpense}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.addButtonText}>Add Expense</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
                            <Text style={styles.clearButtonText}>Clear Form</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => navigation.navigate('Home', { user })}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Category Management */}
                    <TouchableOpacity
                        style={styles.manageCategoriesButton}
                        onPress={() => Alert.alert('Info', 'Category management will be implemented soon')}
                    >
                        <Text style={styles.manageCategoriesText}>Manage Categories</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#7f8c8d',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingBottom: 40,
    },
    formContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginVertical: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        color: '#7f8c8d',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#34495e',
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#ffffff',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'right',
        marginTop: 4,
    },
    pickerContainer: {
        borderWidth: 1.5,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        backgroundColor: '#ffffff',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    picker: {
        height: 50,
        color: '#2c3e50',
    },
    dateButton: {
        borderWidth: 1.5,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    dateButtonIcon: {
        fontSize: 18,
    },
    addButton: {
        backgroundColor: '#27ae60',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
        elevation: 1,
    },
    addButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    clearButton: {
        flex: 1,
        backgroundColor: '#95a5a6',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#e74c3c',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    manageCategoriesButton: {
        borderWidth: 1,
        borderColor: '#3498db',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    manageCategoriesText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '500',
    },
});