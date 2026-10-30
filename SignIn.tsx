import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
import { RootStackParamList } from './App';
import { API_BASE_URL } from './config/api';

// Define user interface
interface User {
    id: number;
    username: string;
    email: string;
}

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

interface Props {
    navigation: SignInScreenNavigationProp;
    onUserLogin: (user: User) => void;
}

export default function SignIn({ navigation, onUserLogin }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = (): boolean => {
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

        return true;
    };

    const handleSignIn = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const loginData = {
                email: email.trim().toLowerCase(),
                password: password,
            };

            const response = await fetch(`${API_BASE_URL}/LoginServlet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginData),
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
                
                if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
                    Alert.alert('Server Error', 'Server returned an error page. Check server logs.');
                } else {
                    Alert.alert('Response Error', 'Invalid response format from server');
                }
                return;
            }

            if (response.ok && response.status >= 200 && response.status < 300) {
                // Successful login
                const user: User = {
                    id: responseData.id,
                    username: responseData.username,
                    email: responseData.email
                };

                Alert.alert(
                    'Welcome Back!',
                    `Hello ${user.username}! Login successful.`,
                    [
                        {
                            text: 'Continue',
                            onPress: () => {
                                clearForm();
                                onUserLogin(user); // Call the callback to update user state
                            },
                        },
                    ]
                );
            } else {
                // Handle different error cases
                let errorMessage = 'Login failed';
                
                if (responseData && responseData.message) {
                    errorMessage = responseData.message;
                } else if (response.status === 401) {
                    errorMessage = 'Invalid email or password';
                } else if (response.status === 404) {
                    errorMessage = 'User not found';
                } else if (response.status === 400) {
                    errorMessage = 'Invalid login data';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later';
                }
                
                Alert.alert('Login Failed', errorMessage);
            }
        } catch (error) {
            console.error('Network/Fetch error:', error);
            
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
        setEmail('');
        setPassword('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const navigateToSignUp = () => {
        navigation.navigate('SignUp');
    };

    const handleForgotPassword = () => {
        Alert.alert(
            'Forgot Password',
            'Password reset functionality will be implemented soon.',
            [{ text: 'OK' }]
        );
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
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue tracking your expenses</Text>

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
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                secureTextEntry={!showPassword}
                                maxLength={100}
                                returnKeyType="done"
                                onSubmitEditing={handleSignIn}
                            />
                            <TouchableOpacity
                                style={styles.passwordToggle}
                                onPress={togglePasswordVisibility}
                            >
                                <Text style={styles.passwordToggleText}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.signInButton, loading && styles.disabledButton]}
                        onPress={handleSignIn}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.signInButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
                        <Text style={styles.clearButtonText}>Clear Form</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
                        <Text style={styles.forgotPasswordText}>
                            Forgot your password?
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.signUpLink} onPress={navigateToSignUp}>
                        <Text style={styles.signUpLinkText}>
                            Don't have an account? Sign up here
                        </Text>
                    </TouchableOpacity>
                </View>
                <StatusBar style="auto" />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    passwordInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
    },
    passwordToggle: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    passwordToggleText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
    signInButton: {
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
    signInButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    clearButton: {
        backgroundColor: '#95a5a6',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        marginBottom: 15,
    },
    clearButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    forgotPasswordLink: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: '#e74c3c',
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#bdc3c7',
    },
    dividerText: {
        marginHorizontal: 15,
        color: '#7f8c8d',
        fontSize: 14,
        fontWeight: '500',
    },
    signUpLink: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    signUpLinkText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});