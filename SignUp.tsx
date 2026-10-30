import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,} from 'react-native';
import { RootStackParamList } from './App';
import { API_BASE_URL } from './config/api';

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

interface Props {
    navigation: SignUpScreenNavigationProp;
}

export default function SignUp({ navigation }: Props) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = (): boolean => {
        if (!username.trim()) {
            Alert.alert('Validation Error', 'Username is required');
            return false;
        }

        if (username.length < 3) {
            Alert.alert('Validation Error', 'Username must be at least 3 characters long');
            return false;
        }

        if (!email.trim()) {
            Alert.alert('Validation Error', 'Email is required');
            return false;
        }

        if (!validateEmail(email)) {
            Alert.alert('Validation Error', 'Please enter a valid email address');
            return false;
        }

        if (!password) {
            Alert.alert('Validation Error', 'Password is required');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Validation Error', 'Password must be at least 6 characters long');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Validation Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSignup = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const signupData = {
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password: password,
            };

            const response = await fetch(`${API_BASE_URL}/UserServlet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(signupData),
            });


            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers.get('content-type'));

            // Get response text first
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            // Check if response is empty
            if (!responseText || responseText.trim() === '') {
                Alert.alert('Server Error', 'Server returned empty response');
                return;
            }

            // Try to parse JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.log('JSON Parse Error:', parseError);
                console.log('Response was:', responseText);
                
                // Check if it's an HTML error page
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
                    'Account created successfully! You can now login.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                clearForm();
                            },
                        },
                    ]
                );
            } else {
                // Handle different error cases
                let errorMessage = 'An error occurred during signup';
                
                if (responseData && responseData.message) {
                    errorMessage = responseData.message;
                } else if (response.status === 409) {
                    errorMessage = 'Username or email already exists';
                } else if (response.status === 400) {
                    errorMessage = 'Invalid input data';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later';
                }
                
                Alert.alert('Signup Failed', errorMessage);
            }
        } catch (error) {
            console.error('Network/Fetch error:', error);
            
            // Check if it's a network connectivity issue
            if (error instanceof TypeError && error.message.includes('Network request failed')) {
                Alert.alert(
                    'Connection Error', 
                    'Unable to reach the server. Please check your internet connection and try again.'
                );
            } else if (error instanceof SyntaxError && error.message.includes('JSON Parse error')) {
                Alert.alert(
                    'Server Response Error', 
                    'The server returned an invalid response. This may be a server configuration issue.'
                );
            } else {
                Alert.alert(
                    'Unexpected Error', 
                    'An unexpected error occurred. Please try again or contact support if the problem persists.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

     const navigateToSignIn = () => {
        navigation.navigate('SignIn');
    };

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
                bounces={false}
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to start tracking your expenses</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter your username"
                            autoCapitalize="none"
                            maxLength={100}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            maxLength={100}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            secureTextEntry
                            maxLength={100}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm your password"
                            secureTextEntry
                            maxLength={100}
                            returnKeyType="done"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.signupButton, loading && styles.disabledButton]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.signupButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
                        <Text style={styles.clearButtonText}>Clear Form</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginLink} onPress={navigateToSignIn}>
                        <Text style={styles.loginLinkText}>
                            Already have an account? Login here
                        </Text>
                    </TouchableOpacity>
                </View>
                <StatusBar style="auto" />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    keyboardContainer: {
        flex: 1,
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
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 35,
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
    signupButton: {
        backgroundColor: '#3498db',
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
    signupButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    clearButton: {
        backgroundColor: '#95a5a6',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        marginBottom: 25,
    },
    clearButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    loginLinkText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});