import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignUp from './SignUp';
import SignIn from './SignIn';
import Home from './Home';
import AddExpense from './AddExpense';
import AllExpenses from './AllExpenses';

// Define user interface
interface User {
  id: number;
  username: string;
  email: string;
}

// Define the navigation types
export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Home: { user: User };
  AddExpense: { user: User };
  AllExpenses: { user: User };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user session on app start
  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('Error checking user session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async (userData: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.log('Error storing user session:', error);
    }
  };

  const handleUserLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.log('Error removing user session:', error);
    }
  };

  // Show loading screen while checking session
  if (isLoading) {
    return null; // You can add a loading screen component here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "SignIn"}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3498db',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerTitleAlign: 'center',
        }}
      >
        {user ? (
          // User is logged in - show main app screens
          <>
            <Stack.Screen
              name="Home"
              options={{
                title: 'MONEYLOG',
                headerShown: false, // Hide header for Home as it has its own header
              }}
            >
              {(props) => (
                <Home
                  {...props}
                  user={user}
                  onLogout={handleUserLogout}
                  onNavigateToAddExpense={() => props.navigation.navigate('AddExpense', { user })}
                  onNavigateToAllExpenses={() => props.navigation.navigate('AllExpenses', { user })}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="AddExpense"
              options={{
                title: 'Add Expense',
                headerShown: true,
              }}
            >
              {(props) => (
                <AddExpense {...props} user={user} />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="AllExpenses"
              options={{
                title: 'All Expenses',
                headerShown: true,
              }}
            >
              {(props) => (
                <AllExpenses {...props} user={user} />
              )}
            </Stack.Screen>
          </>
        ) : (
          // User is not logged in - show auth screens
          <>
            <Stack.Screen
              name="SignIn"
              options={{
                title: 'MONEYLOG',
                headerShown: true,
              }}
            >
              {(props) => (
                <SignIn
                  {...props}
                  onUserLogin={handleUserLogin}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="SignUp"
              options={{
                title: 'MONEYLOG',
                headerShown: true,
              }}
            >
              {(props) => (
                <SignUp {...props} />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}