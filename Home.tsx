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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

interface CategoryTotal {
    categoryName: string;
    total: number;
    count: number;
}

interface DashboardData {
    totalExpenses: number;
    totalTransactions: number;
    recentExpenses: Expense[];
    categoryTotals: CategoryTotal[];
    monthlyTotal: number;
}

interface Props {
    user: User;
    onLogout: () => void;
    onNavigateToAddExpense: () => void;
    onNavigateToAllExpenses: () => void;
}

export default function Home({ user, onLogout, onNavigateToAddExpense, onNavigateToAllExpenses }: Props) {
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        totalExpenses: 0,
        totalTransactions: 0,
        recentExpenses: [],
        categoryTotals: [],
        monthlyTotal: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = async () => {
        try {
            // Add timestamp to prevent caching issues
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_BASE_URL}/DashboardServlet?userId=${user.id}&timestamp=${timestamp}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // Add cache-busting headers
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                },
            });

            console.log('Dashboard Response status:', response.status);

            const responseText = await response.text();
            console.log('Dashboard Raw response:', responseText);

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
                setDashboardData(responseData);
                console.log('Dashboard data updated successfully');
            } else {
                let errorMessage = 'Failed to fetch dashboard data';
                if (responseData && responseData.message) {
                    errorMessage = responseData.message;
                }
                Alert.alert('Error', errorMessage);
            }
        } catch (error) {
            console.error('Network/Fetch error:', error);
            Alert.alert(
                'Connection Error',
                'Unable to fetch dashboard data. Please check your internet connection.'
            );
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        await fetchDashboardData();
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    // Load data when component mounts
    useEffect(() => {
        console.log('Home component mounted, loading dashboard data...');
        loadDashboardData();
    }, [user.id]);

    // Refresh data every time screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('Home screen focused, refreshing dashboard data...');
            fetchDashboardData();
        }, [user.id])
    );

    const formatAmount = (amount: number): string => {
        return `Rs. ${amount.toFixed(2)}`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderRecentExpenseItem = ({ item }: { item: Expense }) => (
        <View style={styles.expenseItem}>
            <View style={styles.expenseHeader}>
                <Text style={styles.expenseDescription} numberOfLines={1}>
                    {item.description || 'No description'}
                </Text>
                <Text style={styles.expenseAmount}>{formatAmount(item.amount)}</Text>
            </View>
            <View style={styles.expenseFooter}>
                <Text style={styles.expenseCategory}>{item.category.name}</Text>
                <Text style={styles.expenseDate}>{formatDate(item.dates)}</Text>
            </View>
        </View>
    );

    const renderCategoryItem = ({ item }: { item: CategoryTotal }) => (
        <View style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{item.categoryName}</Text>
                <Text style={styles.categoryCount}>{item.count} transactions</Text>
            </View>
            <Text style={styles.categoryTotal}>{formatAmount(item.total)}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.usernameText}>{user.username}!</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Total Expenses</Text>
                    <Text style={styles.summaryAmount}>{formatAmount(dashboardData.totalExpenses)}</Text>
                    <Text style={styles.summarySubtext}>{dashboardData.totalTransactions} transactions</Text>
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>This Month</Text>
                    <Text style={styles.summaryAmount}>{formatAmount(dashboardData.monthlyTotal)}</Text>
                    <Text style={styles.summarySubtext}>Current month</Text>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.primaryActionButton} onPress={onNavigateToAddExpense}>
                    <Text style={styles.primaryActionText}>Add Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryActionButton} onPress={onNavigateToAllExpenses}>
                    <Text style={styles.secondaryActionText}>View All Expenses</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Expenses */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Expenses</Text>
                    <TouchableOpacity onPress={onNavigateToAllExpenses}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>
                
                {dashboardData.recentExpenses.length > 0 ? (
                    <FlatList
                        data={dashboardData.recentExpenses}
                        renderItem={renderRecentExpenseItem}
                        keyExtractor={(item) => item.id.toString()}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No expenses yet</Text>
                        <Text style={styles.emptyStateSubtext}>Start by adding your first expense</Text>
                    </View>
                )}
            </View>

            {/* Category Breakdown */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                
                {dashboardData.categoryTotals.length > 0 ? (
                    <FlatList
                        data={dashboardData.categoryTotals}
                        renderItem={renderCategoryItem}
                        keyExtractor={(item, index) => index.toString()}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No category data available</Text>
                    </View>
                )}
            </View>
        </ScrollView>
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
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 30,
        paddingTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 16,
        color: '#ecf0f1',
        opacity: 0.9,
    },
    usernameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 15,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    summaryTitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    summarySubtext: {
        fontSize: 12,
        color: '#95a5a6',
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 15,
    },
    primaryActionButton: {
        flex: 1,
        backgroundColor: '#27ae60',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    primaryActionText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryActionButton: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3498db',
        elevation: 1,
    },
    secondaryActionText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionContainer: {
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 15,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    seeAllText: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: '600',
    },
    expenseItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    expenseDescription: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginRight: 10,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    expenseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseCategory: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: '500',
    },
    expenseDate: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    categoryCount: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    categoryTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#27ae60',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#95a5a6',
    },
});