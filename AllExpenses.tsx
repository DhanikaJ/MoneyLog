import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    FlatList,
    TextInput,
    Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
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

interface Expense {
    id: number;
    amount: number;
    description: string;
    dates: string;
    createdAt: string;
    updatedAt: string;
    category: Category;
}

type AllExpensesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AllExpenses'>;

interface Props {
    navigation: AllExpensesScreenNavigationProp;
    user: User;
}

export default function AllExpenses({ navigation, user }: Props) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filter states
    const [searchText, setSearchText] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Delete confirmation
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchExpenses(), fetchCategories()]);
        } catch (error) {
            console.error('Error in loadAllData:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        applyFiltersAndSort();
    }, [expenses, searchText, selectedCategoryFilter, sortBy, sortOrder]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('AllExpenses screen focused, refreshing data...');
            fetchExpenses();
        }, [])
    );

    const fetchExpenses = async () => {
        try {
            console.log('Starting fetchExpenses for user:', user.id);
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_BASE_URL}/ExpenseListServlet?userId=${user.id}&timestamp=${timestamp}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // Add cache-busting headers
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                },
            });

            const responseText = await response.text();
            console.log('Expenses response:', responseText);

            if (!responseText || responseText.trim() === '') {
                console.log('Empty response received');
                Alert.alert('Error', 'Server returned empty response');
                return;
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('Parsed response data:', responseData);
            } catch (parseError) {
                console.log('JSON Parse Error:', parseError);
                console.log('Response was:', responseText);
                Alert.alert('Error', 'Invalid response format from server');
                return;
            }

            if (response.ok && responseData.success) {
                console.log('Successfully fetched expenses:', responseData.expenses);
                setExpenses(responseData.expenses || []);
            } else {
                console.log('Server returned error:', responseData.message);
                Alert.alert('Error', responseData.message || 'Failed to fetch expenses');
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            Alert.alert('Error', 'Unable to fetch expenses. Please check your connection.');
        }
    };

    const fetchCategories = async () => {
        try {
            console.log('Fetching categories...');
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_BASE_URL}/CategoryServlet?timestamp=${timestamp}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                },
            });

            const responseText = await response.text();
            console.log('Categories response text:', responseText);
            if (responseText) {
                const responseData = JSON.parse(responseText);
                console.log('Categories parsed data:', responseData);
                if (response.ok && responseData.success) {
                    setCategories(responseData.categories || []);
                    console.log('Categories set successfully');
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchExpenses();
        setRefreshing(false);
    };

    const applyFiltersAndSort = () => {
        let filtered = [...expenses];

        // Apply search filter
        if (searchText.trim()) {
            filtered = filtered.filter(expense =>
                expense.description.toLowerCase().includes(searchText.toLowerCase()) ||
                expense.category.name.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategoryFilter) {
            filtered = filtered.filter(expense => expense.category.id === selectedCategoryFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.dates).getTime() - new Date(b.dates).getTime();
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'category':
                    comparison = a.category.name.localeCompare(b.category.name);
                    break;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        setFilteredExpenses(filtered);
    };

    const handleDeleteExpense = async (expense: Expense) => {
        setExpenseToDelete(expense);
        Alert.alert(
            'Delete Expense',
            `Are you sure you want to delete "${expense.description || 'this expense'}"?`,  
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => confirmDelete(expense)
                }
            ]
        );
    };

    const confirmDelete = async (expense: Expense) => {
        setDeleteLoading(true);
        try {
            console.log('Attempting to delete expense:', expense.id);
            const response = await fetch(`${API_BASE_URL}/ExpenseServlet?expenseId=${expense.id}&userId=${user.id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const responseText = await response.text();
            console.log('Delete response:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.log('Delete response parse error:', parseError);
                Alert.alert('Error', 'Invalid response from server');
                return;
            }

            if (response.ok && responseData.success) {
                console.log('Delete successful, refreshing data...');
                Alert.alert('Success', 'Expense deleted successfully');
                
                // CRITICAL: Wait a moment then refresh data from server
                setTimeout(() => {
                    fetchExpenses();
                }, 500);
                
            } else {
                console.log('Delete failed:', responseData.message);
                Alert.alert('Error', responseData.message || 'Failed to delete expense');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            Alert.alert('Error', 'Unable to delete expense. Please try again.');
        } finally {
            setDeleteLoading(false);
            setExpenseToDelete(null);
        }
    };

    const clearFilters = () => {
        setSearchText('');
        setSelectedCategoryFilter(null);
        setSortBy('date');
        setSortOrder('desc');
    };

    const formatAmount = (amount: number): string => {
        return `Rs. ${amount.toFixed(2)}`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getTotalAmount = (): number => {
        return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
    };

    const renderExpenseItem = ({ item }: { item: Expense }) => (
        <View style={styles.expenseItem}>
            <View style={styles.expenseHeader}>
                <Text style={styles.expenseDescription} numberOfLines={2}>
                    {item.description || 'No description'}
                </Text>
                <Text style={styles.expenseAmount}>{formatAmount(item.amount)}</Text>
            </View>
            <View style={styles.expenseFooter}>
                <View style={styles.expenseInfo}>
                    <Text style={styles.expenseCategory}>{item.category.name}</Text>
                    <Text style={styles.expenseDate}>{formatDate(item.dates)}</Text>
                </View>
                <View style={styles.expenseActions}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => Alert.alert('Info', 'Edit functionality coming soon')}
                    >
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, deleteLoading && styles.deleteButtonDisabled]}
                        onPress={() => handleDeleteExpense(item)}
                        disabled={deleteLoading}
                    >
                        <Text style={styles.deleteButtonText}>
                            {deleteLoading && expenseToDelete?.id === item.id ? 'Deleting...' : 'Delete'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading expenses...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with filters */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>All Expenses</Text>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Search Bar */}
                <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search expenses..."
                    clearButtonMode="while-editing"
                />

                {/* Summary */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryText}>
                        Showing {filteredExpenses.length} of {expenses.length} expenses
                    </Text>
                    <Text style={styles.totalText}>Total: {formatAmount(getTotalAmount())}</Text>
                </View>
            </View>

            {/* Expense List */}
            <FlatList
                data={filteredExpenses}
                renderItem={renderExpenseItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No expenses found</Text>
                        <Text style={styles.emptyStateSubtext}>
                            {expenses.length === 0 
                                ? "Start by adding your first expense" 
                                : "Try adjusting your search or filters"
                            }
                        </Text>
                        <TouchableOpacity
                            style={styles.addExpenseButton}
                            onPress={() => navigation.navigate('AddExpense', { user })}
                        >
                            <Text style={styles.addExpenseButtonText}>Add Expense</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Filter Modal */}
            <Modal visible={showFilterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Filter & Sort</Text>

                        {/* Category Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Filter by Category</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedCategoryFilter}
                                    onValueChange={setSelectedCategoryFilter}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="All Categories" value={null} />
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

                        {/* Sort Options */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Sort by</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={sortBy}
                                    onValueChange={setSortBy}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Date" value="date" />
                                    <Picker.Item label="Amount" value="amount" />
                                    <Picker.Item label="Category" value="category" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Order</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={sortOrder}
                                    onValueChange={setSortOrder}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Newest First" value="desc" />
                                    <Picker.Item label="Oldest First" value="asc" />
                                </Picker>
                            </View>
                        </View>

                        {/* Modal Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                                <Text style={styles.clearFiltersText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyFiltersButton}
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text style={styles.applyFiltersText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Floating Add Button */}
            <TouchableOpacity
                style={styles.floatingAddButton}
                onPress={() => navigation.navigate('AddExpense', { user })}
            >
                <Text style={styles.floatingAddButtonText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    filterButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    filterButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
        marginBottom: 15,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    totalText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#27ae60',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    expenseItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    expenseDescription: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginRight: 10,
    },
    expenseAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    expenseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseInfo: {
        flex: 1,
    },
    expenseCategory: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: '500',
        marginBottom: 2,
    },
    expenseDate: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    expenseActions: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        backgroundColor: '#f39c12',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    editButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    deleteButtonDisabled: {
        backgroundColor: '#95a5a6',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
        marginBottom: 20,
    },
    addExpenseButton: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addExpenseButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    floatingAddButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#27ae60',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    floatingAddButtonText: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 25,
        margin: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 20,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    picker: {
        height: 50,
        color: '#2c3e50',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    clearFiltersButton: {
        flex: 1,
        backgroundColor: '#95a5a6',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    clearFiltersText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    applyFiltersButton: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    applyFiltersText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});