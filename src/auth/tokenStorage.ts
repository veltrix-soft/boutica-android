import * as SecureStore from 'expo-secure-store';

const KEY = 'boutica_session_token';

export const getToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);