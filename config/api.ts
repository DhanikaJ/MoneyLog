const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/MoneyLog';

export const API_BASE_URL = apiBaseUrl;

export const API_ENDPOINTS = {
  LOGIN: `${apiBaseUrl}/LoginServlet`,
  SIGNUP: `${apiBaseUrl}/UserServlet`,
  DASHBOARD: `${apiBaseUrl}/DashboardServlet`,
  CATEGORIES: `${apiBaseUrl}/CategoryServlet`,
  ADD_EXPENSE: `${apiBaseUrl}/ExpenseServlet`,
  EXPENSE_LIST: `${apiBaseUrl}/ExpenseListServlet`,
  DELETE_EXPENSE: `${apiBaseUrl}/ExpenseServlet`,
  UPDATE_EXPENSE: `${apiBaseUrl}/ExpenseServlet`,
};